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
import { injectEvolutionWizardSteps } from "@/lib/studio-asset-wizard-evolution-flow";
import { injectWorkbenchWizardSteps } from "@/lib/studio-asset-wizard-workbench-flow";
import { injectPreparationWizardSteps } from "@/lib/studio-asset-wizard-preparation-flow";
import {
  injectSourceReferenceWizardSteps,
} from "@/lib/studio-asset-wizard-source-flow";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
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
    case "prepare_for_animation":
      steps.push("input", "essentials", "save");
      break;
    case "existing_asset":
      steps.push(
        "derive_source",
        "derive_target_kind",
        "derive_transform",
        "derive_preview",
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

export function entryPathIsImageOnlyUpload(path: AssetCreateEntryPath): boolean {
  return path === "image_only" || path === "prepare_for_animation";
}

export function wizardStepSequenceForDraft(
  draft: {
    kind: StudioAssetKind;
    entryPath: AssetCreateEntryPath;
    choiceBasedFlow: boolean;
    derivationFlow: boolean;
    derivationTargetKind?: StudioAssetKind | null;
    sourceReferenceImageUrl?: string;
    sourceReferenceStorageKey?: string;
    referenceImageUrl?: string;
    sourceTransformChoice?: string;
    sourceTransformCustom?: string;
    derivationSource?: AssetWizardDraft["derivationSource"];
  },
  options?: { includeKind?: boolean }
): AssetCreationWizardStep[] {
  let steps: AssetCreationWizardStep[];
  if (draft.derivationFlow) {
    const target = draft.derivationTargetKind ?? draft.kind;
    steps = wizardStepsForDerivationFlow(target === "world" ? "character" : target, options);
  } else if (draft.choiceBasedFlow) {
    steps = wizardStepsForChoiceFlow(draft.kind, options);
  } else {
    steps = wizardStepsForEntryPath(draft.entryPath, options);
  }
  return injectPreparationWizardSteps(
    injectWorkbenchWizardSteps(
      injectEvolutionWizardSteps(
        injectSourceReferenceWizardSteps(steps, draft as AssetWizardDraft),
        draft as AssetWizardDraft
      ),
      draft as AssetWizardDraft
    ),
    draft as AssetWizardDraft
  );
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
