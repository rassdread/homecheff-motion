import { resolveObjectDetections } from "@/lib/vision/unified-detection-client";
import type { UnifiedDetectionResult } from "@/lib/vision/unified-detection-types";

export type EditorOnnxDetectionResult = UnifiedDetectionResult;

export async function detectEditorObjectsFromImageUrl(
  imageUrl: string
): Promise<EditorOnnxDetectionResult> {
  return resolveObjectDetections({
    imageUrl,
    consumer: "editor",
  });
}
