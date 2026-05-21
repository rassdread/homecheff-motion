import { prisma } from "@/lib/prisma";
import {
  buildPlaybackCacheKey,
  pickPlaybackUrl,
  resolveLatestExportPlaybackUrl,
} from "@/lib/playback-url-resolution";
import { withFinalVideoCacheBust } from "@/lib/final-video-storage";
import { resolveExportTimeoutMs } from "@/lib/export-timeout";
import { buildAdminAssemblyTimeline, buildFinalSegmentTransitionRows } from "@/server/instant-premium/final-segment-source";
import { getFinalExportStage } from "@/server/instant-premium/final-export-stage";
import { getRebuildAssemblyTrace } from "@/server/instant-premium/rebuild-assembly-trace";

export type ProjectPlaybackDebugPayload = {
  projectId: string;
  finalVideoUrl: string | null;
  selectedPlaybackUrl: string | null;
  selectedPlaybackSource: string;
  exportOutputVideoUrl: string | null;
  exportOutputVideoUrlRaw: string | null;
  latestExport: {
    id: string;
    status: string;
    progress: number;
    outputVideoUrl: string | null;
    updatedAt: string;
    createdAt: string;
  } | null;
  rebuildCount: number;
  rebuiltAt: string | null;
  previousFinalVideoUrl: string | null;
  previousFinalVideoUrlRaw: string | null;
  cacheBust: string;
  languageExports: Array<{
    id: string;
    languageCode: string;
    languageLabel: string;
    status: string;
    outputVideoUrl: string | null;
  }>;
  segmentTimeline: ReturnType<typeof buildAdminAssemblyTimeline>;
  latestRebuildStatus: string | null;
  exportTimeoutMs: number;
  activeExportStage: string | null;
  activeExportStageElapsedMs: number | null;
  activeFfmpegCommand: string | null;
  activeSegment: number | null;
  latestExportError: string | null;
  rebuildId: string | null;
  rebuildWorkspace: string | null;
  segmentHashes: string[];
  finalHash: string | null;
  previousFinalHash: string | null;
  identicalOutputDetected: boolean;
};

export async function getProjectPlaybackDebug(
  projectId: string
): Promise<ProjectPlaybackDebugPayload | null> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
      transitions: { orderBy: { order: "asc" } },
      languageExports: { orderBy: [{ languageCode: "asc" }, { version: "desc" }] },
    },
  });
  if (!project) {
    return null;
  }

  const latestExport = project.exports[0] ?? null;
  const exportPlaybackUrl = resolveLatestExportPlaybackUrl(project, latestExport);
  const picked = pickPlaybackUrl({
    detailExportUrl: exportPlaybackUrl,
    statusSnapshotUrl: exportPlaybackUrl,
    previousFinalVideoUrl: project.instantPreviousFinalVideoUrl,
  });

  const activeStage = getFinalExportStage(projectId);
  const rebuildTrace = getRebuildAssemblyTrace(projectId);
  const segmentTimeline = buildAdminAssemblyTimeline(
    buildFinalSegmentTransitionRows(
      project.transitions.map((t) => ({
        id: t.id,
        order: t.order,
        startImageId: t.startImageId,
        endImageId: t.endImageId,
        status: t.status,
        providerJobId: t.providerJobId,
        outputVideoUrl: t.outputVideoUrl,
      }))
    )
  );

  return {
    projectId: project.id,
    finalVideoUrl: exportPlaybackUrl,
    selectedPlaybackUrl: picked.url,
    selectedPlaybackSource: picked.source,
    exportOutputVideoUrl: exportPlaybackUrl,
    exportOutputVideoUrlRaw: latestExport?.outputVideoUrl?.trim() ?? null,
    latestExport: latestExport
      ? {
          id: latestExport.id,
          status: latestExport.status,
          progress: latestExport.progress,
          outputVideoUrl: exportPlaybackUrl,
          updatedAt: latestExport.updatedAt.toISOString(),
          createdAt: latestExport.createdAt.toISOString(),
        }
      : null,
    rebuildCount: project.instantFinalRebuildCount,
    rebuiltAt: project.instantFinalRebuiltAt?.toISOString() ?? null,
    previousFinalVideoUrl: project.instantPreviousFinalVideoUrl
      ? withFinalVideoCacheBust(
          project.instantPreviousFinalVideoUrl,
          Math.max(0, project.instantFinalRebuildCount - 1),
          project.instantFinalRebuiltAt
        )
      : null,
    previousFinalVideoUrlRaw: project.instantPreviousFinalVideoUrl?.trim() ?? null,
    cacheBust: buildPlaybackCacheKey(picked.url),
    languageExports: project.languageExports.map((row) => ({
      id: row.id,
      languageCode: row.languageCode,
      languageLabel: row.languageLabel,
      status: row.status,
      outputVideoUrl: row.outputVideoUrl?.trim() ?? null,
    })),
    segmentTimeline,
    latestRebuildStatus: project.instantFinalRebuildStatus,
    exportTimeoutMs: resolveExportTimeoutMs(),
    activeExportStage: activeStage?.stage ?? null,
    activeExportStageElapsedMs: activeStage?.startedAt
      ? Math.max(0, Date.now() - new Date(activeStage.startedAt).getTime())
      : null,
    activeFfmpegCommand: activeStage?.ffmpegCommand ?? null,
    activeSegment: activeStage?.activeSegment ?? null,
    latestExportError: latestExport?.errorMessage?.trim() ?? null,
    rebuildId: rebuildTrace?.rebuildId ?? null,
    rebuildWorkspace: rebuildTrace?.workspacePath ?? null,
    segmentHashes: rebuildTrace?.segmentHashes ?? [],
    finalHash: rebuildTrace?.finalOutputHash ?? null,
    previousFinalHash: rebuildTrace?.previousFinalHash ?? null,
    identicalOutputDetected: rebuildTrace?.identicalOutputDetected ?? false,
  };
}

export function rawExportUrlForDownload(
  project: {
    status: string;
    instantFinalRebuildCount: number;
    instantFinalRebuiltAt: Date | null;
    instantFinalRebuildStatus: string | null;
    instantPreviousFinalVideoUrl?: string | null;
  },
  exportRow: { status: string; outputVideoUrl: string | null } | null | undefined
): string | null {
  const raw = exportRow?.outputVideoUrl?.trim();
  if (!raw) {
    return null;
  }
  return resolveLatestExportPlaybackUrl(
    {
      status: project.status,
      instantFinalRebuildCount: project.instantFinalRebuildCount,
      instantFinalRebuiltAt: project.instantFinalRebuiltAt,
      instantPreviousFinalVideoUrl: project.instantPreviousFinalVideoUrl ?? null,
      instantFinalRebuildStatus: project.instantFinalRebuildStatus,
    },
    {
      id: "download",
      status: exportRow!.status,
      outputVideoUrl: raw,
      updatedAt: project.instantFinalRebuiltAt ?? new Date(),
    }
  );
}
