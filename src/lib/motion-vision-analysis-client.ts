import { detectEditorObjectsApi } from "@/lib/editor-vision-v3-client";
import {
  buildMotionReferenceVisionSignals,
  type MotionReferenceVisionSignals,
} from "@/lib/motion-reference-vision-signals";
import type { MotionUploadedReference } from "@/types/motion-preset-engine";
import type { ObjectDetection } from "@/server/animation-export/local-vision/object-detector-types";

export type MotionVisionPreviewReference = MotionUploadedReference & {
  imageUrl?: string | null;
};

export type MotionVisionPreviewResult = {
  signals: MotionReferenceVisionSignals[];
  detectionsByReferenceId: Record<string, ObjectDetection[]>;
  previewComplete: boolean;
};

/**
 * Free RT-DETR vision preview — no premium credits charged.
 * Reuses /api/editor/detect (same stack as Editor Vision).
 */
export async function runMotionVisionPreviewAnalysis(input: {
  references: MotionVisionPreviewReference[];
}): Promise<MotionVisionPreviewResult> {
  const detectionsByReferenceId: Record<string, ObjectDetection[]> = {};
  const signals: MotionReferenceVisionSignals[] = [];

  for (const ref of input.references) {
    if (ref.visionAnalysis || ref.motionReady) {
      signals.push(
        buildMotionReferenceVisionSignals({
          reference: ref,
        })
      );
      continue;
    }

    const imageUrl = ref.imageUrl?.trim();
    if (!imageUrl) {
      signals.push(buildMotionReferenceVisionSignals({ reference: ref }));
      continue;
    }

    const detection = await detectEditorObjectsApi(imageUrl);
    const detections = detection.detections ?? [];
    detectionsByReferenceId[ref.id] = detections;
    signals.push(
      buildMotionReferenceVisionSignals({
        reference: ref,
        detections,
      })
    );
  }

  return {
    signals,
    detectionsByReferenceId,
    previewComplete: true,
  };
}
