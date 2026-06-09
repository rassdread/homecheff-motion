import {
  isAnimationReadyEvolutionFlow,
  isCanonicalEvolutionFlow,
  isVariantEvolutionFlow,
  shouldShowCanonicalEvolutionConstructionStep,
  shouldShowCharacterEvolutionStep,
} from "@/lib/studio-asset-character-evolution";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetCreationWizardStep } from "@/types/studio-asset-creation";

function insertCharacterEvolutionStep(
  steps: AssetCreationWizardStep[],
  draft: AssetWizardDraft
): AssetCreationWizardStep[] {
  if (!shouldShowCharacterEvolutionStep(draft) || steps.includes("character_evolution")) {
    return steps;
  }
  const result = [...steps];
  const profileIdx = result.indexOf("identity_profile");
  const anchor = profileIdx >= 0 ? profileIdx + 1 : result.indexOf("asset_vision") + 1;
  if (anchor > 0) {
    result.splice(anchor, 0, "character_evolution");
  }
  return result;
}

function insertCanonicalEvolutionConstructionStep(
  steps: AssetCreationWizardStep[],
  draft: AssetWizardDraft
): AssetCreationWizardStep[] {
  if (
    !shouldShowCanonicalEvolutionConstructionStep(draft) ||
    steps.includes("canonical_evolution_construction")
  ) {
    return steps;
  }
  const result = [...steps];
  const evolutionIdx = result.indexOf("character_evolution");
  const anchor = evolutionIdx >= 0 ? evolutionIdx + 1 : result.indexOf("identity_profile") + 1;
  if (anchor > 0) {
    result.splice(anchor, 0, "canonical_evolution_construction");
  }
  return result;
}

function stripStepsForEvolutionChoice(
  steps: AssetCreationWizardStep[],
  draft: AssetWizardDraft
): AssetCreationWizardStep[] {
  if (!draft.characterEvolutionChoice) {
    return steps;
  }

  if (isCanonicalEvolutionFlow(draft)) {
    return steps.filter((step) => step !== "source_transform");
  }

  if (isAnimationReadyEvolutionFlow(draft)) {
    return steps.filter(
      (step) =>
        step !== "source_transform" &&
        step !== "transform_prompt" &&
        step !== "reference" &&
        step !== "proposal"
    );
  }

  if (isVariantEvolutionFlow(draft) && draft.derivationFlow) {
    return steps;
  }

  return steps;
}

export function injectEvolutionWizardSteps(
  steps: AssetCreationWizardStep[],
  draft: AssetWizardDraft
): AssetCreationWizardStep[] {
  let result = insertCharacterEvolutionStep(steps, draft);
  result = insertCanonicalEvolutionConstructionStep(result, draft);
  result = stripStepsForEvolutionChoice(result, draft);
  return result;
}

export function wizardStepLabelKeyForEvolution(
  step: AssetCreationWizardStep
): string | null {
  if (step === "character_evolution") {
    return "studio.assetCreation.wizard.step.characterEvolution";
  }
  if (step === "canonical_evolution_construction") {
    return "studio.assetCreation.wizard.step.canonicalEvolutionConstruction";
  }
  return null;
}
