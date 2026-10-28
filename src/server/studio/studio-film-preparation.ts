/**
 * SERVER_ONLY — film storyboard and scene preparation.
 * Free writes only. No providers, no credit reservation, no master-image updates.
 */

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  characterIdsFromLibraryAssets,
  normalizeFilmRequestKey,
  rejectedFilmCharacterIds,
  uniqueSceneCharacterIds,
} from "@/lib/studio-film-characters";
import { decideLink, decideStoryboardCreate, mergeSceneSubtitleLine } from "@/lib/studio-project-linking";
import { parseSubtitleEntriesJson } from "@/lib/studio-subtitle-track";
import { getCreativeProjectForOwner } from "@/server/studio-library/creative-project-service";
import { upsertLibraryAsset } from "@/server/studio-library/library-asset-service";
import { setPreferredStudioSceneImage } from "@/server/studio/studio-scene-image-service";
import {
  createStudioScene,
  reorderStudioScenes,
  updateStudioScene,
  updateStudioStoryboard,
} from "@/server/studio/studio-storyboard-service";
import type { SessionUser } from "@/server/auth/session";

type ServiceError = { code: string; message: string; httpStatus: number };

function fail(code: string, message: string, httpStatus: number): { error: ServiceError } {
  return { error: { code, message, httpStatus } };
}

async function ownedFilm(ownerId: string, projectId: string) {
  const project = await getCreativeProjectForOwner(projectId, ownerId);
  if (!project) return fail("not_found", "Not found.", 404);
  return { project };
}

async function linkedStoryboard(ownerId: string, projectId: string) {
  const film = await ownedFilm(ownerId, projectId);
  if ("error" in film) return film;
  if (!film.project.storyboardId) {
    return fail("storyboard_required", "This film has no storyboard yet.", 409);
  }
  const storyboard = await prisma.studioStoryboard.findFirst({
    where: { id: film.project.storyboardId, ownerId },
    select: { id: true },
  });
  if (!storyboard) return fail("not_found", "Not found.", 404);
  return { project: film.project, storyboardId: storyboard.id };
}

/**
 * Explicit film creation. General creative-project creation does not call this.
 * A repeated idempotency key reuses the same owned film and its storyboard.
 * Projects that were not created here are not updated.
 */
export async function createOwnedFilmProject(input: {
  ownerId: string;
  title: string;
  description?: string;
  idempotencyKey?: unknown;
}) {
  const title = input.title.trim().slice(0, 160);
  if (!title) return fail("validation", "title is required.", 400);
  const description = (input.description ?? "").trim().slice(0, 4000);
  const requestKey = normalizeFilmRequestKey(input.idempotencyKey);

  if (requestKey) {
    const existing = await findOwnedFilmByRequestKey(input.ownerId, requestKey);
    if (existing) {
      if (existing.storyboardId) {
        return {
          projectId: existing.id,
          storyboardId: existing.storyboardId,
          title: existing.title,
          created: false,
        };
      }
      const linked = await createFilmStoryboard(input.ownerId, existing.id);
      if ("error" in linked) return linked;
      return {
        projectId: existing.id,
        storyboardId: linked.storyboardId,
        title: existing.title,
        created: false,
      };
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    if (requestKey) {
      // Database lock shared by every app instance. Not an in-memory lock.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`film:${input.ownerId}:${requestKey}`}, 0))`;
      const raced = await findOwnedFilmByRequestKey(input.ownerId, requestKey, tx);
      if (raced) {
        return {
          projectId: raced.id,
          storyboardId: raced.storyboardId,
          title: raced.title,
          created: false as const,
        };
      }
    }
    const project = await tx.studioCreativeProject.create({
      data: {
        ownerId: input.ownerId,
        title,
        description,
        status: "active",
        lastOpenedAt: new Date(),
        metadataJson: {
          projectKind: "film",
          ...(requestKey ? { filmRequestKey: requestKey } : {}),
        },
      },
    });
    const storyboard = await tx.studioStoryboard.create({
      data: {
        ownerId: input.ownerId,
        title,
        description,
      },
    });
    await tx.studioCreativeProject.update({
      where: { id: project.id },
      data: { storyboardId: storyboard.id },
    });
    return {
      projectId: project.id,
      storyboardId: storyboard.id,
      title: project.title,
      created: true as const,
    };
  });

  if (created.storyboardId) return created;
  const linked = await createFilmStoryboard(input.ownerId, created.projectId);
  if ("error" in linked) return linked;
  if (!linked.storyboardId) {
    return fail("storyboard_required", "This film has no storyboard yet.", 409);
  }
  return {
    projectId: created.projectId,
    storyboardId: linked.storyboardId,
    title: created.title,
    created: false,
  };
}

