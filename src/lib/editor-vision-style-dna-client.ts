import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

export type EditorPremiumStyleDnaContext = {
  analysisRunId?: string | null;
  analysisId?: string | null;
  sessionId?: string | null;
  projectId?: string | null;
  assetId?: string | null;
  /** Parent premium-credits session — skip wallet gate on style-dna route. */
  billingMode?: "premium_session";
};

export type EditorPremiumStyleDnaApiResult =
  | {
      ok: true;
      data: { styleDna: AssetStyleDna; visionAnalysis: AssetVisionAnalysis };
    }
  | { ok: false; status: number; error: string; code?: string };

export async function analyzeEditorPremiumStyleDnaApi(params: {
  imageUrl: string;
  sourceKind: StudioAssetKind;
  sourceName: string;
  derivationJobId: string;
  billingContext?: EditorPremiumStyleDnaContext;
}): Promise<EditorPremiumStyleDnaApiResult> {
  try {
    const res = await fetch("/api/editor/vision/style-dna", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        imageUrl: params.imageUrl,
        sourceKind: params.sourceKind,
        sourceName: params.sourceName,
        derivationJobId: params.derivationJobId,
        billingMode: params.billingContext?.billingMode ?? "premium_session",
        ...params.billingContext,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      styleDna?: AssetStyleDna;
      visionAnalysis?: AssetVisionAnalysis;
      error?: string;
      code?: string;
    };
    if (!res.ok || !body.styleDna || !body.visionAnalysis) {
      return {
        ok: false,
        status: res.status,
        error: body.error ?? "Style DNA analysis failed.",
        code: body.code,
      };
    }
    return {
      ok: true,
      data: { styleDna: body.styleDna, visionAnalysis: body.visionAnalysis },
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: error instanceof Error ? error.message : "Style DNA request failed.",
    };
  }
}
