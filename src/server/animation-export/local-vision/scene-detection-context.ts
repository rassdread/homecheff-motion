/**
 * Safe Zone V3–V4 — merged detection context per scene sample frame.
 * Safe Zone V1 always runs; MediaPipe/object detector only when feature-flagged.
 */

import type { SafeZoneAnalysis } from "@/server/animation-export/safe-zone-placement";
import { analyzeSafeZonesFromImage } from "@/server/animation-export/safe-zone-placement";
import { detectWithMediaPipe } from "@/server/animation-export/local-vision/mediapipe-detector";
import { detectWithObjectDetector } from "@/server/animation-export/local-vision/object-detector";
import type {
  AvoidBox,
  MediaPipeDetection,
  ObjectDetection,
} from "@/server/animation-export/local-vision/types";

export type SceneDetectionContext = {
  safeZoneV1: SafeZoneAnalysis;
  mediaPipeDetections: MediaPipeDetection[];
  objectDetections: ObjectDetection[];
  combinedAvoidBoxes: AvoidBox[];
  objectLabels: string[];
  failedDetectors: string[];
};

const sceneContextCache = new Map<string, SceneDetectionContext>();

function cacheKey(sampleFramePath: string): string {
  return sampleFramePath;
}

function buildAvoidBoxes(
  mediaPipe: MediaPipeDetection[],
  objects: ObjectDetection[]
): { boxes: AvoidBox[]; labels: string[] } {
  const boxes: AvoidBox[] = [];
  const labels: string[] = [];

  for (const det of mediaPipe) {
    boxes.push({
      ...det.box,
      source: "mediapipe",
      label: det.type,
      confidence: det.confidence,
    });
    labels.push(det.type);
  }

  for (const det of objects) {
    boxes.push({
      ...det.box,
      source: "object",
      label: det.label,
      confidence: det.confidence,
    });
    labels.push(det.label);
  }

  return { boxes, labels: [...new Set(labels)] };
}

/**
 * Build merged detection context for one scene sample frame.
 * Cached per path; detector failures never throw.
 */
export async function buildSceneDetectionContext(
  sampleFramePath: string,
  precomputedV1?: SafeZoneAnalysis
): Promise<SceneDetectionContext> {
  const key = cacheKey(sampleFramePath);
  const cached = sceneContextCache.get(key);
  if (cached) {
    return cached;
  }

  const safeZoneV1 = precomputedV1 ?? (await analyzeSafeZonesFromImage(sampleFramePath));
  const failedDetectors: string[] = [];

  const [mediaPipeResult, objectResult] = await Promise.all([
    detectWithMediaPipe(sampleFramePath),
    detectWithObjectDetector(sampleFramePath),
  ]);

  if (mediaPipeResult.failed) {
    failedDetectors.push(`mediapipe:${mediaPipeResult.error ?? "unknown"}`);
  }
  if (objectResult.failed) {
    failedDetectors.push(`object:${objectResult.error ?? "unknown"}`);
  }

  const { boxes, labels } = buildAvoidBoxes(
    mediaPipeResult.detections,
    objectResult.detections
  );

  const context: SceneDetectionContext = {
    safeZoneV1,
    mediaPipeDetections: mediaPipeResult.detections,
    objectDetections: objectResult.detections,
    combinedAvoidBoxes: boxes,
    objectLabels: labels,
    failedDetectors,
  };

  sceneContextCache.set(key, context);
  return context;
}

/** Clear in-memory cache (for tests). */
export function clearSceneDetectionContextCache(): void {
  sceneContextCache.clear();
}