async function findOwnedFilmByRequestKey(
  ownerId: string,
  requestKey: string,
  tx: PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0] = prisma,
) {
  return tx.studioCreativeProject.findFirst({
    where: {
      ownerId,
      AND: [
        { metadataJson: { path: ["projectKind"], equals: "film" } },
        { metadataJson: { path: ["filmRequestKey"], equals: requestKey } },
      ],
    },
    select: { id: true, title: true, storyboardId: true },
  });
}

export async function createFilmStoryboard(ownerId: string, projectId: string) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.studioCreativeProject.findFirst({
      where: { id: projectId, ownerId },
    });
    if (!project) return fail("not_found", "Not found.", 404);
    if (decideStoryboardCreate(project.storyboardId) === "reuse") {
      return { storyboardId: project.storyboardId, created: false };
    }
    const storyboard = await tx.studioStoryboard.create({
      data: {
        ownerId,
        title: project.title.slice(0, 160) || "Storyboard",
        description: project.description.slice(0, 4000),
      },
    });
    const updated = await tx.studioCreativeProject.updateMany({
      where: { id: project.id, ownerId, storyboardId: null },
      data: { storyboardId: storyboard.id },
    });
    if (updated.count !== 1) {
      await tx.studioStoryboard.delete({ where: { id: storyboard.id } });
      const current = await tx.studioCreativeProject.findFirst({
        where: { id: project.id, ownerId },
        select: { storyboardId: true },
      });
      return { storyboardId: current?.storyboardId ?? null, created: false };
    }
    return { storyboardId: storyboard.id, created: true };
  });
}

export async function listOwnedStoryboardOptions(ownerId: string) {
  const boards = await prisma.studioStoryboard.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: {
      id: true,
      title: true,
      createdAt: true,
      _count: { select: { scenes: true } },
    },
  });
  const links = await prisma.studioCreativeProject.findMany({
    where: { ownerId, storyboardId: { in: boards.map((board) => board.id) } },
    select: { id: true, title: true, storyboardId: true },
  });
  return boards.map((board) => {
    const film = links.find((link) => link.storyboardId === board.id);
    return {
      id: board.id,
      title: board.title,
      createdAt: board.createdAt.toISOString(),
      sceneCount: board._count.scenes,
      linkedFilmId: film?.id ?? null,
      linkedFilmTitle: film?.title ?? null,
    };
  });
}

export async function attachFilmStoryboard(input: {
  ownerId: string;
  projectId: string;
  storyboardId: string;
  confirmed: boolean;
}) {
  const project = await prisma.studioCreativeProject.findFirst({
    where: { id: input.projectId, ownerId: input.ownerId },
  });
  if (!project) return fail("not_found", "Not found.", 404);
  const storyboard = await prisma.studioStoryboard.findFirst({
    where: { id: input.storyboardId, ownerId: input.ownerId },
    select: { id: true },
  });
  const other = storyboard
    ? await prisma.studioCreativeProject.findFirst({
        where: { storyboardId: storyboard.id, NOT: { id: project.id } },
        select: { id: true, title: true },
      })
    : null;
  const decision = decideLink({
    currentId: project.storyboardId,
    targetId: input.storyboardId,
    targetOwned: Boolean(storyboard),
    otherFilmId: other?.id ?? null,
    confirmed: input.confirmed,
  });
  if (!decision.ok) {
    const status = decision.code === "confirmation_required" ? 400 : decision.code === "not_found" ? 404 : 409;
    return fail(decision.code, decision.code, status);
  }
  if (decision.kind === "already_linked") return { storyboardId: storyboard!.id, attached: false };
  const updated = await prisma.studioCreativeProject.updateMany({
    where: { id: project.id, ownerId: input.ownerId, storyboardId: null },
    data: { storyboardId: storyboard!.id },
  });
  if (updated.count !== 1) {
    const current = await prisma.studioCreativeProject.findFirst({
      where: { id: project.id, ownerId: input.ownerId },
      select: { storyboardId: true },
    });
    if (current?.storyboardId === storyboard!.id) return { storyboardId: storyboard!.id, attached: false };
    return fail("already_linked_other", "This film already has a storyboard.", 409);
  }
  return { storyboardId: storyboard!.id, attached: true };
}

