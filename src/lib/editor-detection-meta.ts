import type { EditorDetectApiResponse } from "@/lib/editor-vision-v3-client";
import type { EditorDetectionMeta } from "@/types/homecheff-visual-editor";

export function buildEditorDetectionMeta(input: {
  detection: EditorDetectApiResponse;
  source: EditorDetectionMeta["source"];
  objectCount: number;
  bootstrapAttempted?: boolean;
}): EditorDetectionMeta {
  const { detection, source, objectCount } = input;
  const status = detection.status ?? (detection.failed ? "unavailable" : "active");
  const workerActive = detection.backend === "video-worker" && !detection.failed;

  let userMessageKey: string | undefined;
  if (status === "unavailable") {
    userMessageKey = "editor.detectionStatus.unavailable";
  } else if (status === "fallback" || (detection.failed && objectCount > 0)) {
    userMessageKey = "editor.detectionStatus.visionFallback";
  } else if (objectCount === 0) {
    userMessageKey = "editor.detectionBootstrap.noObjects";
  }

  return {
    source,
    backend: detection.backend,
    status,
    count: objectCount,
    onnxAvailable: workerActive || (detection.available && detection.backend !== "fallback"),
    detectorKind: detection.detectorKind,
    bootstrapAttempted: input.bootstrapAttempted ?? true,
    inferenceMs: detection.inferenceMs,
    lastDetectedAt: detection.detectedAt,
    noObjectsFound: objectCount === 0,
    userMessageKey,
  };
}

export function detectionUsedVisionFallback(detection: EditorDetectApiResponse): boolean {
  return (
    detection.status === "fallback" ||
    detection.status === "unavailable" ||
    Boolean(detection.failed && detection.backend !== "video-worker")
  );
}
