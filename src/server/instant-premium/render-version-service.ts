import type { Prisma } from "@prisma/client";
import {
  markFullRerenderAuditFailed,
  mergeFullRerenderAudit,
  isFullRerenderInProgress,
  type FullRerenderAuditEntry,
} from "@/lib/full-rerender-audit";
import { isCleanUrlAlignedWithRenderVersion } from "@/lib/render-output-lineage";
import { urlsReferToSameAsset } from "@/lib/playback-url-resolution";
import { prisma } from "@/lib/prisma";
import {
  buildRenderImageSetFingerprint,
  buildRenderPromptSnapshot,
  buildRenderSegmentSnapshot,
  buildRenderSettingsSnapshot,
  buildRenderStoryboardSnapshot,
  diffRenderSnapshots,
  type RenderVersionDiffLine,
} from "@/lib/render-version-snapshots";
import {
  collectVersionHistoryVideoUrls,
  isVideoUrlReferencedByVersionHistory,
  type VersionHistoryUrlSource,
} from "@/lib/video-version-retention";
import { buildStudioRenderAuditMetadata } from "@/lib/studio-project-metadata";
import {
  getAnimationProjectById,
  type AnimationProjectWithMedia,
} from "@/server/animation-projects/queries";

export type ProjectRenderVersionKind = "initial" | "full_rerender" | "text_rerender";

export type ProjectRenderVersionSummary = {
  id: string;
  renderVersionNumber: number;
  kind: ProjectRenderVersionKind;
  status: string;
  isDefault: boolean;
  versionNote: string | null;
  finalVideoUrl: string | null;
  cleanVideoUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  createdFromRenderId: string | null;
};

type PendingFullRerenderAudit = {
  pendingFullRerender?: {
    renderVersionId: string;
    renderVersionNumber: number;
    startedAt: string;
  } | null;
};

export function mergeAuditWithPendingFullRerender(
  existing: unknown,
  fullRerenderEntry: FullRerenderAuditEntry,
  pending: NonNullable<PendingFullRerenderAudit["pendingFullRerender"]>
): Record<string, unknown> {
  const base = mergeFullRerenderAudit(existing, fullRerenderEntry);
  return {
    ...(typeof base === "object" && base && !Array.isArray(base) ? base : {}),
    pendingFullRerender: pending,
  };
}

/** Blob path version: full rerender uses renderVersionNumber; text rebuild uses rebuild count. */
export function resolveFinalBlobVersionForUpload(params: {
  pendingRenderVersionNumber: number | null;
  isMergeOnlyTextRebuild: boolean;
  nextTextRebuildCount: number;
}): number {
  if (params.pendingRenderVersionNumber != null && params.pendingRenderVersionNumber > 0) {
    return params.pendingRenderVersionNumber;
  }
  if (params.isMergeOnlyTextRebuild && params.nextTextRebuildCount > 0) {
    return params.nextTextRebuildCount;
  }
  return 0;
}

export function readPendingFullRerender(audit: unknown): PendingFullRerenderAudit["pendingFullRerender"] {
  if (!audit || typeof audit !== "object" || Array.isArray(audit)) {
    return null;
  }
  const pending = (audit as PendingFullRerenderAudit).pendingFullRerender;
  if (!pending || typeof pending.renderVersionId !== "string") {
    return null;
  }
  return pending;
}

function mapRenderVersionRow(row: {
  id: string;
  renderVersionNumber: number;
  kind: string;
  status: string;
  isDefault: boolean;
  versionNote: string | null;
  finalVideoUrl: string | null;
  cleanVideoUrl: string | null;
  createdAt: Date;
  completedAt: Date | null;
  createdFromRenderId: string | null;
}): ProjectRenderVersionSummary {
  return {
    id: row.id,
    renderVersionNumber: row.renderVersionNumber,
    kind:
      row.kind === "full_rerender"
        ? "full_rerender"
        : row.kind === "text_rerender"
          ? "text_rerender"
          : "initial",
    status: row.status,
    isDefault: row.isDefault,
    versionNote: row.versionNote,
    finalVideoUrl: row.finalVideoUrl,
    cleanVideoUrl: row.cleanVideoUrl,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    createdFromRenderId: row.createdFromRenderId,
  };
}