export async function listOwnedAnimationOptions(ownerId: string) {
  const projects = await prisma.animationProject.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: { id: true, title: true, createdAt: true, status: true },
  });
  const links = await prisma.studioCreativeProject.findMany({
    where: { ownerId, animationProjectId: { in: projects.map((item) => item.id) } },
    select: { id: true, title: true, animationProjectId: true },
  });
  return projects.map((item) => {
    const film = links.find((link) => link.animationProjectId === item.id);
    return {
      id: item.id,
      title: item.title || "Video",
      createdAt: item.createdAt.toISOString(),
      status: item.status,
      linkedFilmId: film?.id ?? null,
      linkedFilmTitle: film?.title ?? null,
    };
  });
}

export async function attachFilmAnimation(input: {
  ownerId: string;
  projectId: string;
  animationProjectId: string;
  confirmed: boolean;
}) {
  const project = await prisma.studioCreativeProject.findFirst({
    where: { id: input.projectId, ownerId: input.ownerId },
  });
  if (!project) return fail("not_found", "Not found.", 404);
  const animation = await prisma.animationProject.findFirst({
    where: { id: input.animationProjectId, ownerId: input.ownerId },
    select: { id: true },
  });
  const other = animation
    ? await prisma.studioCreativeProject.findFirst({
        where: { animationProjectId: animation.id, NOT: { id: project.id } },
        select: { id: true, title: true },
      })
    : null;
  const decision = decideLink({
    currentId: project.animationProjectId,
    targetId: input.animationProjectId,
    targetOwned: Boolean(animation),
    otherFilmId: other?.id ?? null,
    confirmed: input.confirmed,
  });
  if (!decision.ok) {
    const status = decision.code === "confirmation_required" ? 400 : decision.code === "not_found" ? 404 : 409;
    return fail(decision.code, decision.code, status);
  }
  if (decision.kind === "already_linked") return { animationProjectId: animation!.id, attached: false };
  const updated = await prisma.studioCreativeProject.updateMany({
    where: { id: project.id, ownerId: input.ownerId, animationProjectId: null },
    data: { animationProjectId: animation!.id },
  });
  if (updated.count !== 1) return fail("already_linked_other", "This film already has a video project.", 409);
  return { animationProjectId: animation!.id, attached: true };
}

async function resolveFilmCharacterIds(ownerId: string, projectId: string): Promise<Set<string> | null> {
  const project = await prisma.studioCreativeProject.findFirst({
    where: { id: projectId, ownerId },
    select: { id: true, storyboardId: true },
  });
  if (!project) return null;

  const assets = await prisma.studioLibraryAsset.findMany({
    where: { projectId: project.id, ownerId, family: "character", status: { not: "deleted" } },
    select: { family: true, metadataJson: true },
    take: 200,
  });
  const ids = new Set(characterIdsFromLibraryAssets(assets));

  if (project.storyboardId) {
    const assigned = await prisma.studioSceneCharacter.findMany({
      where: {
        scene: { storyboard: { id: project.storyboardId, ownerId } },
        character: { ownerId },
      },
      select: { characterId: true },
      take: 400,
    });
    for (const link of assigned) ids.add(link.characterId);
  }
  return ids;
}

export async function listOwnedFilmCharacters(ownerId: string, projectId: string) {
  const ids = await resolveFilmCharacterIds(ownerId, projectId);
  if (!ids || ids.size === 0) return [];
  return prisma.studioCharacter.findMany({
    where: { ownerId, id: { in: [...ids] } },
    orderBy: { name: "asc" },
    take: 100,
    select: { id: true, name: true, referenceImageUrl: true },
  });
}

export async function attachOwnedCharacterToFilm(ownerId: string, projectId: string, characterId: string) {
  const project = await prisma.studioCreativeProject.findFirst({
    where: { id: projectId, ownerId },
    select: { id: true },
  });
  if (!project) return fail("not_found", "Not found.", 404);
  const character = await prisma.studioCharacter.findFirst({
    where: { id: characterId, ownerId },
    select: { id: true, name: true, referenceImageUrl: true },
  });
  if (!character) return fail("not_found", "Not found.", 404);
  await upsertLibraryAsset({
    ownerId,
    projectId,
    family: "character",
    title: character.name,
    previewUrl: character.referenceImageUrl ?? "",
    sourceKind: "studio_character_link",
    sourceId: `${projectId}:${character.id}`,
    metadata: { characterId: character.id },
  });
  return { character };
}

