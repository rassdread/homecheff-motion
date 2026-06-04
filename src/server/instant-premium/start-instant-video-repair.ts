import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { isInstantPremiumExportCompleted } from "@/lib/instant-premium-export-status";
import {
  clearVideoRepairAudit,
  mergeVideoRepairAudit,
  readVideoRepairAudit,
} from "@/lib/instant-video-repair";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import { isBlobTokenConfigured } from "@/lib/vercel-blob-config";
import { pollProjectJobs } from "@/server/animation-jobs/service";
import { reconcileVideoRepairState } from "@/server/instant-premium/reconcile-video-repair";
import {
  detectFinalizationStuck,
  clipsReadyForFinalizeRepair,
  dispatchInstantPremiumWorkerMerge,
  orchestrateFinalMerge,
  resetInstantRepairExportState,
  type RepairFinalVideoResult,
} from "@/server/instant-premium/finalize-repair";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import { refreshTransitionOutputsFromProvider } from "@/server/instant-premium/instant-premium-provider-sync";
import {
  ensureStoryModeTransitionRows,
} from "@/server/instant-premium/story-mode-transitions";
import { syncFinalVideoArtifactsFromBlob } from "@/server/instant-premium/sync-final-video-artifacts";
import {
  retryUploadLocalMergedFinalVideo,
} from "@/server/instant-premium/merge-instant-project";
import { getFinalExportStage } from "@/server/instant-premium/final-export-stage";
import { assessRepairOutputAlignment } from "@/lib/render-output-lineage";
import type { RenderSegmentSnapshotEntry } from "@/lib/render-version-snapshots";
import { readPendingFullRerender } from "@/server/instant-premium/render-version-service";

export type StartInstantVideoRepairResult = {
  ok: boolean;
  accepted: boolean;
  alreadyRunning: boolean;
  completedImmediately: boolean;
  syncedFromBlob: boolean;
  projectId: string;
  clipsReady: boolean;
  workerTriggered: boolean;
  message?: string;
};

function logRepair(phase: string, data: Record<string, unknown>): void {
  console.info("[instant-video-repair]", { phase, ...data });
}

export function isInstantVideoRepairInProgress(project: {
  instantFinalRebuildAuditJson: unknown;
  instantWorkerJobStatus: string | null;
  instantWorkerJobStartedAt: Date | null;
  status: string;
  transitions: Array<{ status: string; outputVideoUrl: string | null }>;
  exports: Array<{
    status: string;
    progress: number;
    outputVideoUrl: string | null;
    updatedAt: Date;
  }>;
}): boolean {
  const audit = readVideoRepairAudit(project.instantFinalRebuildAuditJson);
  if (audit?.status === "running") {
    return true;
  }
  const stuck = detectFinalizationStuck(project);
  if (stuck.shouldAutoRepair) {
    return false;
  }
  return stuck.mergeInProgress || project.instantWorkerJobStatus === "running";
}

async function writeRepairAudit(
  projectId: string,
  patch: Parameters<typeof mergeVideoRepairAudit>[1]
): Promise<void> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: { instantFinalRebuildAuditJson: true },
  });
  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      instantFinalRebuildAuditJson: mergeVideoRepairAudit(
        project?.instantFinalRebuildAuditJson,
        patch
      ) as object,
    },
  });
}

async function markRepairFailed(projectId: string, message: string, errorCode?: string): Promise<void> {
  await writeRepairAudit(projectId, {
    status: "failed",
    stage: "failed",
    errorCode: errorCode ?? "repair_failed",
    errorMessage: message,
    updatedAt: new Date().toISOString(),
  });
  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      instantWorkerJobStatus: "failed",
      failureReason: "merge_failed",
    },
  });
}

