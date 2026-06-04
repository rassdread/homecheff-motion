import { prisma } from "@/lib/prisma";
import { parseInstantMode } from "@/lib/instant-premium-mode-types";
import { buildFullRerenderRenderBodyFromDraft } from "@/lib/full-rerender-draft";
import { getAnimationProjectById } from "@/server/animation-projects/queries";
import { startProjectJobs } from "@/server/animation-jobs/service";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import {
  deleteFullRerenderDraft,
  getFullRerenderDraftForProject,
} from "@/server/instant-premium/full-rerender-draft-service";
import { persistFullRerenderImagesForProject } from "@/server/instant-premium/persist-full-rerender-images";
import { persistFullRerenderSettingsForProject } from "@/server/instant-premium/persist-full-rerender-settings";
import { ensureStoryModeTransitionRows } from "@/server/instant-premium/story-mode-transitions";
import type { FullRerenderProjectResult } from "@/server/instant-premium/full-rerender-project";

export const DRAFT_RENDER_WRONG_TYPE = "DRAFT_RENDER_WRONG_TYPE";
export const DRAFT_RENDER_NOT_DRAFT = "DRAFT_RENDER_NOT_DRAFT";
export const DRAFT_RENDER_NO_DRAFT = "DRAFT_RENDER_NO_DRAFT";

function instantPremiumProgressRoute(projectId: string): string {
  return `/animate/instant/progress?projectId=${encodeURIComponent(projectId)}`;
}

/**
 * First render for a draft copy — applies editor draft, starts Vidu on this project only.
 * Does not touch sourceProjectId or the original project's exports/history.
 */
export async function startDraftInstantPremiumProjectRender(params: {
  projectId: string;
  userId: string;
  isAdmin?: boolean;
}): Promise<FullRerenderProjectResult> {
  const { projectId, userId, isAdmin = false } = params;

  const project = await getAnimationProjectById(projectId);
  if (!project) {
    return { ok: false, code: DRAFT_RENDER_WRONG_TYPE, projectId, message: "Project not found." };
  }

  if (!isAdmin && project.ownerId !== userId) {
    return { ok: false, code: DRAFT_RENDER_WRONG_TYPE, projectId, message: "Project not found." };
  }

  if (!isInstantLikeProject(project)) {
    return {
      ok: false,
      code: DRAFT_RENDER_WRONG_TYPE,
      projectId,
      message: "Only instant premium projects support concept render.",
    };
  }

  if (project.status !== "draft") {
    return {
      ok: false,
      code: DRAFT_RENDER_NOT_DRAFT,
      projectId,
      message: "This project is not a concept draft.",
    };
  }

  const draft = await getFullRerenderDraftForProject(projectId);
  if (!draft) {
    return {
      ok: false,
      code: DRAFT_RENDER_NO_DRAFT,
      projectId,
      message: "Concept draft not found. Save the concept first.",
    };
  }

  const fromDraft = buildFullRerenderRenderBodyFromDraft(draft);
  if (!fromDraft.imageChanges.sequence.length) {
    return {
      ok: false,
      code: DRAFT_RENDER_NOT_DRAFT,
      projectId,
      message: "Add at least two photos before rendering.",
    };
  }

  const persistedImages = await persistFullRerenderImagesForProject(projectId, {
    sequence: fromDraft.imageChanges.sequence,
    replacedImageIds: fromDraft.imageChanges.replacedImageIds,
  });
  if (!persistedImages.ok) {
    return {
      ok: false,
      code: DRAFT_RENDER_NOT_DRAFT,
      projectId,
      message: persistedImages.error,
    };
  }

  const persistedSettings = await persistFullRerenderSettingsForProject(projectId, {
    sceneTexts: fromDraft.sceneTexts,
    instantUserIntent: fromDraft.instantUserIntent,
    instantTransitionSeconds: fromDraft.instantTransitionSeconds,
    versionNote: fromDraft.versionNote,
  });
  if (!persistedSettings.ok) {
    return {
      ok: false,
      code: DRAFT_RENDER_NOT_DRAFT,
      projectId,
      message: persistedSettings.error,
    };
  }

  if (parseInstantMode(project.instantMode) === "story") {
    await ensureStoryModeTransitionRows(projectId);
  }

  const startedAt = new Date();
  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      status: "generating",
      failureReason: null,
      lastOverlayError: null,
      instantWorkerJobStatus: "queued",
      instantWorkerJobStartedAt: startedAt,
    },
  });

  const exportRow =
    (await prisma.animationExport.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    })) ??
    (await prisma.animationExport.create({
      data: {
        projectId,
        status: "queued",
        progress: 0,
      },
    }));

  await prisma.animationExport.update({
    where: { id: exportRow.id },
    data: {
      status: "queued",
      progress: 0,
      outputVideoUrl: null,
      errorMessage: null,
    },
  });

  const { startedCount } = await startProjectJobs(projectId);
  await deleteFullRerenderDraft(projectId);

  return {
    ok: true,
    projectId,
    status: "started",
    progressRoute: instantPremiumProgressRoute(projectId),
    startedSegmentCount: startedCount,
  };
}
