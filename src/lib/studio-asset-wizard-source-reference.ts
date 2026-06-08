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
}): WizardSourceReference & Partial<Pick<AssetWizardDraft, "sourceVisionAnalysis" | "sourceVisionAnalysisStatus" | "sourceVisionAnalysisError" | "derivationStyleDna" | "derivationStyleDnaStatus" | "derivationStyleDnaError">> {
  const imageUrl = params.imageUrl.trim();
  return {
    sourceReferenceImageUrl: imageUrl,
    sourceReferenceStorageKey: params.storageKey.trim(),
    sourceReferenceName: params.name?.trim() || "upload",
    sourceVisionAnalysis: null,
    sourceVisionAnalysisStatus: "idle",
    sourceVisionAnalysisError: "",
    derivationStyleDna: null,
    derivationStyleDnaStatus: "idle",
    derivationStyleDnaError: "",
  };
}

function resolveWizardSourceImageUrl(draft: AssetWizardDraft): string {
  return (
    draft.sourceReferenceImageUrl?.trim() ||
    draft.derivationSource?.referenceImageUrl?.trim() ||
    draft.referenceImageUrl?.trim() ||
    ""
  );
}

function resolveWizardSourceStorageKey(draft: AssetWizardDraft): string {
  return (
    draft.sourceReferenceStorageKey?.trim() ||
    draft.derivationSource?.referenceStorageKey?.trim() ||
    draft.referenceStorageKey?.trim() ||
    ""
  );
}

export function resolveWizardSourceReference(draft: AssetWizardDraft): WizardSourceReference | null {
  const url = resolveWizardSourceImageUrl(draft);
  if (!url) {
    return null;
  }
  return {
    sourceReferenceImageUrl: url,
    sourceReferenceStorageKey: resolveWizardSourceStorageKey(draft),
    sourceReferenceName:
      draft.sourceReferenceName?.trim() ||
      draft.derivationSource?.assetName?.trim() ||
      "upload",
  };
}

export function hasWizardSourceReference(draft: AssetWizardDraft): boolean {
  if (draft.sourceReferenceImageUrl?.trim() || draft.sourceReferenceStorageKey?.trim()) {
    return true;
  }
  if (
    draft.derivationSource?.referenceImageUrl?.trim() ||
    draft.derivationSource?.referenceStorageKey?.trim()
  ) {
    return true;
  }
  return Boolean(draft.derivationSource?.assetId);
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
