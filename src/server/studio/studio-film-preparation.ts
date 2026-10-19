/**
 * SERVER_ONLY — film storyboard and scene preparation.
 * Free writes only. No providers, no credit reservation, no master-image updates.
 */

import { prisma } from "@/lib/prisma";
import { decideLink, decideStoryboardCreate, mergeSceneSubtitleLine } from "@/lib/studio-project-linking";
import { parseSubtitleEntriesJson } from "@/lib/studio-subtitle-track";
import { getCreativeProjectForOwner } from "@/server/studio-library/creative-project-service";
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

export async function listOwnedFilmCharacters(ownerId: string) {
  return prisma.studioCharacter.findMany({
    where: { ownerId },
    orderBy: { name: "asc" },
    take: 100,
    select: { id: true, name: true, referenceImageUrl: true },
  });
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
  return updateStudioScene(linked.storyboardId, sceneId, viewer, raw);
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
