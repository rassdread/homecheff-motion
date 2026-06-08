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
  if (!hasUpfrontSourceReference(draft)) {
    return false;
  }
  if (draft.referenceMode === "upload" && draft.referenceImageUrl && !draft.generatedReferencePreviewUrl) {
    return false;
  }
  return (
    draft.derivationFlow ||
    draft.entryPath === "image_only" ||
    draft.entryPath === "image_and_prompt" ||
    draft.entryPath === "existing_asset" ||
    draft.entryPath === "derive_from_reference" ||
    Boolean(draft.sourceTransformChoice || draft.sourceTransformCustom.trim())
  );
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

  const result = [...steps];

  const needsReferenceForImagePath =
    (draft.entryPath === "image_only" || draft.entryPath === "image_and_prompt") &&
    hasUpfrontSourceReference(draft);

  if (needsReferenceForImagePath && !result.includes("reference")) {
    const anchor = result.indexOf("proposal") >= 0 ? result.indexOf("proposal") + 1 : result.indexOf("input") + 1;
    if (anchor > 0) {
      result.splice(anchor, 0, "reference");
    }
  }

  if (shouldShowSourceTransformStep(draft) && !result.includes("source_transform")) {
    const refIdx = result.indexOf("reference");
    if (refIdx >= 0) {
      result.splice(refIdx, 0, "source_transform");
    }
  }

  return result;
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