export async function backfillRenderVersionsIfNeeded(
  project: AnimationProjectWithMedia
): Promise<void> {
  const count = await prisma.projectRenderVersion.count({ where: { projectId: project.id } });
  if (count > 0 || project.status !== "completed") {
    return;
  }
  const latestExport = project.exports[0] ?? null;
  const finalUrl = latestExport?.outputVideoUrl?.trim() ?? null;
  if (!finalUrl) {
    return;
  }
  await ensureInitialRenderVersion({
    project,
    finalVideoUrl: finalUrl,
    cleanVideoUrl: project.instantCleanFinalVideoUrl,
    exportId: latestExport?.id ?? null,
  });
}

export async function listProjectRenderVersions(
  projectId: string
): Promise<ProjectRenderVersionSummary[]> {
  const rows = await prisma.projectRenderVersion.findMany({
    where: { projectId },
    orderBy: { renderVersionNumber: "desc" },
  });
  return rows.map(mapRenderVersionRow);
}

export async function getNextRenderVersionNumber(projectId: string): Promise<number> {
  const max = await prisma.projectRenderVersion.aggregate({
    where: { projectId },
    _max: { renderVersionNumber: true },
  });
  return (max._max.renderVersionNumber ?? 0) + 1;
}

export async function ensureInitialRenderVersion(params: {
  project: AnimationProjectWithMedia;
  finalVideoUrl: string | null;
  cleanVideoUrl: string | null;
  exportId: string | null;
}): Promise<ProjectRenderVersionSummary | null> {
  const existing = await prisma.projectRenderVersion.count({ where: { projectId: params.project.id } });
  if (existing > 0) {
    return null;
  }
  const row = await prisma.projectRenderVersion.create({
    data: buildRenderVersionCreateData({
      project: params.project,
      renderVersionNumber: 1,
      kind: "initial",
      status: "completed",
      isDefault: true,
      finalVideoUrl: params.finalVideoUrl,
      cleanVideoUrl: params.cleanVideoUrl,
      exportId: params.exportId,
      completedAt: new Date(),
    }),
  });
  return mapRenderVersionRow(row);
}

function buildRenderVersionCreateData(params: {
  project: AnimationProjectWithMedia;
  renderVersionNumber: number;
  kind: ProjectRenderVersionKind;
  status: string;
  isDefault: boolean;
  finalVideoUrl?: string | null;
  cleanVideoUrl?: string | null;
  exportId?: string | null;
  versionNote?: string | null;
  createdFromRenderId?: string | null;
  completedAt?: Date | null;
}): Prisma.ProjectRenderVersionCreateInput {
  const { project } = params;
  return {
    project: { connect: { id: project.id } },
    renderVersionNumber: params.renderVersionNumber,
    kind: params.kind,
    status: params.status,
    sourceImageSetId: buildRenderImageSetFingerprint(project.images),
    createdFromRenderId: params.createdFromRenderId ?? null,
    versionNote: params.versionNote ?? null,
    isDefault: params.isDefault,
    promptSnapshot: {
      ...buildRenderPromptSnapshot(project),
      studio: buildStudioRenderAuditMetadata(project),
    } as object,
    storyboardSnapshot: buildRenderStoryboardSnapshot(project) as object,
    settingsSnapshot: buildRenderSettingsSnapshot(project) as object,
    segmentSnapshot: buildRenderSegmentSnapshot(project.transitions) as object,
    finalVideoUrl: params.finalVideoUrl ?? null,
    cleanVideoUrl: params.cleanVideoUrl ?? null,
    exportId: params.exportId ?? null,
    completedAt: params.completedAt ?? null,
  };
}

async function findCompletedVersionWithFinalUrl(
  projectId: string,
  finalVideoUrl: string | null
): Promise<{ id: string } | null> {
  const target = finalVideoUrl?.trim();
  if (!target) {
    return null;
  }
  const rows = await prisma.projectRenderVersion.findMany({
    where: { projectId, status: "completed" },
    select: { id: true, finalVideoUrl: true },
  });
  const match = rows.find(
    (row) => row.finalVideoUrl?.trim() && urlsReferToSameAsset(row.finalVideoUrl, target)
  );
  return match ? { id: match.id } : null;
}

