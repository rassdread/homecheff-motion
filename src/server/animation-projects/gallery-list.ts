import type { AnimationPresetId } from "@/lib/animation-presets";
import { getAnimationPreset, validateAnimationPresetId } from "@/lib/animation-presets";
import { getTotalVideoDurationSeconds } from "@/lib/animation-duration";
import { resolvePublicFinalVideoUrl } from "@/lib/final-video-storage";
import { normalizeGalleryRebuildMeta } from "@/server/animation-projects/gallery-list-rebuild-meta";
import { resolveProjectDisplayStatus } from "@/lib/project-display-status";
import type { AnimationProjectListItem } from "@/types/animation-api";

export type GalleryListPrismaRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  projectType?: string | null;
  instantOutputDurationSeconds?: number | null;
  instantSelectedChips?: unknown;
  instantUserIntent?: string | null;
  stylePreset?: string | null;
  presetId: string;
  intent: string | null;
  advancedSettingsEnabled: boolean;
  viduResolution: string | null;
  viduDurationSeconds: number | null;
  estimatedCredits: number | null;
  images: { previewUrl: string | null }[];
  _count: { images: number; transitions: number };
  exports: {
    status: string;
    progress: number;
    outputVideoUrl: string | null;
    errorMessage: string | null;
  }[];
  transitions: { status: string; outputVideoUrl: string | null }[];
  owner?: { email: string } | null;
  instantFinalRebuildCount?: number;
  instantFinalRebuiltAt?: Date | null;
  instantFinalRebuildStatus?: string | null;
};

export function mapPrismaRowToAnimationProjectListItem(
  row: GalleryListPrismaRow,
  options: { includeOwnerEmail: boolean }
): AnimationProjectListItem {
  try {
    return mapPrismaRowToAnimationProjectListItemInner(row, options);
  } catch (error) {
    console.error("[gallery-list]", {
      phase: "mapRowFailed",
      projectId: row?.id ?? "unknown",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function mapPrismaRowToAnimationProjectListItemInner(
  row: GalleryListPrismaRow,
  options: { includeOwnerEmail: boolean }
): AnimationProjectListItem {
  const rebuildMeta = normalizeGalleryRebuildMeta(row);
  const isInstantLike =
    row.projectType === "instant_premium" ||
    row.stylePreset === "food_promo" ||
    row.stylePreset === "clean_business" ||
    row.stylePreset === "social_boost" ||
    row.instantOutputDurationSeconds != null ||
    row.instantSelectedChips != null ||
    (row.instantUserIntent?.trim().length ?? 0) > 0;
  const presetId = validateAnimationPresetId(row.presetId)
    ? row.presetId
    : ("standard" as AnimationPresetId);
  const preset = getAnimationPreset(presetId);
  const secondsPerTransition =
    row.advancedSettingsEnabled && row.viduDurationSeconds != null && row.viduDurationSeconds > 0
      ? row.viduDurationSeconds
      : preset.durationSeconds;

  const imageCount = row._count.images;
  const transitionCount = row._count.transitions;
  const thumb = row.images[0]?.previewUrl?.trim() || null;

  const latest = row.exports[0] ?? null;
  const transitions = row.transitions ?? [];
  const firstDone = transitions.find(
    (tr) => String(tr.status).toLowerCase() === "completed" && tr.outputVideoUrl?.trim()
  );
  const firstTransitionVideoUrl = firstDone?.outputVideoUrl?.trim() ?? null;
  const allTransitionsCompleted =
    transitionCount > 0 &&
    transitions.length === transitionCount &&
    transitions.every(
      (tr) =>
        String(tr.status).toLowerCase() === "completed" && Boolean(tr.outputVideoUrl?.trim())
    );

  const resolvedExportUrl = latest
    ? resolvePublicFinalVideoUrl({
        outputVideoUrl: latest.outputVideoUrl,
        exportStatus: latest.status,
        projectStatus: row.status,
        rebuildStatus: rebuildMeta.rebuildStatus,
        rebuildCount: rebuildMeta.rebuildCount,
        rebuiltAt: rebuildMeta.rebuiltAt,
      })
    : null;

  const displayStatus = resolveProjectDisplayStatus({
    projectStatus: row.status,
    exportStatus: latest?.status,
    outputVideoUrl: resolvedExportUrl ?? latest?.outputVideoUrl,
  });

  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    status: displayStatus,
    projectType: isInstantLike ? "instant_premium" : "classic",
    presetId: row.presetId,
    intent: row.intent,
    advancedSettingsEnabled: row.advancedSettingsEnabled,
    viduResolution: row.viduResolution,
    viduDurationSeconds: row.viduDurationSeconds,
    estimatedCredits: row.estimatedCredits,
    estimatedTotalDurationSeconds: getTotalVideoDurationSeconds(imageCount, secondsPerTransition),
    imageCount,
    transitionCount,
    latestExport: latest
      ? {
          status: displayStatus === "completed" ? "completed" : latest.status,
          progress: latest.progress,
          outputVideoUrl: resolvedExportUrl,
          errorMessage: latest.errorMessage,
        }
      : null,
    thumbnailUrl: thumb,
    thumbnailFallbackUrl: thumb,
    firstTransitionVideoUrl,
    allTransitionsCompleted,
    ownerEmail:
      options.includeOwnerEmail && row.owner?.email ? row.owner.email : undefined,
  };
}
