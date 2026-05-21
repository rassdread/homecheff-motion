import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { discardExportChainForProject } from "@/server/animation-export/service";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForViewer } from "@/server/animation-projects/queries";
import { resolvePublicFinalVideoUrl } from "@/lib/final-video-storage";
import {
  buildPlaybackCacheKey,
  pickPlaybackUrl,
  resolveLatestExportPlaybackUrl,
} from "@/lib/playback-url-resolution";
import { getProjectPlaybackDebug } from "@/server/instant-premium/playback-debug";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function mapToDetailResponse(
  project: NonNullable<Awaited<ReturnType<typeof getAnimationProjectByIdForViewer>>>,
  viewerRole: string
): AnimationProjectDetailResponse {
  const ownerRecord =
    "owner" in project && project.owner && typeof project.owner === "object" && "email" in project.owner
      ? (project.owner as { email: string })
      : null;
  const ownerEmail = viewerRole === "admin" && ownerRecord ? ownerRecord.email : undefined;
  const latestExportRow = project.exports[0] ?? null;
  const exportPlaybackUrl = resolveLatestExportPlaybackUrl(project, latestExportRow);
  const picked = pickPlaybackUrl({
    detailExportUrl: exportPlaybackUrl,
    statusSnapshotUrl: exportPlaybackUrl,
    previousFinalVideoUrl: project.instantPreviousFinalVideoUrl,
  });

  return {
    id: project.id,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    advancedSettingsEnabled: project.advancedSettingsEnabled,
    images: project.images.map((img) => ({
      id: img.id,
      order: img.order,
      fileName: img.fileName,
      previewUrl: img.previewUrl,
    })),
    transitions: project.transitions.map((t) => ({
      id: t.id,
      order: t.order,
      startImageId: t.startImageId,
      endImageId: t.endImageId,
      status: t.status,
      progress: t.progress,
      outputVideoUrl: t.outputVideoUrl,
      errorMessage: t.errorMessage,
    })),
    exports: project.exports.map((e) => ({
      status: e.status,
      progress: e.progress,
      provider: e.provider,
      providerJobId: e.providerJobId,
      outputVideoUrl: resolvePublicFinalVideoUrl({
        outputVideoUrl: e.outputVideoUrl,
        exportStatus: e.status,
        projectStatus: project.status,
        rebuildStatus: project.instantFinalRebuildStatus,
        rebuildCount: project.instantFinalRebuildCount,
        rebuiltAt: project.instantFinalRebuiltAt,
      }),
      errorMessage: e.errorMessage,
    })),
    intent: project.intent,
    presetId: project.presetId,
    viduModel: project.viduModel,
    viduResolution: project.viduResolution,
    viduDurationSeconds: project.viduDurationSeconds,
    estimatedCredits: project.estimatedCredits,
    userPrompt: project.userPrompt,
    projectType: project.projectType,
    stylePreset: project.stylePreset,
    instantOutputDurationSeconds: project.instantOutputDurationSeconds,
    instantSelectedChips: project.instantSelectedChips,
    instantUserIntent: project.instantUserIntent,
    ownerEmail,
    instantFinalRebuildCount: project.instantFinalRebuildCount,
    instantFinalRebuiltAt: project.instantFinalRebuiltAt?.toISOString() ?? null,
    instantPreviousFinalVideoUrl: project.instantPreviousFinalVideoUrl,
    latestExportId: latestExportRow?.id ?? null,
    latestExportUpdatedAt: latestExportRow?.updatedAt.toISOString() ?? null,
    languageExports: project.languageExports.map((row) => ({
      id: row.id,
      languageCode: row.languageCode,
      languageLabel: row.languageLabel,
      status: row.status,
      outputVideoUrl: row.outputVideoUrl,
      sourceFinalVideoUrl: row.sourceFinalVideoUrl,
      textLayerJson: row.textLayerJson,
      translationProvider: row.translationProvider,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
    })),
    playback: {
      finalVideoUrl: exportPlaybackUrl,
      selectedPlaybackUrl: picked.url,
      selectedPlaybackSource: picked.source,
      exportOutputVideoUrl: exportPlaybackUrl,
      exportOutputVideoUrlRaw: latestExportRow?.outputVideoUrl?.trim() ?? null,
      latestExport: latestExportRow
        ? {
            id: latestExportRow.id,
            status: latestExportRow.status,
            progress: latestExportRow.progress,
            outputVideoUrl: exportPlaybackUrl,
            updatedAt: latestExportRow.updatedAt.toISOString(),
            createdAt: latestExportRow.createdAt.toISOString(),
          }
        : null,
      rebuildCount: project.instantFinalRebuildCount,
      rebuiltAt: project.instantFinalRebuiltAt?.toISOString() ?? null,
      previousFinalVideoUrl: project.instantPreviousFinalVideoUrl
        ? resolveLatestExportPlaybackUrl(
            {
              status: project.status,
              instantFinalRebuildCount: Math.max(0, project.instantFinalRebuildCount - 1),
              instantFinalRebuiltAt: project.instantFinalRebuiltAt,
              instantPreviousFinalVideoUrl: null,
              instantFinalRebuildStatus: project.instantFinalRebuildStatus,
            },
            {
              id: "prev",
              status: "completed",
              outputVideoUrl: project.instantPreviousFinalVideoUrl,
              updatedAt: project.instantFinalRebuiltAt ?? project.updatedAt,
            }
          )
        : null,
      previousFinalVideoUrlRaw: project.instantPreviousFinalVideoUrl?.trim() ?? null,
      cacheBust: buildPlaybackCacheKey(picked.url),
    },
  };
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const project = await getAnimationProjectByIdForViewer(id, user);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const body = mapToDetailResponse(project, user.role);
  if (user.role === "admin") {
    const debug = await getProjectPlaybackDebug(id);
    if (debug) {
      body.playback = {
        finalVideoUrl: debug.finalVideoUrl,
        selectedPlaybackUrl: debug.selectedPlaybackUrl,
        selectedPlaybackSource: debug.selectedPlaybackSource,
        exportOutputVideoUrl: debug.exportOutputVideoUrl,
        exportOutputVideoUrlRaw: debug.exportOutputVideoUrlRaw,
        latestExport: debug.latestExport,
        rebuildCount: debug.rebuildCount,
        rebuiltAt: debug.rebuiltAt,
        previousFinalVideoUrl: debug.previousFinalVideoUrl,
        previousFinalVideoUrlRaw: debug.previousFinalVideoUrlRaw,
        cacheBust: debug.cacheBust,
        latestRebuildStatus: debug.latestRebuildStatus,
        exportTimeoutMs: debug.exportTimeoutMs,
        activeExportStage: debug.activeExportStage,
        activeExportStageElapsedMs: debug.activeExportStageElapsedMs,
        activeFfmpegCommand: debug.activeFfmpegCommand,
        activeSegment: debug.activeSegment,
        latestExportError: debug.latestExportError,
        rebuildId: debug.rebuildId,
        rebuildWorkspace: debug.rebuildWorkspace,
        segmentHashes: debug.segmentHashes,
        finalHash: debug.finalHash,
        previousFinalHash: debug.previousFinalHash,
        identicalOutputDetected: debug.identicalOutputDetected,
      };
    }
  }
  return NextResponse.json(body, { status: 200 });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const existing = await getAnimationProjectByIdForViewer(id, user);
  if (!existing) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    discardExportChainForProject(id);
    await prisma.animationProject.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
