import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import {
  hasWizardSourceReference,
  resolveWizardSourceReference,
} from "@/lib/studio-asset-wizard-source-reference";
import type { AssetCreationWizardStep, StudioAssetKind } from "@/types/studio-asset-creation";
import { kindSupportsReferenceStep } from "@/lib/studio-asset-wizard-choices";

/** User already picked/uploaded a source image before the reference step. */
export function hasUpfrontSourceReference(draft: AssetWizardDraft): boolean {
  return hasWizardSourceReference(draft);
}

/** Skip upload / generate / skip mode grid — go straight to variant generation. */
export function shouldSkipReferenceModeChoice(draft: AssetWizardDraft): boolean {
  return hasUpfrontSourceReference(draft);
}

/** Progress label: source flows show variant generation, not generic reference choice. */
export function wizardStepLabelKeyForDraft(
  step: AssetCreationWizardStep,
  draft: AssetWizardDraft
): string | null {
  if (step === "reference" && hasUpfrontSourceReference(draft)) {
    return "studio.assetCreation.wizard.step.generateVariant";
  }
  return null;
}

function shouldIncludeReferenceStep(draft: AssetWizardDraft): boolean {
  if (!kindSupportsReferenceStep(draft.kind)) {
    return false;
  }
  if (hasUpfrontSourceReference(draft)) {
    return true;
  }
  if (draft.choiceBasedFlow && !draft.derivationFlow) {
    return true;
  }
  if (draft.entryPath === "design" || draft.entryPath === "prompt_only") {
    return true;
  }
  return false;
}

function insertReferenceStep(
  steps: AssetCreationWizardStep[],
  draft: AssetWizardDraft
): AssetCreationWizardStep[] {
  const result = [...steps];
  if (result.includes("reference")) {
    return result;
  }

  if (draft.derivationFlow) {
    const previewIdx = result.indexOf("derive_preview");
    const anchor = previewIdx >= 0 ? previewIdx + 1 : result.indexOf("readiness");
    result.splice(anchor >= 0 ? anchor : result.length, 0, "reference");
    return result;
  }

  if (draft.entryPath === "image_only" || draft.entryPath === "image_and_prompt") {
    const proposalIdx = result.indexOf("proposal");
    const inputIdx = result.indexOf("input");
    const anchor = proposalIdx >= 0 ? proposalIdx + 1 : inputIdx >= 0 ? inputIdx + 1 : -1;
    if (anchor > 0) {
      result.splice(anchor, 0, "reference");
    } else {
      const readinessIdx = result.indexOf("readiness");
      result.splice(readinessIdx >= 0 ? readinessIdx : result.length, 0, "reference");
    }
    return result;
  }

  const readinessIdx = result.indexOf("readiness");
  result.splice(readinessIdx >= 0 ? readinessIdx : result.length, 0, "reference");
  return result;
}

function insertSourceTransformStep(
  steps: AssetCreationWizardStep[],
  draft: AssetWizardDraft
): AssetCreationWizardStep[] {
  if (!shouldShowSourceTransformStep(draft) || steps.includes("source_transform")) {
    return steps;
  }
  const result = [...steps];
  const refIdx = result.indexOf("reference");
  if (refIdx >= 0) {
    result.splice(refIdx, 0, "source_transform");
  }
  return result;
}

/** Dedicated transformation prompt step (not covered by derive_transform). */
export function shouldShowSourceTransformStep(draft: AssetWizardDraft): boolean {
  if (!hasUpfrontSourceReference(draft)) {
    return false;
  }
  if (draft.derivationFlow) {
    return false;
  }
  if (draft.entryPath === "image_only" || draft.entryPath === "image_and_prompt") {
    return true;
  }
  return Boolean(draft.sourceTransformChoice || draft.sourceTransformCustom.trim());
}

export function canAdvanceFromSourceTransformStep(draft: AssetWizardDraft): boolean {
  if (draft.sourceTransformChoice === "custom") {
    return Boolean(draft.sourceTransformCustom.trim());
  }
  return Boolean(draft.sourceTransformChoice.trim());
}

