/**
 * SERVER_ONLY — V23 assistant actions over the existing film, timeline,
 * quote, library, and character services. No provider start calls.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { parseStudioV23Request, type StudioV23Request } from "@/lib/studio-v23-actions";
import {
  executeStudioV23Action,
  type StudioV23Actor,
  type StudioV23Deps,
  type StudioV23Outcome,
  type StudioV23Success,
} from "@/lib/studio-v23-action-runner";
import type { SessionUser } from "@/server/auth/session";
import { getLibraryAssetForOwner } from "@/server/studio-library/library-asset-service";
import { getCreativeProjectForOwner } from "@/server/studio-library/creative-project-service";
import { updateStudioCharacter } from "@/server/studio/studio-character-service";
import {
  createFilmScene,
  createOwnedFilmProject,
  listOwnedFilmCharacters,
  reorderFilmScenes,
  updateFilmScene,
} from "@/server/studio/studio-film-preparation";
import { quoteFilmSceneDialogue, quoteFilmSceneVideo } from "@/server/studio/studio-film-live-generation";
import { applyReverseStoryOrder } from "@/server/studio/studio-film-timeline-arrange";
import { getFilmTimeline, setTimelineTrack } from "@/server/studio/studio-timeline-service";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function actorFrom(user: Pick<SessionUser, "id" | "email" | "role">): StudioV23Actor {
  return { id: user.id, email: user.email, role: user.role };
}

async function readIdempotency(ownerId: string, projectId: string, key: string): Promise<StudioV23Success | null> {
  const project = await prisma.studioCreativeProject.findFirst({
    where: { id: projectId, ownerId },
    select: { metadataJson: true },
  });
  if (!project) return null;
  const bag = asRecord(asRecord(project.metadataJson).v23Idempotency);
  const stored = asRecord(bag[key]).outcome;
  if (!stored || typeof stored !== "object") return null;
  const outcome = stored as StudioV23Success;
  return outcome.ok === true ? outcome : null;
}

async function saveIdempotency(ownerId: string, projectId: string, key: string, value: StudioV23Success) {
  const project = await prisma.studioCreativeProject.findFirst({
    where: { id: projectId, ownerId },
    select: { metadataJson: true },
  });
  if (!project) return;
  const meta = asRecord(project.metadataJson);
  const bag = asRecord(meta.v23Idempotency);
  const entries = Object.entries(bag).slice(-29);
  const next = Object.fromEntries(entries);
  next[key] = { at: new Date().toISOString(), outcome: value };
  await prisma.studioCreativeProject.update({
    where: { id: projectId },
    data: { metadataJson: { ...meta, v23Idempotency: next } as Prisma.InputJsonValue },
  });
}

function defaultDeps(): StudioV23Deps {
  return {
    createFilm: (input) =>
      createOwnedFilmProject({
        ownerId: input.ownerId,
        title: input.title,
        description: input.description,
        idempotencyKey: input.idempotencyKey,
      }),
    createScene: (ownerId, projectId, actor, title) => createFilmScene(ownerId, projectId, actor, title),
    updateScene: (ownerId, projectId, sceneId, actor, patch) =>
      updateFilmScene(ownerId, projectId, sceneId, actor, patch),
    reorderScenes: (ownerId, projectId, actor, sceneIds) => reorderFilmScenes(ownerId, projectId, actor, sceneIds),
    quoteVideo: (input) => quoteFilmSceneVideo(input),
    quoteDialogue: (input) => quoteFilmSceneDialogue(input),
    getTimeline: async (ownerId, projectId) => {
      const timeline = await getFilmTimeline(ownerId, projectId);
      if ("error" in timeline) return timeline;
      return {
        timeline: timeline.timeline
          ? {
              revision: timeline.timeline.revision,
              tracks: timeline.timeline.tracks.map((track) => ({ id: track.id, type: track.type })),
            }
          : null,
      };
    },
    setTrackVolume: (input) => setTimelineTrack(input),
    reverseStory: (ownerId, projectId) => applyReverseStoryOrder(ownerId, projectId),
    updateCharacterReference: (characterId, actor, reference) => updateStudioCharacter(characterId, actor, reference),
    getAsset: async (assetId, ownerId) => {
      const asset = await getLibraryAssetForOwner(assetId, ownerId);
      if (!asset) return null;
      return {
        id: asset.id,
        family: asset.family,
        previewUrl: asset.previewUrl,
        storageKey: asset.storageKey,
      };
    },
    getProject: async (ownerId, projectId) => {
      const project = await getCreativeProjectForOwner(projectId, ownerId);
      return project ? { id: project.id, title: project.title } : null;
    },
    sceneInProject: async (ownerId, projectId, sceneId) => {
      const project = await getCreativeProjectForOwner(projectId, ownerId);
      if (!project?.storyboardId) return null;
      const scene = await prisma.studioScene.findFirst({
        where: { id: sceneId, storyboardId: project.storyboardId },
        select: { id: true, updatedAt: true },
      });
      return scene ? { id: scene.id, updatedAt: scene.updatedAt.toISOString() } : null;
    },
    characterInFilm: async (ownerId, projectId, characterId) => {
      const characters = await listOwnedFilmCharacters(ownerId, projectId);
      return characters.some((character) => character.id === characterId);
    },
    readIdempotency,
    saveIdempotency,
  };
}

export async function executeOwnedStudioV23Action(input: {
  user: Pick<SessionUser, "id" | "email" | "role">;
  request: StudioV23Request;
}): Promise<StudioV23Outcome> {
  const actor = actorFrom(input.user);
  const run = () => executeStudioV23Action({ actor, request: input.request }, defaultDeps());
  if (!input.request.idempotencyKey || !input.request.projectId || input.request.action === "CREATE_FILM_PROJECT") {
    return run();
  }
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`v23:${actor.id}:${input.request.idempotencyKey}`}, 0))`;
    return run();
  });
}

export async function executeOwnedStudioV23Body(input: {
  user: Pick<SessionUser, "id" | "email" | "role">;
  body: unknown;
}): Promise<StudioV23Outcome> {
  const parsed = parseStudioV23Request(input.body);
  if (!parsed.ok) {
    return {
      ok: false,
      code: "validation",
      message: parsed.message,
      httpStatus: 400,
      providerCalls: 0,
      creditsConsumed: 0,
    };
  }
  return executeOwnedStudioV23Action({ user: input.user, request: parsed.value });
}
