import type { AnimationPresetId } from "@/lib/animation-presets";
import { getAnimationPreset, validateAnimationPresetId } from "@/lib/animation-presets";
import { getTotalVideoDurationSeconds } from "@/lib/animation-duration";
import type { AnimationProjectListItem } from "@/types/animation-api";

export type GalleryListPrismaRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  projectType?: string | null;
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
};

export function mapPrismaRowToAnimationProjectListItem(
  row: GalleryListPrismaRow,
  options: { includeOwnerEmail: boolean }
): AnimationProjectListItem {
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

  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    status: row.status,
    projectType: row.projectType ?? "classic",
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
          status: latest.status,
          progress: latest.progress,
          outputVideoUrl: latest.outputVideoUrl,
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
