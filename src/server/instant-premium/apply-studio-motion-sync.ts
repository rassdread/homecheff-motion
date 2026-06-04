import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildStudioMotionSyncPreview } from "@/lib/build-studio-motion-sync-preview";
import { mergeStudioHandoffIntoSceneText } from "@/lib/merge-studio-handoff-scene-text";
import type { InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";
import { emptyNormalizedSceneText, parseInstantSceneTexts } from "@/lib/story-overlay-templates";
import { persistInstantSceneTextsForProject } from "@/server/instant-premium/persist-instant-scene-texts";
import {
  appendStudioSyncAudit,
  buildProjectStudioQaResponse,
  prismaStudioMetadataFromHandoff,
} from "@/lib/studio-project-metadata";
import { getAnimationProjectByIdForViewer } from "@/server/animation-projects/queries";
import { createMotionHandoffPayload } from "@/server/studio/create-motion-handoff-payload";
import {
  ensureStoryModeTransitionRows,
  isStoryInstantMode,
} from "@/server/instant-premium/story-mode-transitions";
import {
  REFRESH_STUDIO_FORBIDDEN,
  REFRESH_STUDIO_NOT_FOUND,
  REFRESH_STUDIO_NO_SOURCE,
  REFRESH_STUDIO_STORYBOARD_GONE,
} from "@/server/instant-premium/refresh-studio-intelligence";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type {
  StudioMotionSyncApplyInput,
  StudioMotionSyncApplyResult,
  StudioMotionSyncPreview,
  StudioSyncAuditEntry,
} from "@/types/studio-motion-sync";

export const SYNC_STUDIO_NOTHING_SELECTED = "SYNC_STUDIO_NOTHING_SELECTED";
export const SYNC_STUDIO_REMOVE_SCENES_CONFIRM = "SYNC_STUDIO_REMOVE_SCENES_CONFIRM";
export const SYNC_STUDIO_ADD_SCENES_CONFIRM = "SYNC_STUDIO_ADD_SCENES_CONFIRM";
export const SYNC_STUDIO_RENDERING = "SYNC_STUDIO_RENDERING";

function transitionSecondsFromProject(seconds: number): InstantTransitionSeconds {
  if (seconds === 3 || seconds === 5 || seconds === 8) {
    return seconds;
  }
  return 5;
}

async function rebuildAdjacentTransitions(projectId: string): Promise<void> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: { images: { orderBy: { order: "asc" } } },
  });
  if (!project || isStoryInstantMode(project.instantMode)) {
    return;
  }
  await prisma.animationTransition.deleteMany({ where: { projectId } });
  const images = project.images;
  for (let index = 0; index < images.length - 1; index += 1) {
    await prisma.animationTransition.create({
      data: {
        projectId,
        startImageId: images[index]!.id,
        endImageId: images[index + 1]!.id,
        order: index,
        status: "queued",
        progress: 0,
      },
    });
  }
}

async function loadProjectHandoff(params: {
  projectId: string;
  userId: string;
  isAdmin?: boolean;
}): Promise<
  | {
      ok: true;
      project: NonNullable<Awaited<ReturnType<typeof getAnimationProjectByIdForViewer>>>;
      handoff: MotionHandoffPayload;
    }
  | { ok: false; code: string; error: string; status: number }
> {
  const viewer = { id: params.userId, role: params.isAdmin ? "admin" : "user" };
  const project = await getAnimationProjectByIdForViewer(params.projectId, viewer);
  if (!project) {
    return { ok: false, code: REFRESH_STUDIO_NOT_FOUND, error: "Project not found.", status: 404 };
  }
  const storyboardId = project.studioSourceStoryboardId?.trim();
  if (!storyboardId) {
    return {
      ok: false,
      code: REFRESH_STUDIO_NO_SOURCE,
      error: "This project has no Studio storyboard source.",
      status: 400,
    };
  }
  const handoffResult = await createMotionHandoffPayload(storyboardId, viewer);
  if ("error" in handoffResult) {
    const status = handoffResult.error.httpStatus ?? 404;
    return {
      ok: false,
      code: status === 403 ? REFRESH_STUDIO_FORBIDDEN : REFRESH_STUDIO_STORYBOARD_GONE,
      error: handoffResult.error.message,
      status,
    };
  }
  return { ok: true, project, handoff: handoffResult.payload };
}

export async function buildStudioMotionSyncPreviewForProject(params: {
  projectId: string;
  userId: string;
  isAdmin?: boolean;
}): Promise<
  | { ok: true; preview: StudioMotionSyncPreview }
  | { ok: false; code: string; error: string; status: number }
