/**
 * Video analysis profile for uploaded MP4 workflows (metadata heuristics).
 */

import type { VideoAnalysisProfile } from "@/types/studio-video-production";

export function analyzeVideoUploadMetadata(params: {
  fileName?: string;
  fileSizeBytes: number;
  mimeType?: string;
  durationSecondsHint?: number;
}): VideoAnalysisProfile {
  const durationSeconds =
    params.durationSecondsHint ??
    Math.max(10, Math.min(600, Math.round(params.fileSizeBytes / (1024 * 1024) * 8)));

  const estimatedSceneCount = Math.max(1, Math.ceil(durationSeconds / 15));
  const estimatedCutCount = Math.max(0, estimatedSceneCount - 1);
  const estimatedSpeakerCount = durationSeconds > 120 ? 2 : 1;

  return {
    durationSeconds,
    width: null,
    height: null,
    frameRate: null,
    hasSpeech: /\.(mp4|mov|webm)$/i.test(params.fileName ?? "") || Boolean(params.mimeType?.includes("video")),
    hasMusic: true,
    hasSubtitles: false,
    estimatedSceneCount,
    estimatedCutCount,
    estimatedSpeakerCount,
    analyzedAt: new Date().toISOString(),
  };
}
