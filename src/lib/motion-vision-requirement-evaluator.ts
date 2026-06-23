import type {
  MotionReferenceVisionSignals,
  MotionVisionSignalSource,
} from "@/lib/motion-reference-vision-signals";
import type { MotionUploadedReference, MotionVisualRequirementId } from "@/types/motion-preset-engine";
import {
  evaluateVisualRequirement as evaluateHeuristicRequirement,
} from "@/lib/motion-preset-reference-heuristics";

function evaluateVisionRequirement(
  requirementId: MotionVisualRequirementId,
  signals: MotionReferenceVisionSignals[],
  references: MotionUploadedReference[]
): boolean {
  if (signals.length === 0) {
    return evaluateHeuristicRequirement(requirementId, references);
  }
  const primary = signals[0]!;
  switch (requirementId) {
    case "face_visible":
      return signals.some((s) => s.faceDetected);
    case "upper_body_visible":
      return signals.some((s) => s.upperBodyVisible || s.faceDetected);
    case "full_body_visible":
      return signals.some((s) => s.fullBodyVisible);
    case "legs_visible":
      return signals.some((s) => s.legsVisible);
    case "shoes_visible":
      return signals.some((s) => s.shoesVisible);
    case "standing_pose":
      return primary.fullBodyVisible || primary.upperBodyVisible;
    case "product_reference":
      return signals.some((s) => s.productDetected);
    case "mascot_reference":
      return signals.some((s) => s.mascotDetected);
    case "logo_reference":
      return signals.some((s) => s.logoDetected);
    default:
      return false;
  }
}

export function evaluateMotionVisualRequirement(input: {
  requirementId: MotionVisualRequirementId;
  references: MotionUploadedReference[];
  visionSignals?: MotionReferenceVisionSignals[];
}): boolean {
  if (input.visionSignals?.length) {
    return evaluateVisionRequirement(input.requirementId, input.visionSignals, input.references);
  }
  return evaluateHeuristicRequirement(input.requirementId, input.references);
}

export function visionSignalsReady(signals: MotionReferenceVisionSignals[]): boolean {
  return signals.some(
    (s) => s.source !== "heuristic" || s.detectionLabels.length > 0 || s.analysisCached
  );
}

export function strongestVisionSource(signals: MotionReferenceVisionSignals[]): MotionVisionSignalSource {
  const priority: MotionVisionSignalSource[] = [
    "motion_ready",
    "full_vision",
    "style_dna",
    "rtdetr_preview",
    "heuristic",
  ];
  for (const source of priority) {
    if (signals.some((s) => s.source === source)) {
      return source;
    }
  }
  return "heuristic";
}
