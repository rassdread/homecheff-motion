import { getMotionActionPreset } from "@/lib/motion-action-presets";
import { resolveMotionPresetVisualRequirements } from "@/lib/motion-preset-visual-requirements";
import {
  referencesFromUploadCount,
} from "@/lib/motion-preset-reference-heuristics";
import { evaluateMotionVisualRequirement } from "@/lib/motion-vision-requirement-evaluator";
import type { MotionReferenceVisionSignals } from "@/lib/motion-reference-vision-signals";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type {
  MotionConfidenceLevel,
  MotionRequirementEvaluation,
  MotionUploadedReference,
  MotionVisualRequirementId,
} from "@/types/motion-preset-engine";

export type MotionPresetRequirementEngineInput = {
  presetId: MotionActionPresetId;
  references: MotionUploadedReference[];
  visionSignals?: MotionReferenceVisionSignals[];
};

function scoreRequirements(input: {
  required: MotionVisualRequirementId[];
  preferred: MotionVisualRequirementId[];
  references: MotionUploadedReference[];
  visionSignals?: MotionReferenceVisionSignals[];
}): {
  requirementScore: number;
  missingRequirements: MotionVisualRequirementId[];
  missingPreferred: MotionVisualRequirementId[];
} {
  const missingRequirements = input.required.filter(
    (req) =>
      !evaluateMotionVisualRequirement({
        requirementId: req,
        references: input.references,
        visionSignals: input.visionSignals,
      })
  );
  const missingPreferred = input.preferred.filter(
    (req) =>
      !evaluateMotionVisualRequirement({
        requirementId: req,
        references: input.references,
        visionSignals: input.visionSignals,
      })
  );
  const requiredScore =
    input.required.length === 0 ? 1 : (input.required.length - missingRequirements.length) / input.required.length;
  const preferredScore =
    input.preferred.length === 0 ? 1 : (input.preferred.length - missingPreferred.length) / input.preferred.length;
  const requirementScore = Math.round((requiredScore * 0.75 + preferredScore * 0.25) * 100);
  return { requirementScore, missingRequirements, missingPreferred };
}

function confidenceFromScore(score: number, missingRequired: number): MotionConfidenceLevel {
  if (missingRequired > 0) {
    return "low";
  }
  if (score >= 85) {
    return "high";
  }
  if (score >= 60) {
    return "medium";
  }
  return "low";
}

function guidanceKeys(
  missingRequirements: MotionVisualRequirementId[],
  missingPreferred: MotionVisualRequirementId[]
): string[] {
  const keys: string[] = [];
  for (const req of missingRequirements) {
    keys.push(`motionEngine.requirement.missing.${req}`);
  }
  for (const req of missingPreferred) {
    keys.push(`motionEngine.requirement.preferred.${req}`);
  }
  if (keys.length === 0) {
    keys.push("motionEngine.requirement.ready");
  }
  return keys;
}

/** MotionPresetRequirementEngine — evaluates uploads against preset needs before pricing/render. */
export function evaluateMotionPresetRequirements(
  input: MotionPresetRequirementEngineInput
): MotionRequirementEvaluation {
  const preset = getMotionActionPreset(input.presetId);
  const visual = resolveMotionPresetVisualRequirements(input.presetId);
  const references = referencesFromUploadCount({ references: input.references });
  const { requirementScore, missingRequirements, missingPreferred } = scoreRequirements({
    required: visual.required,
    preferred: visual.preferred,
    references,
    visionSignals: input.visionSignals,
  });
  const confidenceLevel = confidenceFromScore(requirementScore, missingRequirements.length);
  const hasPerson = references.length > 0;
  const mascotOnly =
    visual.required.includes("mascot_reference") && !visual.required.includes("face_visible");
  const canProceed = mascotOnly ? missingRequirements.length === 0 : hasPerson;
  const canRender = missingRequirements.length === 0 && hasPerson && Boolean(preset);

  return {
    presetId: input.presetId,
    requirementScore,
    missingRequirements,
    missingPreferred,
    confidenceLevel,
    canProceed,
    canRender,
    guidanceKeys: guidanceKeys(missingRequirements, missingPreferred),
  };
}
