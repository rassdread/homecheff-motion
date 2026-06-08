import { analyzeAssetStyleDnaApi } from "@/lib/studio-asset-derivation-client";
import { draftPatchFromVisionAnalysis } from "@/lib/studio-asset-vision-analysis";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { resolveWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

export async function triggerWizardSourceVisionAnalysis(params: {
  draft: AssetWizardDraft;
  kind: StudioAssetKind;
  derivationJobId: string;
}): Promise<
  | { ok: true; patch: Partial<AssetWizardDraft> }
  | { ok: false; patch: Partial<AssetWizardDraft>; error: string }
> {
  const source = resolveWizardSourceReference(params.draft);
  if (!source?.sourceReferenceImageUrl) {
    return {
      ok: false,
      patch: {
        sourceVisionAnalysisStatus: "failed",
        sourceVisionAnalysisError: "Source image is required for analysis.",
        derivationStyleDnaStatus: "failed",
        derivationStyleDnaError: "Source image is required for analysis.",
      },
      error: "Source image is required for analysis.",
    };
  }

  const res = await analyzeAssetStyleDnaApi({
    imageUrl: source.sourceReferenceImageUrl,
    sourceKind: params.draft.derivationTargetKind ?? params.kind,
    sourceName: source.sourceReferenceName,
    derivationJobId: params.derivationJobId,
  });

  if (!res.ok) {
    const error = (res.data as { error?: string }).error ?? "Vision analysis failed.";
    return {
      ok: false,
      patch: {
        sourceVisionAnalysisStatus: "failed",
        sourceVisionAnalysisError: error,
        derivationStyleDnaStatus: "failed",
        derivationStyleDnaError: error,
      },
      error,
    };
  }

  return {
    ok: true,
    patch: draftPatchFromVisionAnalysis(res.data.visionAnalysis),
  };
}

export function visionAnalysisLoadingPatch(): Partial<AssetWizardDraft> {
  return {
    sourceVisionAnalysisStatus: "loading",
    sourceVisionAnalysisError: "",
    sourceVisionAnalysis: null,
    derivationStyleDnaStatus: "loading",
    derivationStyleDnaError: "",
    derivationStyleDna: null,
  };
}
