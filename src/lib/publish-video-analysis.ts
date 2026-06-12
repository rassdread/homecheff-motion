import type { PublishSafeZoneId } from "@/lib/publish-safe-zone-v2";
import {
  pickBestSafeZone,
  resolvePublishOrientation,
  resolveSafeZonesForOrientation,
  scoreSafeZones,
} from "@/lib/publish-safe-zone-v2";
import type { PublishVisionActivation } from "@/lib/vision-activation";
import { resolvePublishVisionActivation } from "@/lib/vision-activation";

export type PublishVideoAnalysisResult = {
  sampledFrames: number;
  occupiedZones: PublishSafeZoneId[];
  detectedLabels: string[];
  recommendations: PublishSafeZoneId[];
  scannedAt: string;
  visionMode: "heuristic" | "vision-enhanced";
  visionNotes: string[];
};

/** Heuristic analysis with optional vision activation hints (OCR / object detection configured). */
export function analyzePublishVideoFrames(input: {
  durationSec: number;
  aspectRatio?: number;
  hasExistingText?: boolean;
  vision?: PublishVisionActivation;
}): PublishVideoAnalysisResult {
  const vision = input.vision ?? resolvePublishVisionActivation();
  const visionNotes: string[] = [];
  const orientation = resolvePublishOrientation(input.aspectRatio ?? 9 / 16);
  const sampleCount = Math.min(5, Math.max(1, Math.ceil(input.durationSec / 3)));
  const occupied: PublishSafeZoneId[] = [];

  if (orientation === "portrait") {
    occupied.push("middle_upper_left", "middle_upper_right", "middle_lower_left", "middle_lower_right");
  } else {
    occupied.push("top_center_left", "top_center_right");
  }
  if (input.hasExistingText || vision.ocrActive) {
    occupied.push("bottom_left", "bottom_right");
    if (vision.ocrActive) {
      visionNotes.push(`OCR active (${vision.ocrProvider}) — avoiding lower-third text bands.`);
    }
  }
  if (vision.objectDetectionReady) {
    occupied.push("middle_upper_left", "middle_upper_right");
    visionNotes.push("Object detection enabled — center-upper subject zones marked occupied.");
  }

  const heatmap = scoreSafeZones({ orientation, occupiedZones: occupied });
  const recommendations = resolveSafeZonesForOrientation(orientation)
    .filter((zone) => (heatmap[zone] ?? 0) > 0)
    .sort((a, b) => (heatmap[b] ?? 0) - (heatmap[a] ?? 0));
  const best = pickBestSafeZone(heatmap);
  if (best.zone && !recommendations.includes(best.zone)) {
    recommendations.unshift(best.zone);
  }

  const detectedLabels = [
    vision.objectDetectionReady ? "subject_detected" : "subject_center_heuristic",
    vision.ocrActive ? "ocr_text_avoidance" : input.hasExistingText ? "existing_text" : "clean_lower_third",
  ];

  return {
    sampledFrames: sampleCount,
    occupiedZones: [...new Set(occupied)],
    detectedLabels,
    recommendations,
    scannedAt: new Date().toISOString(),
    visionMode: vision.safeZoneMode === "vision" ? "vision-enhanced" : "heuristic",
    visionNotes:
      visionNotes.length > 0
        ? visionNotes
        : ["Heuristic safe zones — enable OCR keys and HC_ENABLE_OBJECT_SAFE_ZONES on worker for vision-enhanced placement."],
  };
}