async function reconcileRepairAfterWorker(projectId: string, source: string): Promise<void> {
  await reconcileVideoRepairState(projectId);
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: { exports: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const exportRow = project?.exports[0];
  const done = isInstantPremiumExportCompleted(
    project?.status ?? "",
    exportRow?.status,
    exportRow?.outputVideoUrl
  );
  if (done) {
    await markRepairCompleted(projectId);
    logRepair("worker_background_completed", { projectId, source });
    return;
  }
  const stage = getFinalExportStage(projectId)?.stage ?? null;
  await writeRepairAudit(projectId, {
    status: "running",
    stage: stage === "upload" || stage === "finalize" ? "uploading_final" : "reapplying_texts",
    updatedAt: new Date().toISOString(),
  });
}

export async function canMarkVideoRepairCompleted(projectId: string): Promise<boolean> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
      renderVersions: {
        where: { isDefault: true },
        orderBy: { renderVersionNumber: "desc" },
        take: 1,
        select: {
          renderVersionNumber: true,
          segmentSnapshot: true,
        },
      },
    },
  });
  if (!project) {
    return false;
  }
  const exportRow = project.exports[0];
  const pending = readPendingFullRerender(project.instantFinalRebuildAuditJson);
  const defaultVersion = project.renderVersions[0];
  const snapshot = defaultVersion?.segmentSnapshot as RenderSegmentSnapshotEntry[] | null;
  const alignment = assessRepairOutputAlignment({
    projectStatus: project.status,
    exportStatus: exportRow?.status ?? null,
    exportOutputUrl: exportRow?.outputVideoUrl ?? null,
    previousFinalVideoUrl: project.instantPreviousFinalVideoUrl,
    projectCleanUrl: project.instantCleanFinalVideoUrl,
    transitions: project.transitions.map((row) => ({
      order: row.order,
      id: row.id,
      status: row.status,
      outputVideoUrl: row.outputVideoUrl,
    })),
    pendingRenderVersionNumber:
      pending?.renderVersionNumber ?? defaultVersion?.renderVersionNumber ?? null,
    pendingSegmentSnapshot: snapshot,
    auditJson: project.instantFinalRebuildAuditJson,
  });
  return alignment.aligned;
}

async function markRepairCompleted(projectId: string): Promise<void> {
  if (!(await canMarkVideoRepairCompleted(projectId))) {
    await markRepairFailed(
      projectId,
      "Repair finished but final/clean outputs do not match the latest segment clips.",
      "repair_output_mismatch"
    );
    logRepair("completion_rejected_output_mismatch", { projectId });
    return;
  }
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: { instantFinalRebuildAuditJson: true },
  });
  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      instantFinalRebuildAuditJson:
        clearVideoRepairAudit(project?.instantFinalRebuildAuditJson) as object | undefined,
      instantWorkerJobStatus: "completed",
      failureReason: null,
      lastOverlayError: null,
    },
  });
}

