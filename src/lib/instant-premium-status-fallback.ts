import type { InstantPremiumStatusResponse } from "@/types/animation-api";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

/** Build progress snapshot from gallery project detail when status API is unavailable. */
export function instantStatusFromProjectDetail(
  projectId: string,
  detail: AnimationProjectDetailResponse
): InstantPremiumStatusResponse | null {
  const latestExport = detail.exports[0];
  const finalVideoUrl =
    latestExport?.status === "completed" && latestExport.outputVideoUrl?.trim()
      ? latestExport.outputVideoUrl.trim()
      : null;

  if (!finalVideoUrl && detail.status !== "completed") {
    return null;
  }

  const segmentDuration = detail.viduDurationSeconds ?? null;
  const segments = detail.transitions.map((t) => ({
    index: t.order,
    status:
      t.status === "completed"
        ? ("completed" as const)
        : t.status === "failed"
          ? ("failed" as const)
          : t.status === "generating" || t.status === "rendering"
            ? ("generating" as const)
            : ("queued" as const),
    sourceImageId: t.startImageId,
    sourceImageUrl:
      detail.images.find((img) => img.id === t.startImageId)?.previewUrl ?? null,
    videoUrl: t.outputVideoUrl,
    durationSeconds: segmentDuration,
    providerTaskId: null,
    error: t.errorMessage,
  }));

  const completed = Boolean(finalVideoUrl) || detail.status === "completed";

  return {
    projectId,
    projectType: "instant_premium",
    status: completed ? "completed" : detail.status === "failed" ? "failed" : "running",
    phase: completed ? "completed" : detail.status === "failed" ? "failed" : "merging_clips",
    progressPercent: completed ? 100 : 70,
    segments,
    finalVideoUrl,
    finalDurationSeconds:
      segments.length > 0 && segmentDuration ? segments.length * segmentDuration : null,
    downloadable: Boolean(finalVideoUrl),
    errorMessage: latestExport?.errorMessage ?? null,
    lockedTextMode: true,
    overlayFailed: detail.status === "failed_overlay",
    canRetryOverlay: false,
    failureReason: null,
    workerJobStatus: null,
  };
}
