/**
 * Unified wizard-first pricing resolver — single total price per workflow.
 * Reuses editor-fusion-workflow-credits + premium vision constants (no duplicate registry).
 */

import { hasValidPremiumAnalysis } from "@/lib/editor-fusion-analysis-cache";
import { profileFromAnalyzedDocument } from "@/lib/editor-fusion-intelligence";
import {
  buildFusionIntelligenceCostState,
  fusionWorkflowRenderCredits,
  fusionWorkflowUsesIntelligence,
} from "@/lib/editor-fusion-workflow-credits";
import { normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import { primaryBaseDocumentFromIntake } from "@/lib/editor-reference-role-intake";
import { PREMIUM_VISION_ANALYSIS_CREDITS } from "@/lib/editor-premium-vision-credits";
import type { EditorReferenceIntakeState } from "@/types/editor-reference-role-flow";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

export type WizardIncludedFeature =
  | "smart_analysis"
  | "character_consistency"
  | "brand_protection"
  | "high_quality_render"
  | "animation_ready";

/** Character Studio motion cluster workflow IDs (not EditorFusionIntent). */
export type MotionWizardWorkflowId = "motion_ready_character" | "full_body_extension";

/** Studio asset pipeline credits — mirrors studio-action-cost-registry (vision_analysis + character_generation). */
export const MOTION_VISION_ANALYSIS_CREDITS = 5;
export const MOTION_CHARACTER_RENDER_CREDITS = 20;

export type WizardWorkflowPricingInput = {
  workflowType: EditorFusionIntent;
  referenceCount: number;
  cachedAnalysisCount: number;
  userIsAdmin: boolean;
};

export type WizardWorkflowPrice = {
  workflowType: EditorFusionIntent;
  analysisCredits: number;
  renderCredits: number;
  totalCredits: number;
  includedFeatures: WizardIncludedFeature[];
  requiresPayment: boolean;
  adminBypass: boolean;
  cachedAnalysesUsed: number;
  uncachedReferenceCount: number;
  referenceCount: number;
};

const SIMPLE_EDIT_WORKFLOWS = new Set<EditorFusionIntent>([
  "product_branding",
  "product_packaging",
  "person_background",
  "product_environment",
]);

const CHARACTER_STUDIO_WORKFLOWS = new Set<EditorFusionIntent>([
  "human_into_mascot",
  "mascot_into_human",
  "character_upgrade",
  "outfit_from_reference",
  "person_outfit",
]);

const FUSION_STUDIO_WORKFLOWS = new Set<EditorFusionIntent>([
  "character_fusion",
  "future_child",
  "genetic_blend",
  "animal_human_fusion",
  "product_family",
  "campaign_variant",
  "life_timeline",
]);

export function wizardIncludedFeaturesForWorkflow(
  workflowType: EditorFusionIntent
): WizardIncludedFeature[] {
  const intent = normalizeFusionIntent(workflowType);
  const features: WizardIncludedFeature[] = ["smart_analysis", "high_quality_render"];

  if (fusionWorkflowUsesIntelligence(intent) || CHARACTER_STUDIO_WORKFLOWS.has(intent)) {
    features.push("character_consistency");
  }
  if (SIMPLE_EDIT_WORKFLOWS.has(intent) || intent === "product_branding") {
    features.push("brand_protection");
  }
  if (
    CHARACTER_STUDIO_WORKFLOWS.has(intent) ||
    intent === "human_into_mascot" ||
    intent === "mascot_into_human" ||
    intent === "character_upgrade"
  ) {
    features.push("animation_ready");
  }
  if (FUSION_STUDIO_WORKFLOWS.has(intent) && !features.includes("animation_ready")) {
    features.push("brand_protection");
  }

  return [...new Set(features)];
}

export function resolveWizardWorkflowPrice(
  input: WizardWorkflowPricingInput
): WizardWorkflowPrice {
  const workflowType = normalizeFusionIntent(input.workflowType);
  const referenceCount = Math.max(0, input.referenceCount);
  const cachedAnalysesUsed = Math.min(
    Math.max(0, input.cachedAnalysisCount),
    referenceCount
  );
  const uncachedReferenceCount = Math.max(0, referenceCount - cachedAnalysesUsed);

  if (input.userIsAdmin) {
    return {
      workflowType,
      analysisCredits: 0,
      renderCredits: 0,
      totalCredits: 0,
      includedFeatures: wizardIncludedFeaturesForWorkflow(workflowType),
      requiresPayment: false,
      adminBypass: true,
      cachedAnalysesUsed,
      uncachedReferenceCount,
      referenceCount,
    };
  }

  const analysisCredits = uncachedReferenceCount * PREMIUM_VISION_ANALYSIS_CREDITS;
  const renderCredits = fusionWorkflowRenderCredits(workflowType);
  const totalCredits = analysisCredits + renderCredits;

  return {
    workflowType,
    analysisCredits,
    renderCredits,
    totalCredits,
    includedFeatures: wizardIncludedFeaturesForWorkflow(workflowType),
    requiresPayment: totalCredits > 0,
    adminBypass: false,
    cachedAnalysesUsed,
    uncachedReferenceCount,
    referenceCount,
  };
}

export function resolveWizardWorkflowPriceFromIntake(input: {
  intake: EditorReferenceIntakeState;
  isAdmin?: boolean;
}): WizardWorkflowPrice | null {
  const intent = input.intake.config.intent;
  if (!intent || input.intake.config.workflow !== "combine") {
    return null;
  }
  const normalized = normalizeFusionIntent(intent);
  const isAdmin = Boolean(input.isAdmin);
  const baseDoc = primaryBaseDocumentFromIntake(input.intake);
  const profiles = [];
  let referenceCount = 0;
  let cachedAnalysisCount = 0;

  if (baseDoc) {
    referenceCount += 1;
    if (hasValidPremiumAnalysis(baseDoc)) {
      cachedAnalysisCount += 1;
    }
    profiles.push(
      profileFromAnalyzedDocument({
        document: baseDoc,
        referenceId: `base_${baseDoc.sessionId}`,
        role: "base",
        roleId: "base",
        name: baseDoc.name,
      })
    );
  }

  for (const slot of input.intake.slots) {
    for (const instance of slot.instances) {
      referenceCount += 1;
      if (hasValidPremiumAnalysis(instance.document)) {
        cachedAnalysisCount += 1;
      }
      profiles.push(
        profileFromAnalyzedDocument({
          document: instance.document,
          referenceId: instance.instanceId,
          role: slot.role,
          roleId: slot.roleId,
          name: instance.document.name,
        })
      );
    }
  }

  const costState = buildFusionIntelligenceCostState({
    workflowType: normalized,
    profiles,
  });

  const price = resolveWizardWorkflowPrice({
    workflowType: normalized,
    referenceCount,
    cachedAnalysisCount,
    userIsAdmin: isAdmin,
  });

  if (isAdmin) {
    return price;
  }

  return {
    ...price,
    analysisCredits: costState.analysisCreditsRequired,
    renderCredits: costState.renderCredits,
    totalCredits: costState.analysisCreditsRequired + costState.renderCredits,
    requiresPayment: costState.analysisCreditsRequired + costState.renderCredits > 0,
  };
}

export function wizardWorkflowPricingTier(
  workflowType: EditorFusionIntent
): "simple_edit" | "character_studio" | "fusion_studio" | "default" {
  const intent = normalizeFusionIntent(workflowType);
  if (SIMPLE_EDIT_WORKFLOWS.has(intent)) {
    return "simple_edit";
  }
  if (CHARACTER_STUDIO_WORKFLOWS.has(intent)) {
    return "character_studio";
  }
  if (FUSION_STUDIO_WORKFLOWS.has(intent)) {
    return "fusion_studio";
  }
  return "default";
}

export function motionWizardIncludedFeatures(): WizardIncludedFeature[] {
  return ["smart_analysis", "high_quality_render", "animation_ready"];
}

/** Unified pricing for motion-ready / full-body Character Studio flows. */
export function resolveMotionWizardWorkflowPrice(input: {
  workflowId: MotionWizardWorkflowId;
  visionAnalysisComplete: boolean;
  userIsAdmin: boolean;
}): WizardWorkflowPrice {
  const workflowType = "character_upgrade" as EditorFusionIntent;
  if (input.userIsAdmin) {
    return {
      workflowType,
      analysisCredits: 0,
      renderCredits: 0,
      totalCredits: 0,
      includedFeatures: motionWizardIncludedFeatures(),
      requiresPayment: false,
      adminBypass: true,
      cachedAnalysesUsed: input.visionAnalysisComplete ? 1 : 0,
      uncachedReferenceCount: input.visionAnalysisComplete ? 0 : 1,
      referenceCount: 1,
    };
  }

  const analysisCredits = input.visionAnalysisComplete ? 0 : MOTION_VISION_ANALYSIS_CREDITS;
  const renderCredits = MOTION_CHARACTER_RENDER_CREDITS;
  const totalCredits = analysisCredits + renderCredits;

  return {
    workflowType,
    analysisCredits,
    renderCredits,
    totalCredits,
    includedFeatures: motionWizardIncludedFeatures(),
    requiresPayment: totalCredits > 0,
    adminBypass: false,
    cachedAnalysesUsed: input.visionAnalysisComplete ? 1 : 0,
    uncachedReferenceCount: input.visionAnalysisComplete ? 0 : 1,
    referenceCount: 1,
  };
}

/** Pre-generate step: vision already paid — price render only. */
export function resolveMotionWizardGeneratePrice(input: {
  workflowId: MotionWizardWorkflowId;
  userIsAdmin: boolean;
}): WizardWorkflowPrice {
  return resolveMotionWizardWorkflowPrice({
    ...input,
    visionAnalysisComplete: true,
  });
}