/** Runs merge/overlay/upload after the HTTP response (local mode). */
export async function executeInstantVideoRepairBackground(
  projectId: string,
  options?: { force?: boolean; source?: string }
): Promise<void> {
  const source = options?.source ?? "repair-background";
  logRepair("background_start", { projectId, source });

  try {
    await writeRepairAudit(projectId, {
      status: "running",
      stage: "checking_source",
      updatedAt: new Date().toISOString(),
    });
    await orchestrateFinalMerge(projectId, {
      force: Boolean(options?.force),
      awaitWorker: true,
    });

    const project = await prisma.animationProject.findUnique({
      where: { id: projectId },
      include: { exports: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const exportRow = project?.exports[0];
    const done = isInstantPremiumExportCompleted(
      project?.status ?? "",
      exportRow?.status,
      exportRow?.outputVideoUrl
    );
    if (done) {
      await markRepairCompleted(projectId);
      logRepair("background_completed", { projectId, source });
      return;
    }

    const stage = getFinalExportStage(projectId)?.stage ?? null;
    await markRepairFailed(
      projectId,
      exportRow?.errorMessage?.trim() ||
        `Repair did not complete (export=${exportRow?.status ?? "unknown"}, stage=${stage ?? "none"}).`
    );
    logRepair("background_incomplete", {
      projectId,
      source,
      exportStatus: exportRow?.status,
      stage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repair failed.";
    await markRepairFailed(projectId, message);
    logRepair("background_failed", { projectId, source, error: message });
  }
}

function toLegacyRepairResult(start: StartInstantVideoRepairResult): RepairFinalVideoResult {
  return {
    ok: start.ok,
    projectId: start.projectId,
    clipsReady: start.clipsReady,
    workerTriggered: start.workerTriggered,
    mergeCompleted: start.completedImmediately,
    finalVideoUrlPresent: start.completedImmediately,
    message: start.message,
  };
}

/**
 * Start repair without blocking on FFmpeg. Fast-path: sync existing Blob finals to DB.
 */
export async function startInstantVideoRepair(
  projectId: string,
  options?: { force?: boolean; source?: string; scheduleBackground?: boolean }
): Promise<StartInstantVideoRepairResult> {
  const source = options?.source ?? "manual";
  const workerMode = isVideoRenderWorkerMode();
  logRepair("start", { projectId, source, force: Boolean(options?.force), workerMode });

  await ensureStoryModeTransitionRows(projectId).catch(() => undefined);

  let project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project || !isInstantLikeProject(project)) {
    return {
      ok: false,
      accepted: false,
      alreadyRunning: false,
      completedImmediately: false,
      syncedFromBlob: false,
      projectId,
      clipsReady: false,
      workerTriggered: false,
      message: "Instant Premium project not found.",
    };
  }

  let clipsReady = clipsReadyForFinalizeRepair(project.instantMode, project.transitions);
  await refreshTransitionOutputsFromProvider(projectId).catch(() => undefined);
  if (!clipsReady) {
    await pollProjectJobs(projectId).catch(() => undefined);
    const refreshedForClips = await prisma.animationProject.findUnique({
      where: { id: projectId },
      include: {
        transitions: { orderBy: { order: "asc" } },
        exports: { orderBy: { createdAt: "desc" } },
      },
    });
    if (refreshedForClips) {
      project = refreshedForClips;
      clipsReady = clipsReadyForFinalizeRepair(project.instantMode, project.transitions);
    }
  }

  if (
    !options?.force &&
    isInstantVideoRepairInProgress({
      instantFinalRebuildAuditJson: project.instantFinalRebuildAuditJson,
      instantWorkerJobStatus: project.instantWorkerJobStatus,
      instantWorkerJobStartedAt: project.instantWorkerJobStartedAt,
      status: project.status,
      transitions: project.transitions,
      exports: project.exports,
    })
  ) {
    return {
      ok: true,
      accepted: false,
      alreadyRunning: true,
      completedImmediately: false,
      syncedFromBlob: false,
      projectId,
      clipsReady,
      workerTriggered: true,
      message: "Repair is already in progress.",
    };
  }

  if (!clipsReady) {
    return {
      ok: false,
      accepted: false,
      alreadyRunning: false,
      completedImmediately: false,
      syncedFromBlob: false,
      projectId,
      clipsReady: false,
      workerTriggered: false,
      message: "Provider clips are not all completed yet.",
    };
  }

  const sync = await syncFinalVideoArtifactsFromBlob(projectId);
  if (sync.ok && (sync.action === "synced" || sync.action === "already_synced")) {
    await markRepairCompleted(projectId);
    logRepair("blob_sync_completed", { projectId, source, action: sync.action });
    return {
      ok: true,
      accepted: true,
      alreadyRunning: false,
      completedImmediately: true,
      syncedFromBlob: sync.action === "synced",
      projectId,
      clipsReady: true,
      workerTriggered: false,
      message: "Final video synced from storage.",
    };
  }

  if (isBlobTokenConfigured()) {
    const uploadOnly = await retryUploadLocalMergedFinalVideo(projectId);
    if (uploadOnly.ok && uploadOnly.finalUrl) {
      await markRepairCompleted(projectId);
      return {
        ok: true,
        accepted: true,
        alreadyRunning: false,
        completedImmediately: true,
        syncedFromBlob: false,
        projectId,
        clipsReady: true,
        workerTriggered: false,
        message: "Final video uploaded from local merge.",
      };
    }
  }

  const force = Boolean(options?.force) || detectFinalizationStuck(project).isStuck;
  const now = new Date().toISOString();

  await writeRepairAudit(projectId, {
    status: "running",
    stage: "started",
    startedAt: now,
    updatedAt: now,
    source,
    workerMode,
    errorCode: null,
    errorMessage: null,
  });

  if (force) {
    await resetInstantRepairExportState(projectId);
  }

  const scheduleBackground = options?.scheduleBackground !== false;
  if (workerMode) {
    if (scheduleBackground) {
      after(async () => {
        await writeRepairAudit(projectId, {
          status: "running",
          stage: "checking_source",
          updatedAt: new Date().toISOString(),
        });
        const dispatched = await dispatchInstantPremiumWorkerMerge(projectId, { force });
        if (dispatched.ok) {
          await reconcileRepairAfterWorker(projectId, source);
          return;
        }
        logRepair("worker_dispatch_fallback_local", {
          projectId,
          source,
          message: dispatched.message,
        });
        await executeInstantVideoRepairBackground(projectId, { force, source });
      });
    } else {
      const dispatched = await dispatchInstantPremiumWorkerMerge(projectId, { force });
      if (!dispatched.ok) {
        await executeInstantVideoRepairBackground(projectId, { force, source });
      } else {
        await reconcileRepairAfterWorker(projectId, source);
      }
    }
  } else {
    await prisma.animationProject.update({
      where: { id: projectId },
      data: {
        status: "rendering",
        instantWorkerJobStatus: "running",
        instantWorkerJobStartedAt: new Date(),
      },
    });
    if (scheduleBackground) {
      after(async () => {
        await executeInstantVideoRepairBackground(projectId, { force, source });
      });
    }
  }

  logRepair("accepted", { projectId, source, workerMode, force });

  return {
    ok: true,
    accepted: true,
    alreadyRunning: false,
    completedImmediately: false,
    syncedFromBlob: false,
    projectId,
    clipsReady: true,
    workerTriggered: true,
    message: workerMode
      ? "Repair started on the video worker."
      : "Repair started locally.",
  };
}

/** @deprecated Prefer startInstantVideoRepair for API routes. */
export async function repairInstantPremiumFinalVideo(
  projectId: string,
  options?: { force?: boolean; source?: string; awaitCompletion?: boolean }
): Promise<RepairFinalVideoResult> {
  const start = await startInstantVideoRepair(projectId, {
    ...options,
    scheduleBackground: options?.awaitCompletion ? false : true,
  });
  if (start.completedImmediately || start.alreadyRunning) {
    return toLegacyRepairResult(start);
  }
  if (!start.accepted) {
    return toLegacyRepairResult(start);
  }
  if (options?.awaitCompletion && !isVideoRenderWorkerMode()) {
    await executeInstantVideoRepairBackground(projectId, options);
    const refreshed = await prisma.animationProject.findUnique({
      where: { id: projectId },
      include: { exports: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const exportRow = refreshed?.exports[0];
    const done =
      isInstantPremiumExportCompleted(refreshed?.status ?? "", exportRow?.status) &&
      Boolean(exportRow?.outputVideoUrl?.trim());
    return {
      ok: done,
      projectId,
      clipsReady: true,
      workerTriggered: true,
      mergeCompleted: done,
      finalVideoUrlPresent: done,
      message: done ? undefined : "Final merge did not complete yet.",
    };
  }
  return toLegacyRepairResult(start);
}