/** Seal the current active final as a completed render version before starting a new full rerender. */
export async function sealDefaultRenderVersion(params: {
  project: AnimationProjectWithMedia;
  finalVideoUrl: string | null;
  cleanVideoUrl: string | null;
  exportId: string | null;
}): Promise<void> {
  const finalUrl = params.finalVideoUrl?.trim() ?? null;
  if (!finalUrl) {
    return;
  }

  const duplicate = await findCompletedVersionWithFinalUrl(params.project.id, finalUrl);
  if (duplicate) {
    await prisma.projectRenderVersion.updateMany({
      where: { projectId: params.project.id, isDefault: true, id: { not: duplicate.id } },
      data: { isDefault: false },
    });
    return;
  }

  const current = await prisma.projectRenderVersion.findFirst({
    where: { projectId: params.project.id, isDefault: true },
    orderBy: { renderVersionNumber: "desc" },
  });

  if (current) {
    if (
      current.status === "completed" &&
      current.finalVideoUrl?.trim() &&
      urlsReferToSameAsset(current.finalVideoUrl, finalUrl)
    ) {
      return;
    }
    await prisma.projectRenderVersion.update({
      where: { id: current.id },
      data: {
        status: "completed",
        finalVideoUrl: params.finalVideoUrl,
        cleanVideoUrl: params.cleanVideoUrl,
        exportId: params.exportId,
        segmentSnapshot: buildRenderSegmentSnapshot(params.project.transitions) as object,
        completedAt: new Date(),
        isDefault: false,
      },
    });
    return;
  }

  await ensureInitialRenderVersion(params);
  await prisma.projectRenderVersion.updateMany({
    where: { projectId: params.project.id, isDefault: true },
    data: { isDefault: false },
  });
}

export async function createPendingTextRerenderVersion(params: {
  project: AnimationProjectWithMedia;
  versionNote?: string | null;
  createdFromRenderId?: string | null;
  sourceCleanVideoUrl?: string | null;
}): Promise<{ id: string; renderVersionNumber: number }> {
  const renderVersionNumber = await getNextRenderVersionNumber(params.project.id);
  const previousDefault = await prisma.projectRenderVersion.findFirst({
    where: { projectId: params.project.id, isDefault: true },
    orderBy: { renderVersionNumber: "desc" },
  });

  await prisma.projectRenderVersion.updateMany({
    where: { projectId: params.project.id, isDefault: true },
    data: { isDefault: false },
  });

  const cleanSource =
    params.sourceCleanVideoUrl?.trim() ||
    previousDefault?.cleanVideoUrl?.trim() ||
    params.project.instantCleanFinalVideoUrl?.trim() ||
    null;

  const row = await prisma.projectRenderVersion.create({
    data: buildRenderVersionCreateData({
      project: params.project,
      renderVersionNumber,
      kind: "text_rerender",
      status: "generating",
      isDefault: true,
      versionNote: params.versionNote ?? null,
      createdFromRenderId: params.createdFromRenderId ?? previousDefault?.id ?? null,
      cleanVideoUrl: cleanSource,
    }),
  });

  return { id: row.id, renderVersionNumber: row.renderVersionNumber };
}

export async function createPendingFullRerenderVersion(params: {
  project: AnimationProjectWithMedia;
  versionNote?: string | null;
  createdFromRenderId?: string | null;
}): Promise<{ id: string; renderVersionNumber: number }> {
  const renderVersionNumber = await getNextRenderVersionNumber(params.project.id);
  const previousDefault = await prisma.projectRenderVersion.findFirst({
    where: { projectId: params.project.id, isDefault: true },
    orderBy: { renderVersionNumber: "desc" },
  });

  await prisma.projectRenderVersion.updateMany({
    where: { projectId: params.project.id, isDefault: true },
    data: { isDefault: false },
  });

  const row = await prisma.projectRenderVersion.create({
    data: buildRenderVersionCreateData({
      project: params.project,
      renderVersionNumber,
      kind: renderVersionNumber === 1 ? "initial" : "full_rerender",
      status: "generating",
      isDefault: true,
      versionNote: params.versionNote ?? null,
      createdFromRenderId: params.createdFromRenderId ?? previousDefault?.id ?? null,
    }),
  });

  return { id: row.id, renderVersionNumber: row.renderVersionNumber };
}

