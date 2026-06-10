import { fetchSameOriginJson, type SameOriginJsonResult } from "@/lib/client-api-fetch";
import type { AssetDerivationSourceListItem, AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

/** Route `src/app/api/studio/asset-derivation/analyze/route.ts` exports POST only. */
export const ANALYZE_ASSET_DERIVATION_HTTP_METHOD = "POST" as const;

export type AnalyzeAssetStyleDnaApiSuccess = {
  ok: true;
  styleDna: AssetStyleDna;
  visionAnalysis: AssetVisionAnalysis;
};

export type AnalyzeAssetStyleDnaApiResult = SameOriginJsonResult<AnalyzeAssetStyleDnaApiSuccess>;

export async function fetchAssetDerivationSources() {
  return fetchSameOriginJson<{ ok: true; sources: AssetDerivationSourceListItem[] }>(
    "/api/studio/asset-derivation/sources",
    { method: "GET" }
  );
}

export async function recordAssetDerivationAcceptApi(params: {
  derivationJobId: string;
  sourceKind: string;
  targetKind: StudioAssetKind;
  sourceAssetId?: string | null;
  sourceAssetName?: string;
}) {
  return fetchSameOriginJson<{ ok: true }>("/api/studio/asset-derivation/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function analyzeAssetStyleDnaApi(params: {
  imageUrl: string;
  sourceKind: StudioAssetKind;
  sourceName: string;
  derivationJobId: string;
}): Promise<AnalyzeAssetStyleDnaApiResult> {
  return fetchSameOriginJson<AnalyzeAssetStyleDnaApiSuccess>(
    "/api/studio/asset-derivation/analyze",
    {
      method: ANALYZE_ASSET_DERIVATION_HTTP_METHOD,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }
  );
}
