import {
  draftPatchFromVisionAnalysis,
  mapVisionAnalysisToStyleDna,
  mapVisionJsonToAnalysis,
} from "@/lib/studio-asset-vision-analysis";
import {
  analyzeAssetReferenceVisionWithOpenAi,
  resolveAssetVisionModel,
} from "@/server/studio/analyze-asset-reference-vision";
import { meterAssetDerivation } from "@/server/provider-cost/studio-cost-metering";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { StudioAssetKind } from "@/types/studio-asset-creation";
import type { SessionUser } from "@/server/auth/session";

export type ExtractStyleDnaInput = {
  imageUrl: string;
  sourceKind: StudioAssetKind;
  sourceName: string;
  derivationJobId: string;
};

export type ExtractAssetVisionResult = {
  styleDna: AssetStyleDna;
  visionAnalysis: AssetVisionAnalysis;
};

export async function extractAssetStyleDna(
  viewer: Pick<SessionUser, "id">,
  input: ExtractStyleDnaInput
): Promise<{ data: ExtractAssetVisionResult } | { error: string; code: string; status: number }> {
  const imageUrl = input.imageUrl.trim();
  if (!imageUrl) {
    return { error: "Reference image URL is required.", code: "IMAGE_REQUIRED", status: 400 };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      error: "Style analysis is not configured.",
      code: "OPENAI_NOT_CONFIGURED",
      status: 503,
    };
  }

  const model = resolveAssetVisionModel();

  try {
    const json = await analyzeAssetReferenceVisionWithOpenAi(
      {
        imageUrl,
        sourceKind: input.sourceKind,
        sourceName: input.sourceName,
        userDescription: `Extract universal vision analysis for derivative ${input.sourceKind} asset.`,
      },
      apiKey
    );

    const visionAnalysis = mapVisionJsonToAnalysis(json, { sourceName: input.sourceName });
    const styleDna = mapVisionAnalysisToStyleDna(visionAnalysis);

    meterAssetDerivation({
      ctx: { userId: viewer.id, feature: "asset_derivation", relatedJobId: input.derivationJobId },
      phase: "vision",
      status: "completed",
      sourceKind: input.sourceKind,
      imageCount: 1,
      model,
    });

    return { data: { styleDna, visionAnalysis } };
  } catch (e) {
    meterAssetDerivation({
      ctx: { userId: viewer.id, feature: "asset_derivation", relatedJobId: input.derivationJobId },
      phase: "vision",
      status: "failed",
      sourceKind: input.sourceKind,
      imageCount: 1,
      model,
    });
    const message = e instanceof Error ? e.message : "Style DNA extraction failed.";
    return { error: message, code: "EXTRACTION_FAILED", status: 502 };
  }
}

export { draftPatchFromVisionAnalysis, mapVisionAnalysisToStyleDna };
