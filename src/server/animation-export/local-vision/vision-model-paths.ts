/** Canonical local vision model paths (MediaPipe). */

import path from "node:path";

export const MEDIAPIPE_MODEL_FILES = [
  "blaze_face_short_range.tflite",
  "pose_landmarker_lite.task",
  "hand_landmarker.task",
] as const;

export type MediaPipeModelFile = (typeof MEDIAPIPE_MODEL_FILES)[number];

/** Official Google MediaPipe model CDN (Apache 2.0). Setup-time download only. */
export const MEDIAPIPE_MODEL_URLS: Record<MediaPipeModelFile, string> = {
  "blaze_face_short_range.tflite":
    "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
  "pose_landmarker_lite.task":
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  "hand_landmarker.task":
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
};

export function resolveMediaPipeModelDir(): string {
  return process.env.HC_MEDIAPIPE_MODEL_DIR?.trim() || path.join(process.cwd(), "models", "mediapipe");
}

export function resolveMediaPipeModelPath(filename: MediaPipeModelFile): string {
  return path.join(resolveMediaPipeModelDir(), filename);
}

export function resolveMediaPipeWasmDir(): string {
  return path.join(process.cwd(), "node_modules", "@mediapipe", "tasks-vision", "wasm");
}
