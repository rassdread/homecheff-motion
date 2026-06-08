import { kindSupportsReferenceStep } from "@/lib/studio-asset-wizard-choices";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetCreationWizardStep, StudioAssetKind } from "@/types/studio-asset-creation";

export function wizardStepsForDerivationFlow(
  kind: StudioAssetKind,
  options?: { includeKind?: boolean }
): AssetCreationWizardStep[] {
  const steps: AssetCreationWizardStep[] = options?.includeKind ? ["kind"] : [];
  steps.push("derive_source", "derive_target_kind", "derive_transform", "derive_preview");
  const targetKind = kind;
  if (kindSupportsReferenceStep(targetKind)) {
    steps.push("reference");
  }
  steps.push("readiness", "save");
  return steps;
}

export function canAdvanceFromDeriveSource(draft: AssetWizardDraft): boolean {
  return Boolean(
    draft.derivationSource?.referenceImageUrl?.trim() &&
      draft.derivationStyleDnaStatus === "ready"
  );
}

export function canAdvanceFromDeriveTargetKind(draft: AssetWizardDraft): boolean {
  return draft.derivationTargetKind === "character" ||
    draft.derivationTargetKind === "prop" ||
    draft.derivationTargetKind === "location";
}

export function canAdvanceFromDeriveTransform(draft: AssetWizardDraft): boolean {
  const choice = draft.derivationTransformChoice;
  if (!choice) {
    return false;
  }
  if (choice === "custom") {
    return Boolean(draft.derivationTransformCustom.trim());
  }
  return true;
}

export function canAdvanceFromDerivePreview(draft: AssetWizardDraft): boolean {
  return Boolean(draft.summaryPrompt.trim() && draft.derivationStyleDna);
}
