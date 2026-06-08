import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";

export type WizardSourceReference = {
  sourceReferenceImageUrl: string;
  sourceReferenceStorageKey: string;
  sourceReferenceName: string;
};

export function recordWizardSourceReference(params: {
  imageUrl: string;
  storageKey: string;
  name?: string;
}): WizardSourceReference {
  const imageUrl = params.imageUrl.trim();
  return {
    sourceReferenceImageUrl: imageUrl,
    sourceReferenceStorageKey: params.storageKey.trim(),
    sourceReferenceName: params.name?.trim() || "upload",
  };
}

export function resolveWizardSourceReference(draft: AssetWizardDraft): WizardSourceReference | null {
  const url = draft.sourceReferenceImageUrl?.trim() || draft.referenceImageUrl?.trim();
  if (!url) {
    return null;
  }
  return {
    sourceReferenceImageUrl: url,
    sourceReferenceStorageKey:
      draft.sourceReferenceStorageKey?.trim() || draft.referenceStorageKey?.trim() || "",
    sourceReferenceName:
      draft.sourceReferenceName?.trim() ||
      draft.derivationSource?.assetName?.trim() ||
      "upload",
  };
}

export function hasWizardSourceReference(draft: AssetWizardDraft): boolean {
  return Boolean(resolveWizardSourceReference(draft));
}

/** Clear generated output fields only — keep sourceReference intact. */
export function clearWizardGeneratedReferenceOutput(
  draft: AssetWizardDraft
): Partial<AssetWizardDraft> {
  return {
    referenceGenerationStatus: "idle",
    referenceGenerationError: "",
    generatedReferencePreviewUrl: "",
    generatedReferenceStorageKey: "",
    referenceGenerationPrompt: "",
    referenceImageUrl:
      draft.referenceMode === "upload" ? draft.referenceImageUrl : "",
    referenceStorageKey:
      draft.referenceMode === "upload" ? draft.referenceStorageKey : "",
  };
}