> {
  const loaded = await loadProjectHandoff(params);
  if (!loaded.ok) {
    return loaded;
  }
  const { project, handoff } = loaded;
  const preview = buildStudioMotionSyncPreview({
    projectId: project.id,
    storyboardId: handoff.storyboardId,
    storyboardTitle: project.studioSourceStoryboardTitle?.trim() || handoff.title,
    storedHandoff: project.studioHandoffJson,
    latestHandoff: handoff,
    images: project.images.map((img) => ({
      id: img.id,
      order: img.order,
      previewUrl: img.previewUrl,
      studioSceneId: img.studioSceneId,
      studioSceneImageId: img.studioSceneImageId,
    })),
    instantSceneTexts: project.instantSceneTexts,
    instantTransitionSeconds: transitionSecondsFromProject(project.instantTransitionSeconds),
  });
  return { ok: true, preview };
}

export async function applyStudioMotionSyncToProject(params: {
  projectId: string;
  userId: string;
  isAdmin?: boolean;
  input: StudioMotionSyncApplyInput;
}): Promise<StudioMotionSyncApplyResult> {
  const syncImages = params.input.syncImages === true;
  const syncTexts = params.input.syncTexts === true;
  const syncEmotions = params.input.syncEmotions === true;
  const syncDurations = params.input.syncDurations === true;
  const syncContext = params.input.syncContext === true;

  if (!syncImages && !syncTexts && !syncEmotions && !syncDurations && !syncContext) {
    return {
      ok: false,
      code: SYNC_STUDIO_NOTHING_SELECTED,
      error: "Select at least one category to sync.",
      status: 400,
    };
  }

  const loaded = await loadProjectHandoff(params);
  if (!loaded.ok) {
    return loaded;
  }
  const { project, handoff } = loaded;

  if (project.status === "generating" || project.status === "rendering") {
    return {
      ok: false,
      code: SYNC_STUDIO_RENDERING,
      error: "Sync is disabled while the project is generating or rendering.",
      status: 409,
    };
  }

  const previewBefore = buildStudioMotionSyncPreview({
    projectId: project.id,
    storyboardId: handoff.storyboardId,
    storyboardTitle: project.studioSourceStoryboardTitle?.trim() || handoff.title,
    storedHandoff: project.studioHandoffJson,
    latestHandoff: handoff,
    images: project.images.map((img) => ({
      id: img.id,
      order: img.order,
      previewUrl: img.previewUrl,
      studioSceneId: img.studioSceneId,
      studioSceneImageId: img.studioSceneImageId,
    })),
    instantSceneTexts: project.instantSceneTexts,
    instantTransitionSeconds: transitionSecondsFromProject(project.instantTransitionSeconds),
  });

  if (syncImages && previewBefore.requiresRemoveConfirmation && !params.input.confirmRemoveScenes) {
    return {
      ok: false,
      code: SYNC_STUDIO_REMOVE_SCENES_CONFIRM,
      error: previewBefore.warnings.find((w) => w.includes("Removing")) ?? "Confirm scene removal.",
      status: 400,
    };
  }
  if (syncImages && previewBefore.requiresAddConfirmation && !params.input.confirmAddScenes) {
    return {
      ok: false,
      code: SYNC_STUDIO_ADD_SCENES_CONFIRM,
      error: previewBefore.warnings.find((w) => w.includes("Adding")) ?? "Confirm adding scenes.",
      status: 400,
    };
  }

  const transitionSeconds = transitionSecondsFromProject(project.instantTransitionSeconds);
  const studioScenes = [...handoff.scenes].sort((a, b) => a.order - b.order);
  const sceneCountBefore = project.images.length;
  let imageChanges = 0;
  let textChanges = 0;
  let emotionChanges = 0;
  let durationChanges = 0;
  let removedSceneCount = 0;
  let addedSceneCount = 0;

  const currentTexts = parseInstantSceneTexts(project.instantSceneTexts);
  const targetImageCount =
    syncImages ? studioScenes.length : project.images.length;
  const imageCountAfter = syncImages ? targetImageCount : project.images.length;
  const mergedTexts: ReturnType<typeof parseInstantSceneTexts> = [];
  for (let index = 0; index < imageCountAfter; index += 1) {
    const isLast = index >= imageCountAfter - 1;
    const studio = studioScenes[index];
    const current = currentTexts[index] ?? emptyNormalizedSceneText();
    if (!studio) {
      mergedTexts.push(current);
      continue;
    }
    mergedTexts.push(
      mergeStudioHandoffIntoSceneText({
        current,
        studioScene: studio,
        syncTexts,
        syncEmotions,
        syncDurations,
        transitionSeconds,
        isLast,
      })
    );
    if (syncTexts && previewBefore.scenes[index]?.titleChanged) {
      textChanges += 1;
    }
    if (syncTexts && previewBefore.scenes[index]?.subtitleChanged) {
      textChanges += 1;
    }
    if (syncEmotions && previewBefore.scenes[index]?.emotionChanged) {
      emotionChanges += 1;
    }
    if (syncDurations && previewBefore.scenes[index]?.durationChanged) {
      durationChanges += 1;
    }
  }

  await prisma.$transaction(async (tx) => {
    if (syncImages) {
      if (studioScenes.length < project.images.length && params.input.confirmRemoveScenes) {
        const toRemove = project.images.slice(studioScenes.length);
        removedSceneCount = toRemove.length;
        await tx.animationTransition.deleteMany({ where: { projectId: project.id } });
        await tx.animationImage.deleteMany({
          where: { id: { in: toRemove.map((img) => img.id) } },
        });
      }

      const refreshedImages = await tx.animationImage.findMany({
        where: { projectId: project.id },
        orderBy: { order: "asc" },
      });

      for (let order = 0; order < studioScenes.length; order += 1) {
        const scene = studioScenes[order]!;
        const url = scene.selectedSceneImageUrl?.trim();
        if (!url || !isValidHttpUrl(url)) {
          continue;
        }
        const fileName = `${scene.title.trim() || scene.sceneId}.studio.jpg`;
        const existing = refreshedImages[order];
        if (existing) {
          if (existing.previewUrl !== url) {
            imageChanges += 1;
          }
          await tx.animationImage.update({
            where: { id: existing.id },
            data: {
              order,
              fileName,
              previewUrl: url,
              storageKey: url,
              viduInputUrl: url,
              studioSceneId: scene.sceneId,
              studioSceneImageId: scene.selectedSceneImageId,
            },
          });
        } else if (params.input.confirmAddScenes) {
          addedSceneCount += 1;
          imageChanges += 1;
          await tx.animationImage.create({
            data: {
              projectId: project.id,
              order,
              fileName,
              previewUrl: url,
              storageKey: url,
              viduInputUrl: url,
              studioSceneId: scene.sceneId,
              studioSceneImageId: scene.selectedSceneImageId,
            },
          });
        }
      }
    }

    const projectPatch: Prisma.AnimationProjectUpdateInput = {};
    if (syncContext) {
      Object.assign(
        projectPatch,
        prismaStudioMetadataFromHandoff(handoff, project.studioSourceStoryboardTitle)
      );
      await tx.animationProject.update({
        where: { id: project.id },
        data: {
          ...projectPatch,
          ...(syncContext ? { studioRefreshedAt: new Date() } : {}),
        },
      });
    } else if (syncImages) {
      await tx.animationProject.update({
        where: { id: project.id },
        data: { studioIntelligenceStatus: "current", studioLastStaleReason: null },
      });
    }
  });

  if (syncTexts || syncEmotions || syncDurations) {
    const persistedTexts = await persistInstantSceneTextsForProject(project.id, mergedTexts);
    if (!persistedTexts.ok) {
      return {
        ok: false,
        code: "SYNC_STUDIO_TEXT_FAILED",
        error: persistedTexts.error,
        status: persistedTexts.status,
      };
    }
  }

  if (syncImages) {
    if (isStoryInstantMode(project.instantMode)) {
      await ensureStoryModeTransitionRows(project.id);
    } else {
      await rebuildAdjacentTransitions(project.id);
    }
  }

  const sceneCountAfter = await prisma.animationImage.count({ where: { projectId: project.id } });
  const auditEntry: StudioSyncAuditEntry = {
    type: "studio_sync",
    syncedAt: new Date().toISOString(),
    syncedBy: params.userId,
    syncImages,
    syncTexts,
    syncEmotions,
    syncDurations,
    syncContext,
    sceneCountBefore,
    sceneCountAfter,
    imageChanges,
    textChanges,
    emotionChanges,
    durationChanges,
    removedSceneCount,
    addedSceneCount,
  };

  const auditJson = appendStudioSyncAudit(project.studioRefreshAuditJson, auditEntry);
  await prisma.animationProject.update({
    where: { id: project.id },
    data: { studioRefreshAuditJson: auditJson as unknown as Prisma.InputJsonValue },
  });

  const updated = await getAnimationProjectByIdForViewer(params.projectId, {
    id: params.userId,
    role: params.isAdmin ? "admin" : "user",
  });
  const preview = updated
    ? buildStudioMotionSyncPreview({
        projectId: updated.id,
        storyboardId: handoff.storyboardId,
        storyboardTitle: updated.studioSourceStoryboardTitle?.trim() || handoff.title,
        storedHandoff: updated.studioHandoffJson,
        latestHandoff: handoff,
        images: updated.images.map((img) => ({
          id: img.id,
          order: img.order,
          previewUrl: img.previewUrl,
          studioSceneId: img.studioSceneId,
          studioSceneImageId: img.studioSceneImageId,
        })),
        instantSceneTexts: updated.instantSceneTexts,
        instantTransitionSeconds: transitionSecondsFromProject(updated.instantTransitionSeconds),
      })
    : previewBefore;

  return {
    ok: true,
    projectId: project.id,
    preview,
    audit: auditEntry,
    studioQa: updated ? buildProjectStudioQaResponse(updated) : null,
  };
}
