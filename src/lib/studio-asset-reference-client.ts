import { fetchSameOriginJson } from "@/lib/client-api-fetch";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

export type GenerateAssetReferenceResponse = {
  ok: true;
  referenceImageUrl: string;
  referenceStorageKey: string;
  thumbnailUrl: string;
  generatedPrompt: string;
  provider: string;
  generationMode?: import("@/types/studio-asset-image-generation").AssetImageGenerationMode;
  generationIntent?: import("@/types/studio-asset-image-generation").AssetGenerationIntent;
};

export async function fetchAssetReferenceGenerationStatus() {
  return fetchSameOriginJson<{ ok: true; available: boolean }>(
    "/api/studio/asset-references/generate",
    { method: "GET" }
  );
}

export async function generateStudioAssetReferenceApi(params: {
  kind: StudioAssetKind;
  summaryPrompt: string;
  choices: Record<string, string>;
  customTexts: Record<string, string>;
  generationId: string;
  derivation?: {
    styleDna: import("@/types/studio-asset-derivation").AssetStyleDna;
    sourceName: string;
    sourceKind: string;
    sourceAssetId?: string | null;
  };
  sourceReference?: {
    name: string;
    imageUrl?: string;
    transformLabel?: string;
    userPrompt?: string;
    preserveHint?: string;
    changeHint?: string;
    forbiddenHint?: string;
    visionHint?: string;
  };
  identityAudit?: import("@/types/studio-asset-identity-generation-audit").AssetIdentityGenerationAudit;
}) {
  return fetchSameOriginJson<GenerateAssetReferenceResponse>(
    "/api/studio/asset-references/generate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }
  );
}
