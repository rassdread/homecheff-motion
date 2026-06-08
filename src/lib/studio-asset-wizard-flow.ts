import {
  wizardChoiceDefAtIndex,
  wizardChoiceStepsForKind,
  wizardStepsForChoiceFlow,
} from "@/lib/studio-asset-wizard-choices";
import { wizardStepsForDerivationFlow } from "@/lib/studio-asset-derivation-flow";
import type {
  AssetCreateEntryPath,
  AssetCreationWizardStep,
  StudioAssetKind,
} from "@/types/studio-asset-creation";
import { normalizeAssetCreateEntryPath } from "@/lib/studio-asset-create-entry-path";

/** Ordered wizard steps for a given entry path (after kind is chosen). */
export function wizardStepsForEntryPath(
  entryPath: AssetCreateEntryPath,
  options?: { includeKind?: boolean }
): AssetCreationWizardStep[] {
  const normalizedPath = normalizeAssetCreateEntryPath(entryPath);
  const steps: AssetCreationWizardStep[] = options?.includeKind ? ["kind"] : [];
  steps.push("entry");

  switch (normalizedPath) {
    case "design":
      steps.push("essentials", "readiness", "save");
      break;
    case "prompt_only":
    case "image_only":
    case "image_and_prompt":
      steps.push("input", "proposal", "essentials", "readiness", "save");
      break;
    case "existing_asset":
      steps.push(
        "derive_source",
        "derive_target_kind",
        "derive_transform",
        "derive_preview",
        "reference",
        "readiness",
        "save"
      );
      break;
    case "derive_from_reference":
      steps.push(
        "derive_source",
        "derive_target_kind",
        "derive_transform",
        "derive_preview",
        "reference",
        "readiness",
        "save"
      );
      break;
    default:
      steps.push("essentials", "readiness", "save");
  }

  return steps;
}

export function nextWizardStep(
  steps: AssetCreationWizardStep[],
  current: AssetCreationWizardStep
): AssetCreationWizardStep | null {
  const index = steps.indexOf(current);
  if (index < 0 || index >= steps.length - 1) {
    return null;
  }
  return steps[index + 1] ?? null;
}

export function previousWizardStep(
  steps: AssetCreationWizardStep[],
  current: AssetCreationWizardStep
): AssetCreationWizardStep | null {
  const index = steps.indexOf(current);
  if (index <= 0) {
    return null;
  }
  return steps[index - 1] ?? null;
}

export function wizardStepIndex(
  steps: AssetCreationWizardStep[],
  current: AssetCreationWizardStep
): number {
  return Math.max(0, steps.indexOf(current));
}

export function entryPathNeedsInputStep(path: AssetCreateEntryPath): boolean {
  return path !== "design";
}

export function entryPathNeedsProposalStep(path: AssetCreateEntryPath): boolean {
  return path === "prompt_only" || path === "image_only" || path === "image_and_prompt";
}

export function wizardStepSequenceForDraft(
  draft: {
    kind: StudioAssetKind;
    entryPath: AssetCreateEntryPath;
    choiceBasedFlow: boolean;
    derivationFlow: boolean;
    derivationTargetKind?: StudioAssetKind | null;
  },
  options?: { includeKind?: boolean }
): AssetCreationWizardStep[] {
  if (draft.derivationFlow) {
    const target = draft.derivationTargetKind ?? draft.kind;
    return wizardStepsForDerivationFlow(target === "world" ? "character" : target, options);
  }
  if (draft.choiceBasedFlow) {
    return wizardStepsForChoiceFlow(draft.kind, options);
  }
  return wizardStepsForEntryPath(draft.entryPath, options);
}

export function choiceDefForWizardStep(
  kind: StudioAssetKind,
  stepSequence: AssetCreationWizardStep[],
  currentStep: AssetCreationWizardStep,
  stepIndex: number
) {
  if (currentStep !== "choice") {
    return null;
  }
  let choiceIdx = 0;
  for (let i = 0; i < stepIndex; i++) {
    if (stepSequence[i] === "choice") {
      choiceIdx++;
    }
  }
  return wizardChoiceDefAtIndex(kind, choiceIdx);
}

export function choiceStepLabelsForKind(kind: StudioAssetKind): string[] {
  return wizardChoiceStepsForKind(kind).map((def) => def.titleKey);
}

export { wizardStepsForChoiceFlow };