export function buildSourceTransformSummaryPrompt(draft: AssetWizardDraft): string {
  const source = resolveWizardSourceReference(draft);
  const sourceName = source?.sourceReferenceName ?? "source image";
  const custom = draft.sourceTransformCustom.trim();
  const choice = draft.sourceTransformChoice.trim();

  if (choice === "custom" && custom) {
    return `Using "${sourceName}" as the style base: ${custom}. Preserve shape language, main colors, and brand identity. Change only role, outfit, props, or context as described.`;
  }

  if (custom && choice) {
    return `Using "${sourceName}" as the style base, create a ${choice.replace(/_/g, " ")} variant. ${custom}. Preserve shape language, main colors, and brand identity.`;
  }

  if (choice) {
    return `Using "${sourceName}" as the style base, create a ${choice.replace(/_/g, " ")} variant. Preserve shape language, main colors, and brand identity — change only role, outfit, props, or context.`;
  }

  if (custom) {
    return `Using "${sourceName}" as the style base: ${custom}. Preserve shape language, main colors, and brand identity.`;
  }

  return draft.summaryPrompt;
}

export function resolveTransformLabelForGeneration(draft: AssetWizardDraft): string | undefined {
  if (draft.derivationTransformChoice) {
    return draft.derivationTransformCustom.trim() || draft.derivationTransformChoice.replace(/_/g, " ");
  }
  if (draft.sourceTransformChoice === "custom") {
    return draft.sourceTransformCustom.trim() || undefined;
  }
  if (draft.sourceTransformChoice) {
    return draft.sourceTransformCustom.trim()
      ? `${draft.sourceTransformChoice.replace(/_/g, " ")} — ${draft.sourceTransformCustom.trim()}`
      : draft.sourceTransformChoice.replace(/_/g, " ");
  }
  return undefined;
}

export function injectSourceReferenceWizardSteps(
  steps: AssetCreationWizardStep[],
  draft: AssetWizardDraft
): AssetCreationWizardStep[] {
  if (!kindSupportsReferenceStep(draft.kind)) {
    return steps;
  }

  let result = steps.filter((step) => step !== "reference" || shouldIncludeReferenceStep(draft));

  if (shouldIncludeReferenceStep(draft)) {
    result = insertReferenceStep(result, draft);
  }

  return insertSourceTransformStep(result, draft);
}

export type SourceReferenceFlowAuditRow = {
  path: string;
  hasSourceReference: boolean;
  showReferenceModeChoice: boolean;
  showSourceTransformStep: boolean;
  generateDirect: boolean;
};

export function auditSourceReferenceFlows(
  draft: AssetWizardDraft
): SourceReferenceFlowAuditRow[] {
  const paths = [
    "design",
    "prompt_only",
    "image_only",
    "image_and_prompt",
    "derive_from_reference",
    "existing_asset",
  ] as const;

  return paths.map((path) => {
    const sample: AssetWizardDraft = {
      ...draft,
      entryPath: path,
      derivationFlow: path === "derive_from_reference" || path === "existing_asset",
      choiceBasedFlow: path === "design",
      sourceReferenceImageUrl: path.includes("image") ? "https://example.com/src.png" : draft.sourceReferenceImageUrl,
    };
    if (path.includes("image") || path.startsWith("derive") || path === "existing_asset") {
      sample.sourceReferenceImageUrl = sample.sourceReferenceImageUrl || "https://example.com/src.png";
    }
    if (path === "derive_from_reference" || path === "existing_asset") {
      sample.derivationSource =
        sample.derivationSource ??
        ({
          sourceType: "upload",
          sourceKind: sample.kind,
          assetId: null,
          assetName: "Source asset",
          referenceImageUrl: "https://example.com/src.png",
          referenceStorageKey: "uploads/src.png",
        } as AssetWizardDraft["derivationSource"]);
    }
    return {
      path,
      hasSourceReference: hasUpfrontSourceReference(sample),
      showReferenceModeChoice: !shouldSkipReferenceModeChoice(sample),
      showSourceTransformStep: shouldShowSourceTransformStep(sample),
      generateDirect: shouldSkipReferenceModeChoice(sample),
    };
  });
}

export function kindUsesSourceImageGeneration(kind: StudioAssetKind): boolean {
  return kindSupportsReferenceStep(kind);
}
