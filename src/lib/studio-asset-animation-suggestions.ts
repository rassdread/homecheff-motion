import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { AnimationPreparationSuggestion } from "@/types/studio-asset-generation-workbench";
import type { AnimationPreparationActionId } from "@/types/studio-asset-animation-readiness";
import { analyzeAnimationReadiness } from "@/lib/studio-asset-animation-readiness";
import type { CharacterConstructionProfile } from "@/types/studio-asset-animation-readiness";

const EXTENDED_ACTIONS: Array<{
  id: AnimationPreparationActionId | string;
  labelKey: string;
  detect: (params: { vision: AssetVisionAnalysis; analysis: ReturnType<typeof analyzeAnimationReadiness> }) => {
    recommended: boolean;
    confidence: number;
    reasonKey: string;
  };
}> = [
  {
    id: "remove_background",
    labelKey: "studio.assetCreation.animationPrep.action.removeBackground",
    detect: ({ analysis }) => ({
      recommended: analysis.checks.hasBackground,
      confidence: analysis.checks.hasBackground ? 0.92 : 0.2,
      reasonKey: "studio.workbench.animationSuggest.reason.background",
    }),
  },
  {
    id: "transparent_png",
    labelKey: "studio.assetCreation.animationPrep.action.transparentPng",
    detect: ({ analysis }) => ({
      recommended: analysis.checks.hasBackground,
      confidence: analysis.checks.hasBackground ? 0.9 : 0.2,
      reasonKey: "studio.workbench.animationSuggest.reason.transparent",
    }),
  },
  {
    id: "center_character",
    labelKey: "studio.assetCreation.animationPrep.action.centerCharacter",
    detect: ({ analysis }) => ({
      recommended: !analysis.checks.clearSilhouette,
      confidence: !analysis.checks.clearSilhouette ? 0.75 : 0.3,
      reasonKey: "studio.workbench.animationSuggest.reason.center",
    }),
  },
  {
    id: "expand_canvas",
    labelKey: "studio.assetCreation.animationPrep.action.expandCanvas",
    detect: ({ analysis }) => ({
      recommended: !analysis.checks.fullBodyVisible && analysis.checks.hasBackground,
      confidence: 0.68,
      reasonKey: "studio.workbench.animationSuggest.reason.expandCanvas",
    }),
  },
  {
    id: "reconstruct_full_body",
    labelKey: "studio.assetCreation.animationPrep.action.reconstructFullBody",
    detect: ({ analysis }) => ({
      recommended: !analysis.checks.fullBodyVisible,
      confidence: !analysis.checks.fullBodyVisible ? 0.88 : 0.15,
      reasonKey: "studio.workbench.animationSuggest.reason.fullBody",
    }),
  },
  {
    id: "reconstruct_hands",
    labelKey: "studio.workbench.animationPrep.action.reconstructHands",
    detect: ({ analysis }) => ({
      recommended: !analysis.checks.armsVisible,
      confidence: !analysis.checks.armsVisible ? 0.85 : 0.1,
      reasonKey: "studio.workbench.animationSuggest.reason.hands",
    }),
  },
  {
    id: "reconstruct_legs",
    labelKey: "studio.workbench.animationPrep.action.reconstructLegs",
    detect: ({ analysis }) => ({
      recommended: !analysis.checks.legsVisible,
      confidence: !analysis.checks.legsVisible ? 0.84 : 0.1,
      reasonKey: "studio.workbench.animationSuggest.reason.legs",
    }),
  },
  {
    id: "standard_pose",
    labelKey: "studio.assetCreation.animationPrep.action.standardPose",
    detect: ({ analysis }) => ({
      recommended: !analysis.checks.usablePose,
      confidence: !analysis.checks.usablePose ? 0.8 : 0.25,
      reasonKey: "studio.workbench.animationSuggest.reason.neutralPose",
    }),
  },
  {
    id: "turnaround_ready",
    labelKey: "studio.workbench.animationPrep.action.turnaroundReady",
    detect: ({ vision }) => ({
      recommended: /character|mascot|human/.test(vision.objectType),
      confidence: 0.65,
      reasonKey: "studio.workbench.animationSuggest.reason.turnaround",
    }),
  },
  {
    id: "motion_ready",
    labelKey: "studio.workbench.animationPrep.action.motionReady",
    detect: ({ analysis }) => ({
      recommended: analysis.score < 80,
      confidence: analysis.score < 80 ? 0.78 : 0.4,
      reasonKey: "studio.workbench.animationSuggest.reason.motionReady",
    }),
  },
  {
    id: "lip_sync_ready",
    labelKey: "studio.workbench.animationPrep.action.lipSyncReady",
    detect: ({ vision }) => ({
      recommended: /character|mascot|human|person/.test(vision.objectType),
      confidence: 0.6,
      reasonKey: "studio.workbench.animationSuggest.reason.lipSync",
    }),
  },
  {
    id: "expression_base",
    labelKey: "studio.assetCreation.animationPrep.action.expressionBase",
    detect: ({ analysis }) => ({
      recommended: analysis.score < 85,
      confidence: 0.72,
      reasonKey: "studio.workbench.animationSuggest.reason.expression",
    }),
  },
  {
    id: "animation_ready_reference",
    labelKey: "studio.assetCreation.animationPrep.action.animationReadyReference",
    detect: ({ analysis }) => ({
      recommended: analysis.checks.identityConfidence < 70,
      confidence: analysis.checks.identityConfidence < 70 ? 0.86 : 0.2,
      reasonKey: "studio.workbench.animationSuggest.reason.identity",
    }),
  },
];

export function buildAnimationPreparationSuggestions(params: {
  vision: AssetVisionAnalysis;
  construction?: CharacterConstructionProfile | null;
}): AnimationPreparationSuggestion[] {
  const analysis = analyzeAnimationReadiness(params);
  return EXTENDED_ACTIONS.map((action) => {
    const result = action.detect({ vision: params.vision, analysis });
    return {
      actionId: action.id,
      recommended: result.recommended,
      confidence: result.confidence,
      reasonKey: result.reasonKey,
    };
  });
}

export function defaultSelectedActionsFromSuggestions(
  suggestions: AnimationPreparationSuggestion[]
): string[] {
  return suggestions.filter((s) => s.recommended && s.confidence >= 0.65).map((s) => s.actionId);
}
