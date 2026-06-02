/**
 * Safe Zone V3 — local MediaPipe detection (optional, feature-flagged).
 * Runs on the existing scene midpoint sample frame only. Fail-open on any error.
 */

import fs from "node:fs/promises";
import {
  DETECTOR_TIMEOUT_MS,
  isMediaPipeSafeZonesEnabled,
} from "@/server/animation-export/local-vision/feature-flags";
import { importOptionalModule } from "@/server/animation-export/local-vision/optional-import";
import { ensureMediaPipeNodeRuntime } from "@/server/animation-export/local-vision/mediapipe-node-runtime";
import { loadMediaPipeImageSource } from "@/server/animation-export/local-vision/mediapipe-image";
import {
  resolveMediaPipeModelDir,
  resolveMediaPipeModelPath,
  resolveMediaPipeWasmDir,
} from "@/server/animation-export/local-vision/vision-model-paths";
import type {
  MediaPipeDetection,
  MediaPipeDetectionResult,
  NormalizedBox,
} from "@/server/animation-export/local-vision/types";

const CONFIDENCE_THRESHOLD = 0.35;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("MediaPipe detection timed out")), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function normalizeBox(
  originX: number,
  originY: number,
  width: number,
  height: number,
  frameW: number,
  frameH: number
): NormalizedBox {
  const fw = Math.max(1, frameW);
  const fh = Math.max(1, frameH);
  return {
    x: clamp01(originX / fw),
    y: clamp01(originY / fh),
    width: clamp01(width / fw),
    height: clamp01(height / fh),
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function mapCategoryToType(categoryName: string): MediaPipeDetection["type"] | null {
  const lower = categoryName.toLowerCase();
  if (lower.includes("face")) {
    return "face";
  }
  if (lower.includes("hand")) {
    return "hand";
  }
  if (lower.includes("person") || lower === "human") {
    return "person";
  }
  if (lower.includes("body") || lower.includes("torso")) {
    return "body";
  }
  return null;
}

async function runMediaPipeDetection(imagePath: string): Promise<MediaPipeDetectionResult> {
  const modelDir = resolveMediaPipeModelDir();
  const faceModel = resolveMediaPipeModelPath("blaze_face_short_range.tflite");
  const poseModel = resolveMediaPipeModelPath("pose_landmarker_lite.task");
  const handModel = resolveMediaPipeModelPath("hand_landmarker.task");

  const hasFace = await fs.access(faceModel).then(() => true).catch(() => false);
  const hasPose = await fs.access(poseModel).then(() => true).catch(() => false);
  const hasHand = await fs.access(handModel).then(() => true).catch(() => false);

  if (!hasFace && !hasPose && !hasHand) {
    return {
      detections: [],
      failed: true,
      error: `MediaPipe models not found in ${modelDir}`,
    };
  }

  ensureMediaPipeNodeRuntime();

  const vision = await importOptionalModule<typeof import("@mediapipe/tasks-vision")>(
    "@mediapipe/tasks-vision"
  );
  if (!vision) {
    return {
      detections: [],
      failed: true,
      error: "MediaPipe package not installed",
    };
  }

  const { FilesetResolver, FaceDetector, PoseLandmarker, HandLandmarker } = vision;

  const wasmPath = resolveMediaPipeWasmDir();
  const fileset = await FilesetResolver.forVisionTasks(wasmPath);

  const imageSource = await loadMediaPipeImageSource(imagePath);
  const frameW = imageSource.width;
  const frameH = imageSource.height;

  const detections: MediaPipeDetection[] = [];

  if (hasFace) {
    const faceDetector = await FaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: faceModel, delegate: "CPU" },
      runningMode: "IMAGE",
      minDetectionConfidence: 0.5,
    });
    const result = faceDetector.detect(imageSource);
    for (const det of result.detections) {
      const box = det.boundingBox;
      if (!box) {
        continue;
      }
      detections.push({
        type: "face",
        confidence: det.categories?.[0]?.score ?? 0.5,
        box: normalizeBox(box.originX, box.originY, box.width, box.height, frameW, frameH),
      });
    }
    faceDetector.close();
  }

  if (hasPose) {
    const poseLandmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: poseModel, delegate: "CPU" },
      runningMode: "IMAGE",
      numPoses: 2,
      minPoseDetectionConfidence: 0.5,
    });
    const result = poseLandmarker.detect(imageSource);
    for (const det of result.detections) {
      const box = det.boundingBox;
      if (!box) {
        continue;
      }
      const cat = det.categories?.[0]?.categoryName ?? "person";
      const mapped = mapCategoryToType(cat) ?? "person";
      detections.push({
        type: mapped === "face" ? "person" : mapped,
        confidence: det.categories?.[0]?.score ?? 0.5,
        box: normalizeBox(box.originX, box.originY, box.width, box.height, frameW, frameH),
      });
    }
    poseLandmarker.close();
  }

  if (hasHand) {
    const handLandmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: handModel, delegate: "CPU" },
      runningMode: "IMAGE",
      numHands: 4,
      minHandDetectionConfidence: 0.5,
    });
    const result = handLandmarker.detect(imageSource);
    for (const det of result.detections) {
      const box = det.boundingBox;
      if (!box) {
        continue;
      }
      detections.push({
        type: "hand",
        confidence: det.categories?.[0]?.score ?? 0.5,
        box: normalizeBox(box.originX, box.originY, box.width, box.height, frameW, frameH),
      });
    }
    handLandmarker.close();
  }

  return { detections };
}

/** Detect faces, people, hands on a sample frame. Fail-open on any error. */
export async function detectWithMediaPipe(imagePath: string): Promise<MediaPipeDetectionResult> {
  if (!isMediaPipeSafeZonesEnabled()) {
    return { detections: [] };
  }

  try {
    return await withTimeout(runMediaPipeDetection(imagePath), DETECTOR_TIMEOUT_MS);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { detections: [], failed: true, error: message };
  }
}
