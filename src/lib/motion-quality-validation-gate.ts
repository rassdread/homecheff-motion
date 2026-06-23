import type { MotionReferenceVisionSignals } from "@/lib/motion-reference-vision-signals";
import type {
  MotionComplexityEstimate,
  MotionMultiReferenceIntelligence,
  MotionQualityScore,
  MotionQualityValidation,
  MotionRequirementEvaluation,
} from "@/types/motion-preset-engine";

export type MotionQualityValidationInput = {
  requirementEvaluation: MotionRequirementEvaluation;
  complexityEstimate: MotionComplexityEstimate;
  multiReference: MotionMultiReferenceIntelligence;
  visionSignals?: MotionReferenceVisionSignals[];
};

const BLOCK_THRESHOLD = 45;
const WARN_THRESHOLD = 68;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeQualityScore(input: MotionQualityValidationInput): MotionQualityScore {
  const signals = input.visionSignals ?? [];
  const primary = signals[0];
  const faceVisibility = primary?.faceDetected ? clampScore(primary.identityConfidence) : signals.length ? 35 : 50;
  const bodyVisibility = primary?.fullBodyVisible ? 90 : primary?.upperBodyVisible ? 72 : 45;
  const mascotConsistency = primary?.mascotDetected ? clampScore(primary.identityConfidence) : 80;
  const logoQuality = primary?.logoDetected ? clampScore((primary.styleDnaStrength + primary.identityConfidence) / 2) : 75;
  const productQuality = primary?.productDetected ? clampScore(primary.identityConfidence) : 75;
  const styleDnaStrength = signals.length
    ? clampScore(signals.reduce((sum, s) => sum + s.styleDnaStrength, 0) / signals.length)
    : 40;
  const identityConfidence = clampScore(
    input.multiReference.identityConfidence * 0.4 +
      (primary?.identityConfidence ?? input.requirementEvaluation.requirementScore) * 0.6
  );
  const referenceQuality = clampScore(
    100 - input.multiReference.referenceConflictScore - input.requirementEvaluation.missingPreferred.length * 6
  );
  const presetSuitability = input.requirementEvaluation.canRender ? 85 : 38;
  const renderSuitability = clampScore(
    (identityConfidence + referenceQuality + presetSuitability + bodyVisibility + faceVisibility) / 5
  );
  const overall = clampScore(
    (identityConfidence +
      referenceQuality +
      bodyVisibility +
      faceVisibility +
      mascotConsistency +
      logoQuality +
      productQuality +
      styleDnaStrength +
      renderSuitability) /
      9
  );

  return {
    overall,
    identityConfidence,
    referenceQuality,
    bodyVisibility,
    faceVisibility,
    mascotConsistency,
    logoQuality,
    productQuality,
    styleDnaStrength,
    renderSuitability,
  };
}

/** Quality Gate 2.0 — vision-backed scoring with human guidance keys. */
export function validateMotionQuality(input: MotionQualityValidationInput): MotionQualityValidation {
  const warnings: string[] = [];
  const qualityScore = computeQualityScore(input);

  if (input.requirementEvaluation.missingRequirements.length > 0) {
    warnings.push("motionEngine.quality.missingRequirements");
  }
  if (qualityScore.faceVisibility < 55 && input.requirementEvaluation.missingRequirements.includes("face_visible")) {
    warnings.push("motionEngine.quality.lowFaceVisibility");
  }
  if (qualityScore.bodyVisibility < 55) {
    warnings.push("motionEngine.quality.lowBodyVisibility");
  }
  if (input.multiReference.referenceConflictScore > 0) {
    warnings.push("motionEngine.quality.referenceConflict");
  }
  if (input.complexityEstimate.complexityTier === "high") {
    warnings.push("motionEngine.quality.highComplexity");
  }
  if (!input.requirementEvaluation.canRender) {
    warnings.push("motionEngine.quality.notReady");
  }
  if (qualityScore.styleDnaStrength < 40 && !input.complexityEstimate.analysisCached) {
    warnings.push("motionEngine.quality.weakStyleDna");
  }
  if (qualityScore.overall < WARN_THRESHOLD && warnings.length === 0) {
    warnings.push("motionEngine.quality.borderline");
  }

  const blockRender = !input.requirementEvaluation.canRender || qualityScore.overall < BLOCK_THRESHOLD;
  const passed = qualityScore.overall >= WARN_THRESHOLD && input.requirementEvaluation.canRender;

  return {
    passed,
    qualityScore,
    identityConfidence: qualityScore.identityConfidence,
    referenceQuality: qualityScore.referenceQuality,
    presetSuitability: input.requirementEvaluation.canRender ? 85 : 35,
    environmentConfidence:
      input.requirementEvaluation.missingRequirements.length === 0 ? 80 : 45,
    brandConfidence: qualityScore.logoQuality,
    mascotConfidence: qualityScore.mascotConsistency,
    warnings,
    blockRender,
  };
}