export async function loadVersionHistoryUrlSource(
  projectId: string
): Promise<VersionHistoryUrlSource> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: {
      instantPreviousFinalVideoUrl: true,
      instantFinalRebuildAuditJson: true,
      renderVersions: {
        select: { finalVideoUrl: true, cleanVideoUrl: true },
      },
    },
  });
  if (!project) {
    return {};
  }
  return {
    instantPreviousFinalVideoUrl: project.instantPreviousFinalVideoUrl,
    instantFinalRebuildAuditJson: project.instantFinalRebuildAuditJson,
    renderVersions: project.renderVersions,
  };
}

/** Persist bare concat on a pending/failed render version (overlay/upload failed after clean upload). */
export async function attachCleanVideoToPendingRenderVersion(params: {
  renderVersionId: string;
  cleanVideoUrl: string;
}): Promise<void> {
  const clean = params.cleanVideoUrl.trim();
  if (!clean) {
    return;
  }
  await prisma.projectRenderVersion.update({
    where: { id: params.renderVersionId },
    data: { cleanVideoUrl: clean },
  });
}

export async function completePendingFullRerenderVersion(params: {
  projectId: string;
  renderVersionId: string;
  finalVideoUrl: string;
  cleanVideoUrl: string | null;
  exportId: string;
}): Promise<void> {
  const project = await getAnimationProjectById(params.projectId);
  await prisma.projectRenderVersion.update({
    where: { id: params.renderVersionId },
    data: {
      status: "completed",
      finalVideoUrl: params.finalVideoUrl,
      cleanVideoUrl: params.cleanVideoUrl,
      exportId: params.exportId,
      completedAt: new Date(),
      isDefault: true,
      ...(project
        ? { segmentSnapshot: buildRenderSegmentSnapshot(project.transitions) as object }
        : {}),
    },
  });
}

export async function failPendingFullRerenderVersion(params: {
  projectId: string;
  renderVersionId: string;
  errorMessage: string;
}): Promise<string | null> {
  await prisma.projectRenderVersion.update({
    where: { id: params.renderVersionId },
    data: {
      status: "failed",
      errorMessage: params.errorMessage,
      isDefault: false,
    },
  });

  const previousPlayable = await prisma.projectRenderVersion.findFirst({
    where: {
      projectId: params.projectId,
      id: { not: params.renderVersionId },
      status: "completed",
      finalVideoUrl: { not: null },
    },
    orderBy: { renderVersionNumber: "desc" },
  });

  if (previousPlayable) {
    await prisma.projectRenderVersion.update({
      where: { id: previousPlayable.id },
      data: { isDefault: true },
    });
    return previousPlayable.finalVideoUrl?.trim() ?? null;
  }

  return null;
}

/** Restore export + default flag to last completed render version after full rerender failure. */
export async function handleFullRerenderFailure(
  projectId: string,
  message?: string
): Promise<boolean> {
  const project = await getAnimationProjectById(projectId);
  if (!project) {
    return false;
  }

  const audit = project.instantFinalRebuildAuditJson;
  const pending = readPendingFullRerender(audit);
  const wasRunning = isFullRerenderInProgress(audit);
  if (!pending && !wasRunning) {
    return false;
  }

  const errorMessage = message?.trim() || "Full rerender failed.";
  let restoreUrl = project.instantPreviousFinalVideoUrl?.trim() ?? null;
  let restoreClean = project.instantCleanFinalVideoUrl?.trim() ?? null;

  if (pending) {
    const partialClean = restoreClean;
    const fromVersion = await failPendingFullRerenderVersion({
      projectId,
      renderVersionId: pending.renderVersionId,
      errorMessage,
    });
    if (fromVersion) {
      restoreUrl = fromVersion;
    }
    if (
      partialClean &&
      isCleanUrlAlignedWithRenderVersion(partialClean, pending.renderVersionNumber)
    ) {
      await attachCleanVideoToPendingRenderVersion({
        renderVersionId: pending.renderVersionId,
        cleanVideoUrl: partialClean,
      });
      restoreClean = partialClean;
    } else {
      const defaultRow = await prisma.projectRenderVersion.findFirst({
        where: { projectId, isDefault: true, status: "completed" },
        select: { cleanVideoUrl: true },
      });
      if (defaultRow?.cleanVideoUrl?.trim()) {
        restoreClean = defaultRow.cleanVideoUrl.trim();
      }
    }
  }

  const nextAudit = markFullRerenderAuditFailed(audit, errorMessage);
  const auditBase =
    nextAudit && typeof nextAudit === "object" && !Array.isArray(nextAudit)
      ? (nextAudit as Record<string, unknown>)
      : {};

  const exportRow = project.exports[0];
  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      status: restoreUrl ? "completed" : "failed",
      failureReason: restoreUrl ? null : "merge_failed",
      lastOverlayError: null,
      instantWorkerJobStatus: restoreUrl ? "completed" : "failed",
      ...(restoreClean ? { instantCleanFinalVideoUrl: restoreClean } : {}),
      instantFinalRebuildAuditJson: {
        ...auditBase,
        pendingFullRerender: null,
      } as object,
    },
  });

  if (exportRow && restoreUrl) {
    await prisma.animationExport.update({
      where: { id: exportRow.id },
      data: {
        status: "completed",
        progress: 100,
        outputVideoUrl: restoreUrl,
        errorMessage: errorMessage.slice(0, 500),
      },
    });
  }

  return true;
}

