import { estimateMotionComplexity } from "@/lib/motion-complexity-estimator";
import { resolveMotionAnalysisCache } from "@/lib/motion-analysis-cache";
import { buildMotionIdentityProfile } from "@/lib/motion-identity-profile";
import { motionIdentityLockPromptBlock } from "@/lib/motion-identity-lock";
import { resolveMotionMultiReferenceIntelligence } from "@/lib/motion-multi-reference-intelligence";
import { evaluateMotionPresetRequirements } from "@/lib/motion-preset-requirement-engine";
import { resolveMotionPresetIntelligenceProfile } from "@/lib/motion-preset-intelligence-profiles";
import { resolveMotionPresetStoryboard } from "@/lib/motion-preset-storyboards";
import { validateMotionQuality } from "@/lib/motion-quality-validation-gate";
import {
  buildMotionReferenceVisionSignalsBatch,
  aggregateMotionVisionWorkload,
  type MotionReferenceVisionSignals,
} from "@/lib/motion-reference-vision-signals";
import { strongestVisionSource } from "@/lib/motion-vision-requirement-evaluator";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type {
  MotionPresetEngineSnapshot,
  MotionUploadedReference,
} from "@/types/motion-preset-engine";

export type EvaluateMotionPresetPipelineInput = {
  presetId: MotionActionPresetId;
  references: MotionUploadedReference[];
  imageCount: number;
  instantMode: "transition" | "story";
  transitionSeconds: 3 | 5 | 8;
  sceneTextCount?: number;
  userIsAdmin?: boolean;
  visionSignals?: MotionReferenceVisionSignals[];
  detectionsByReferenceId?: Record<string, import("@/server/animation-export/local-vision/object-detector-types").ObjectDetection[]>;
  motionReadyAnalysis?: Parameters<typeof resolveMotionAnalysisCache>[0]["motionReadyAnalysis"];
  characterStudioAnalysis?: Parameters<typeof resolveMotionAnalysisCache>[0]["characterStudioAnalysis"];
  existingSnapshot?: MotionPresetEngineSnapshot | null;
  marketplaceItemId?: string | null;
  premiumAnalysisComplete?: boolean;
};

function enrichReferencesFromVision(
  references: MotionUploadedReference[],
  visionSignals: MotionReferenceVisionSignals[]
): MotionUploadedReference[] {
  return references.map((ref) => {
    const signal = visionSignals.find((s) => s.referenceId === ref.id);
    if (!signal?.visionAnalysis) {
      return ref;
    }
    return {
      ...ref,
      visionAnalysis: ref.visionAnalysis ?? signal.visionAnalysis,
    };
  });
}

export function evaluateMotionPresetPipeline(
  input: EvaluateMotionPresetPipelineInput
): MotionPresetEngineSnapshot {
  const visionSignals =
    input.visionSignals ??
    buildMotionReferenceVisionSignalsBatch({
      references: input.references,
      detectionsByReferenceId: input.detectionsByReferenceId,
    });
  const enrichedReferences = enrichReferencesFromVision(input.references, visionSignals);
  const requirementEvaluation = evaluateMotionPresetRequirements({
    presetId: input.presetId,
    references: enrichedReferences,
    visionSignals,
  });
  const multiReference = resolveMotionMultiReferenceIntelligence(enrichedReferences);
  const cache = resolveMotionAnalysisCache({
    references: enrichedReferences,
    existingIdentityProfile: input.existingSnapshot?.identityProfile ?? null,
    motionReadyAnalysis: input.motionReadyAnalysis,
    characterStudioAnalysis: input.characterStudioAnalysis,
  });
  const complexityEstimate = estimateMotionComplexity({
    presetId: input.presetId,
    references: enrichedReferences,
    cachedAnalysisCount: cache.cachedAnalysisCount,
    visionSignals,
    imageCount: input.imageCount,
    instantMode: input.instantMode,
    transitionSeconds: input.transitionSeconds,
    sceneTextCount: input.sceneTextCount,
    userIsAdmin: input.userIsAdmin,
  });
  const identityProfile = buildMotionIdentityProfile({
    presetId: input.presetId,
    references: enrichedReferences,
    cache,
    primaryReferenceId: multiReference.primaryIdentityReferenceId,
    visionSignals,
  });
  const qualityValidation = validateMotionQuality({
    requirementEvaluation,
    complexityEstimate,
    multiReference,
    visionSignals,
  });
  const intelligenceProfile = resolveMotionPresetIntelligenceProfile(input.presetId);
  const storyboard = resolveMotionPresetStoryboard(input.presetId);
  const workload = aggregateMotionVisionWorkload(visionSignals);

  return {
    version: 1,
    evaluatedAt: new Date().toISOString(),
    requirementEvaluation,
    complexityEstimate,
    identityProfile,
    multiReference,
    qualityValidation,
    intelligenceProfile,
    storyboard: {
      presetId: input.presetId,
      sceneCount: storyboard.scenes.length,
      structuredPromptBlock: storyboard.structuredPromptBlock,
    },
    visionPipeline: {
      signalsReady: visionSignals.some((s) => s.source !== "heuristic"),
      strongestSource: strongestVisionSource(visionSignals),
      averageIdentityConfidence: workload.averageIdentityConfidence,
      workloadFaceCount: workload.faceCount,
      workloadMascotCount: workload.mascotCount,
      workloadProductCount: workload.productCount,
    },
    premiumAnalysisComplete:
      input.premiumAnalysisComplete ??
      complexityEstimate.analysisCached ??
      complexityEstimate.requiredAnalysisPasses === 0,
  };
}

export function motionPresetCombinedPromptBlock(snapshot: MotionPresetEngineSnapshot): string {
  return [
    motionIdentityLockPromptBlock(snapshot.identityProfile),
    snapshot.intelligenceProfile?.structuredPromptBlock,
    snapshot.storyboard?.structuredPromptBlock,
  ]
    .filter(Boolean)
    .join("\n\n");
}
