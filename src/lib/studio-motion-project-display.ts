/**
 * Derive playback / progress state for linked Motion projects inside Studio.
 */

import { buildMotionVersionCatalogForProject } from "@/lib/motion-version-catalog";
import { resolveProjectVideoDisplayState } from "@/lib/render-output-lineage";
import { projectUsesStoryOverlay } from "@/lib/story-language-export";
import type {
  AnimationProjectDetailResponse,
  InstantPremiumStatusResponse,
} from "@/types/animation-api";

export function resolveMotionProjectFinalVideoUrl(
  detail: AnimationProjectDetailResponse | null
): string | null {
  if (!detail?.exports?.length) {
    return null;
  }
  const withUrl = detail.exports.find((entry) => entry.outputVideoUrl?.trim());
  const url = withUrl?.outputVideoUrl?.trim() ?? null;
  if (!url) {
    return null;
  }
  if (detail.status === "completed" || withUrl?.status === "completed") {
    return url;
  }
  return null;
}

export function isInstantLikeMotionProject(detail: AnimationProjectDetailResponse | null): boolean {
  if (!detail) {
    return false;
  }
  return Boolean(
    detail.projectType === "instant_premium" ||
      detail.stylePreset === "food_promo" ||
      detail.stylePreset === "clean_business" ||
      detail.stylePreset === "social_boost" ||
      detail.instantOutputDurationSeconds != null ||
      detail.instantSelectedChips != null ||
      (detail.instantUserIntent?.trim().length ?? 0) > 0
  );
}

export function motionProjectAllClipsDone(detail: AnimationProjectDetailResponse | null): boolean {
  if (!detail?.transitions.length) {
    return false;
  }
  return detail.transitions.every(
    (row) => row.status === "completed" && Boolean(row.outputVideoUrl?.trim())
  );
}

export function shouldPollStudioMotionStatus(
  detail: AnimationProjectDetailResponse | null,
  extraBusy = false
): boolean {
  if (!detail) {
    return false;
  }
  if (extraBusy) {
    return true;
  }
  if (detail.status === "rendering" || detail.status === "generating") {
    return true;
  }
  const finalUrl = resolveMotionProjectFinalVideoUrl(detail);
  if (isInstantLikeMotionProject(detail) && motionProjectAllClipsDone(detail) && !finalUrl) {
    return true;
  }
  const latestExport = detail.exports?.[0];
  if (
    isInstantLikeMotionProject(detail) &&
    motionProjectAllClipsDone(detail) &&
    (!finalUrl || latestExport?.status === "rendering")
  ) {
    return true;
  }
  return Boolean(finalUrl);
}

export function resolveStudioMotionVideoState(params: {
  detail: AnimationProjectDetailResponse;
  snapshot: InstantPremiumStatusResponse | null;
}) {
  const { detail, snapshot } = params;
  const exportFinalUrl = resolveMotionProjectFinalVideoUrl(detail);
  const finalVideoUrl = snapshot?.finalVideoUrl?.trim() || exportFinalUrl;
  const latestExport = detail.exports?.[0] ?? null;
  const videoDisplay = resolveProjectVideoDisplayState({
    projectStatus: detail.status,
    exportOutputUrl: exportFinalUrl,
    exportStatus: latestExport?.status ?? null,
    projectCleanUrl: detail.instantCleanFinalVideoUrl ?? null,
    previousFinalVideoUrl: detail.instantPreviousFinalVideoUrl ?? null,
    renderVersions: (detail.renderVersions ?? []).map((row) => ({
      renderVersionNumber: row.renderVersionNumber,
      status: row.status,
      isDefault: row.isDefault,
      finalVideoUrl: row.finalVideoUrl,
      cleanVideoUrl: row.cleanVideoUrl,
    })),
    auditJson: detail.instantFinalRebuildAuditJson,
  });
  const playbackFinalUrl =
    videoDisplay.finalIsArchivedFallback && videoDisplay.primaryFinalUrl ?
      videoDisplay.primaryFinalUrl
    : finalVideoUrl;
  const motionCatalog =
    detail.bundleCatalog ??
    buildMotionVersionCatalogForProject({
      projectId: detail.id,
      title: detail.title ?? null,
      exportOutputUrl: playbackFinalUrl,
      exportStatus: latestExport?.status ?? null,
      projectStatus: detail.status,
      projectCleanUrl: videoDisplay.cleanUrl,
      thumbnailUrl: detail.images?.[0]?.previewUrl ?? null,
      renderVersions: (detail.renderVersions ?? []).map((row) => ({
        id: row.id,
        renderVersionNumber: row.renderVersionNumber,
        status: row.status,
        isDefault: row.isDefault,
        versionNote: row.versionNote,
        finalVideoUrl: row.finalVideoUrl,
        cleanVideoUrl: row.cleanVideoUrl,
        createdAt: row.createdAt,
      })),
      languageExports: (detail.languageExports ?? []).map((row) => ({
        id: row.id,
        languageCode: row.languageCode,
        languageLabel: row.languageLabel,
        status: row.status,
        outputVideoUrl: row.outputVideoUrl,
        sourceCleanVideoUrl: row.sourceCleanVideoUrl ?? null,
        version: row.version,
        isDefault: row.isDefault,
        versionNote: row.versionNote ?? null,
        createdAt: row.createdAt,
      })),
    });

  return {
    finalVideoUrl: playbackFinalUrl,
    cleanVideoUrl: videoDisplay.cleanUrl,
    usesStoryOverlay: projectUsesStoryOverlay({
      instantMode: detail.instantMode ?? "",
      instantSceneTexts: detail.instantSceneTexts,
    }),
    videoDisplay,
    motionCatalog,
    latestExport,
    hasCompletedFinal: Boolean(playbackFinalUrl),
  };
}
