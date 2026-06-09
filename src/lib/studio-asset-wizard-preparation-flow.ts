import {
  buildAnimationPreparationSuggestions,
  defaultSelectedActionsFromSuggestions,
} from "@/lib/studio-asset-animation-suggestions";
import { isAnimationReadyEvolutionFlow } from "@/lib/studio-asset-character-evolution";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import {
  analyzeAnimationReadiness,
  buildCharacterConstructionProfile,
} from "@/lib/studio-asset-animation-readiness";
import { hasWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";
import type { AssetCreationWizardStep } from "@/types/studio-asset-creation";

export function isPrepareForAnimationFlow(draft: AssetWizardDraft): boolean {
  return draft.entryPath === "prepare_for_animation" || isAnimationReadyEvolutionFlow(draft);
}

export function shouldShowCharacterConstructionStep(draft: AssetWizardDraft): boolean {
  return isPrepareForAnimationFlow(draft) && Boolean(draft.sourceVisionAnalysis);
}

export function shouldShowAnimationReadinessStep(draft: AssetWizardDraft): boolean {
  return isPrepareForAnimationFlow(draft) && draft.characterConstructionConfirmed;
}

export function canAdvanceFromCharacterConstructionStep(draft: AssetWizardDraft): boolean {
  if (!isPrepareForAnimationFlow(draft)) {
    return true;
  }
  const profile = buildCharacterConstructionProfile(draft);
  if (!profile) {
    return false;
  }
  if (draft.identityAssetType === "person") {
    return Boolean(profile.bodyType && profile.postureProfile);
  }
  if (draft.identityAssetType === "mascot" || draft.identityAssetType === "character") {
    return Boolean(profile.standardPose || !profile.requiresConstruction);
  }
  if (draft.identityAssetType === "animal") {
    return Boolean(profile.defaultStance || profile.bodyType);
  }
  if (draft.identityAssetType === "vehicle") {
    return Boolean(profile.presentationAngle || profile.scaleProfile);
  }
  return draft.characterConstructionConfirmed || Boolean(profile.bodyVisibility);
}

export function canAdvanceFromAnimationReadinessStep(draft: AssetWizardDraft): boolean {
  if (!isPrepareForAnimationFlow(draft)) {
    return true;
  }
  return draft.animationReadinessConfirmed && Boolean(draft.animationReadinessAnalysis);
}

export function seedAnimationReadinessAnalysis(draft: AssetWizardDraft): Partial<AssetWizardDraft> {
  if (!draft.sourceVisionAnalysis) {
    return {};
  }
  const construction = buildCharacterConstructionProfile(draft);
  const suggestions = buildAnimationPreparationSuggestions({
    vision: draft.sourceVisionAnalysis,
    construction,
  });
  return {
    animationReadinessAnalysis: analyzeAnimationReadiness({
      vision: draft.sourceVisionAnalysis,
      construction,
    }),
    animationPreparationSuggestions: suggestions,
    animationPreparationActions:
      draft.animationPreparationActions.length > 0
        ? draft.animationPreparationActions
        : defaultSelectedActionsFromSuggestions(suggestions),
  };
}

function insertCharacterConstructionStep(
  steps: AssetCreationWizardStep[],
  draft: AssetWizardDraft
): AssetCreationWizardStep[] {
  if (!shouldShowCharacterConstructionStep(draft) || steps.includes("character_construction")) {
    return steps;
  }
  const result = [...steps];
  const profileIdx = result.indexOf("identity_profile");
  const anchor = profileIdx >= 0 ? profileIdx + 1 : result.indexOf("asset_vision") + 1;
  if (anchor > 0) {
    result.splice(anchor, 0, "character_construction");
  }
  return result;
}

function insertAnimationReadinessStep(
  steps: AssetCreationWizardStep[],
  draft: AssetWizardDraft
): AssetCreationWizardStep[] {
  if (!shouldShowCharacterConstructionStep(draft) || steps.includes("animation_readiness")) {
    return steps;
  }
  const result = [...steps];
  const constructionIdx = result.indexOf("character_construction");
  if (constructionIdx >= 0) {
    result.splice(constructionIdx + 1, 0, "animation_readiness");
  }
  return result;
}

/** Strip generation-only steps from preparation flow — save uses source upload directly. */
export function stripGenerationStepsForPreparationFlow(
  steps: AssetCreationWizardStep[],
  draft: AssetWizardDraft
): AssetCreationWizardStep[] {
  if (!isPrepareForAnimationFlow(draft)) {
    return steps;
  }
  return steps.filter(
    (step) =>
      step !== "reference" &&
      step !== "transform_prompt" &&
      step !== "source_transform" &&
      step !== "proposal"
  );
}

export function injectPreparationWizardSteps(
  steps: AssetCreationWizardStep[],
  draft: AssetWizardDraft
): AssetCreationWizardStep[] {
  if (!isPrepareForAnimationFlow(draft)) {
    return steps;
  }
  let result = stripGenerationStepsForPreparationFlow(steps, draft);
  result = insertAnimationReadinessStep(insertCharacterConstructionStep(result, draft), draft);
  return result;
}

export function finalizePrepareForAnimationDraft(draft: AssetWizardDraft): Partial<AssetWizardDraft> {
  if (!isPrepareForAnimationFlow(draft) || !hasWizardSourceReference(draft)) {
    return {};
  }
  if (draft.referenceImageUrl && draft.referenceStorageKey) {
    return {};
  }
  return {
    referenceImageUrl: draft.sourceReferenceImageUrl,
    referenceStorageKey: draft.sourceReferenceStorageKey,
    referenceMode: "upload",
  };
}

export function wizardStepLabelKeyForPreparation(
  step: AssetCreationWizardStep
): string | null {
  if (step === "character_construction") {
    return "studio.assetCreation.wizard.step.characterConstruction";
  }
  if (step === "animation_readiness") {
    return "studio.assetCreation.wizard.step.animationReadiness";
  }
  return null;
}