export async function createFilmScene(
  ownerId: string,
  projectId: string,
  viewer: Pick<SessionUser, "id" | "role">,
  title: string,
) {
  const linked = await linkedStoryboard(ownerId, projectId);
  if ("error" in linked) return linked;
  return createStudioScene(linked.storyboardId, viewer, { title });
}

export async function updateFilmScene(
  ownerId: string,
  projectId: string,
  sceneId: string,
  viewer: Pick<SessionUser, "id" | "role">,
  raw: { title?: string; description?: string; action?: string; emotion?: string; characterIds?: string[]; dialogueText?: string | null },
) {
  const linked = await linkedStoryboard(ownerId, projectId);
  if ("error" in linked) return linked;
  const characterIds = raw.characterIds ? uniqueSceneCharacterIds(raw.characterIds) : undefined;
  if (characterIds) {
    const allowed = await resolveFilmCharacterIds(ownerId, projectId);
    if (!allowed) return fail("not_found", "Not found.", 404);
    const outside = rejectedFilmCharacterIds(characterIds, allowed);
    if (outside.length > 0) {
      return fail(
        "character_not_in_film",
        "A character must belong to this film before it can be assigned to a scene.",
        400,
      );
    }
  }
  return updateStudioScene(linked.storyboardId, sceneId, viewer, { ...raw, characterIds });
}

export async function reorderFilmScenes(
  ownerId: string,
  projectId: string,
  viewer: Pick<SessionUser, "id" | "role">,
  sceneIds: string[],
) {
  const linked = await linkedStoryboard(ownerId, projectId);
  if ("error" in linked) return linked;
  return reorderStudioScenes(linked.storyboardId, viewer, sceneIds);
}

export async function saveFilmNarrator(ownerId: string, projectId: string, viewer: Pick<SessionUser, "id" | "role">, text: string) {
  const linked = await linkedStoryboard(ownerId, projectId);
  if ("error" in linked) return linked;
  return updateStudioStoryboard(linked.storyboardId, viewer, { voiceNarrationScript: text });
}

export async function saveFilmSceneSubtitle(ownerId: string, projectId: string, sceneId: string, text: string) {
  const linked = await linkedStoryboard(ownerId, projectId);
  if ("error" in linked) return linked;
  const scene = await prisma.studioScene.findFirst({
    where: { id: sceneId, storyboardId: linked.storyboardId },
    select: { id: true, order: true },
  });
  if (!scene) return fail("not_found", "Scene not found.", 404);
  const track = await prisma.studioStoryboardSubtitleTrack.findUnique({
    where: { storyboardId_language: { storyboardId: linked.storyboardId, language: "nl" } },
  });
  const next = mergeSceneSubtitleLine(parseSubtitleEntriesJson(track?.entriesJson), scene, text).slice(0, 200);
  await prisma.studioStoryboardSubtitleTrack.upsert({
    where: { storyboardId_language: { storyboardId: linked.storyboardId, language: "nl" } },
    create: {
      storyboardId: linked.storyboardId,
      language: "nl",
      status: "draft",
      entriesJson: next,
    },
    update: { entriesJson: next, status: "draft" },
  });
  return { sceneId: scene.id, subtitleText: text.trim() };
}

export async function selectFilmSceneImage(
  ownerId: string,
  projectId: string,
  sceneId: string,
  imageId: string,
  viewer: Pick<SessionUser, "id" | "role">,
) {
  const linked = await linkedStoryboard(ownerId, projectId);
  if ("error" in linked) return linked;
  return setPreferredStudioSceneImage(linked.storyboardId, sceneId, imageId, viewer);
}

export async function findFilmForStoryboard(ownerId: string, storyboardId: string) {
  const storyboard = await prisma.studioStoryboard.findFirst({
    where: { id: storyboardId, ownerId },
    select: { id: true },
  });
  if (!storyboard) return null;
  return prisma.studioCreativeProject.findFirst({
    where: { ownerId, storyboardId },
    select: { id: true, title: true },
  });
}