export type RestoreRenderVersionResult =
  | { ok: true; finalVideoUrl: string }
  | { ok: false; code: string; message: string };

export async function restoreProjectRenderVersion(params: {
  projectId: string;
  renderVersionId: string;
  userId: string;
  isAdmin?: boolean;
}): Promise<RestoreRenderVersionResult> {
  const project = await getAnimationProjectById(params.projectId);
  if (!project) {
    return { ok: false, code: "NOT_FOUND", message: "Project not found." };
  }
  if (project.ownerId !== params.userId && !params.isAdmin) {
    return { ok: false, code: "FORBIDDEN", message: "Forbidden." };
  }

  const version = await prisma.projectRenderVersion.findFirst({
    where: {
      id: params.renderVersionId,
      projectId: params.projectId,
      status: "completed",
    },
  });
  const finalUrl = version?.finalVideoUrl?.trim();
  if (!version || !finalUrl) {
    return { ok: false, code: "NOT_FOUND", message: "Completed render version not found." };
  }

  const exportRow = project.exports[0];
  if (!exportRow) {
    return { ok: false, code: "NOT_READY", message: "No export row for this project." };
  }

  const restoredAt = new Date().toISOString();
  const auditBase =
    project.instantFinalRebuildAuditJson &&
    typeof project.instantFinalRebuildAuditJson === "object" &&
    !Array.isArray(project.instantFinalRebuildAuditJson)
      ? { ...(project.instantFinalRebuildAuditJson as Record<string, unknown>) }
      : {};

  await prisma.$transaction([
    prisma.projectRenderVersion.updateMany({
      where: { projectId: params.projectId },
      data: { isDefault: false },
    }),
    prisma.projectRenderVersion.update({
      where: { id: version.id },
      data: { isDefault: true },
    }),
    prisma.animationExport.update({
      where: { id: exportRow.id },
      data: {
        status: "completed",
        progress: 100,
        outputVideoUrl: finalUrl,
        errorMessage: null,
      },
    }),
    prisma.animationProject.update({
      where: { id: params.projectId },
      data: {
        status: "completed",
        failureReason: null,
        lastOverlayError: null,
        instantWorkerJobStatus: "completed",
        instantFinalRebuildStatus: null,
        ...(version.cleanVideoUrl?.trim()
          ? { instantCleanFinalVideoUrl: version.cleanVideoUrl.trim() }
          : {}),
        instantFinalRebuildAuditJson: {
          ...auditBase,
          pendingFullRerender: null,
          lastRenderVersionRestore: {
            renderVersionId: version.id,
            renderVersionNumber: version.renderVersionNumber,
            restoredAt,
            finalVideoUrl: finalUrl,
          },
        } as object,
      },
    }),
  ]);

  return { ok: true, finalVideoUrl: finalUrl };
}

export async function compareRenderVersions(
  projectId: string,
  versionIdA: string,
  versionIdB: string
): Promise<RenderVersionDiffLine[]> {
  const [a, b] = await Promise.all([
    prisma.projectRenderVersion.findFirst({ where: { id: versionIdA, projectId } }),
    prisma.projectRenderVersion.findFirst({ where: { id: versionIdB, projectId } }),
  ]);
  if (!a || !b) {
    return [];
  }
  return diffRenderSnapshots(a, b);
}
