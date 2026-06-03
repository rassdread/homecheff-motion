import type { Prisma } from "@prisma/client";
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
import type { AnimationProjectWithMedia } from "@/server/animation-projects/queries";

export type ProjectRenderVersionSummary = {
  id: string;
  renderVersionNumber: number;
  kind: "initial" | "full_rerender";
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
    kind: row.kind === "full_rerender" ? "full_rerender" : "initial",
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
  kind: "initial" | "full_rerender";
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
    promptSnapshot: buildRenderPromptSnapshot(project) as object,
    storyboardSnapshot: buildRenderStoryboardSnapshot(project) as object,
    settingsSnapshot: buildRenderSettingsSnapshot(project) as object,
    segmentSnapshot: buildRenderSegmentSnapshot(project.transitions) as object,
    finalVideoUrl: params.finalVideoUrl ?? null,
    cleanVideoUrl: params.cleanVideoUrl ?? null,
    exportId: params.exportId ?? null,
    completedAt: params.completedAt ?? null,
  };
}

/** Seal the current default version before starting a new full rerender. */
export async function sealDefaultRenderVersion(params: {
  project: AnimationProjectWithMedia;
  finalVideoUrl: string | null;
  cleanVideoUrl: string | null;
  exportId: string | null;
}): Promise<void> {
  const current = await prisma.projectRenderVersion.findFirst({
    where: { projectId: params.project.id, isDefault: true },
    orderBy: { renderVersionNumber: "desc" },
  });

  if (current) {
    if (current.status === "completed" && current.finalVideoUrl?.trim()) {
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

export async function completePendingFullRerenderVersion(params: {
  projectId: string;
  renderVersionId: string;
  finalVideoUrl: string;
  cleanVideoUrl: string | null;
  exportId: string;
}): Promise<void> {
  await prisma.projectRenderVersion.update({
    where: { id: params.renderVersionId },
    data: {
      status: "completed",
      finalVideoUrl: params.finalVideoUrl,
      cleanVideoUrl: params.cleanVideoUrl,
      exportId: params.exportId,
      completedAt: new Date(),
      isDefault: true,
    },
  });
}

export async function failPendingFullRerenderVersion(params: {
  projectId: string;
  renderVersionId: string;
  errorMessage: string;
}): Promise<void> {
  await prisma.projectRenderVersion.update({
    where: { id: params.renderVersionId },
    data: {
      status: "failed",
      errorMessage: params.errorMessage,
      isDefault: false,
    },
  });
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
