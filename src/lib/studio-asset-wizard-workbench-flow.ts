import { shouldShowCharacterStyleStep } from "@/lib/studio-asset-character-style-cards";
import { shouldShowReferencePlacementStep } from "@/lib/studio-asset-reference-placement";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetCreationWizardStep } from "@/types/studio-asset-creation";

function insertCharacterStyleStep(
  steps: AssetCreationWizardStep[],
  draft: AssetWizardDraft
): AssetCreationWizardStep[] {
  if (!shouldShowCharacterStyleStep(draft) || steps.includes("character_style")) {
    return steps;
  }
  const result = [...steps];
  const evolutionIdx = result.indexOf("character_evolution");
  const profileIdx = result.indexOf("identity_profile");
  const anchor =
    evolutionIdx >= 0 ? evolutionIdx + 1 : profileIdx >= 0 ? profileIdx + 1 : result.indexOf("asset_vision") + 1;
  if (anchor > 0) {
    result.splice(anchor, 0, "character_style");
  }
  return result;
}

function insertReferencePlacementStep(
  steps: AssetCreationWizardStep[],
  draft: AssetWizardDraft
): AssetCreationWizardStep[] {
  if (!shouldShowReferencePlacementStep(draft) || steps.includes("reference_placement")) {
    return steps;
  }
  const result = [...steps];
  const constructionIdx = result.indexOf("canonical_evolution_construction");
  const charConstructionIdx = result.indexOf("character_construction");
  const readinessIdx = result.indexOf("animation_readiness");
  const transformIdx = result.indexOf("transform_prompt");
  const refIdx = result.indexOf("reference");
  const anchor =
    readinessIdx >= 0
      ? readinessIdx + 1
      : charConstructionIdx >= 0
        ? charConstructionIdx + 1
        : constructionIdx >= 0
          ? constructionIdx + 1
          : transformIdx >= 0
            ? transformIdx
            : refIdx >= 0
              ? refIdx
              : -1;
  if (anchor >= 0) {
    result.splice(anchor, 0, "reference_placement", "placement_preview");
  }
  return result;
}

export function injectWorkbenchWizardSteps(
  steps: AssetCreationWizardStep[],
  draft: AssetWizardDraft
): AssetCreationWizardStep[] {
  let result = insertCharacterStyleStep(steps, draft);
  result = insertReferencePlacementStep(result, draft);
  return result;
}

export function wizardStepLabelKeyForWorkbench(step: AssetCreationWizardStep): string | null {
  if (step === "character_style") {
    return "studio.assetCreation.wizard.step.characterStyle";
  }
  if (step === "reference_placement") {
    return "studio.assetCreation.wizard.step.referencePlacement";
  }
  if (step === "placement_preview") {
    return "studio.assetCreation.wizard.step.placementPreview";
  }
  return null;
}
