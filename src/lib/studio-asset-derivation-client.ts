import { fetchSameOriginJson } from "@/lib/client-api-fetch";
import type { AssetDerivationSourceListItem, AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

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
}) {
  return fetchSameOriginJson<{
    ok: true;
    styleDna: AssetStyleDna;
    visionAnalysis: AssetVisionAnalysis;
  }>(
    "/api/studio/asset-derivation/analyze",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }
  );
}
