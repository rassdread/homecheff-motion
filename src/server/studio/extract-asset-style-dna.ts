import { mapAnalysisToStyleDna } from "@/lib/studio-asset-style-dna";
import { analyzeCharacterReferenceImagesWithOpenAi } from "@/server/studio/analyze-character-reference-images";
import { meterAssetDerivation } from "@/server/provider-cost/studio-cost-metering";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { StudioAssetKind } from "@/types/studio-asset-creation";
import type { SessionUser } from "@/server/auth/session";

export type ExtractStyleDnaInput = {
  imageUrl: string;
  sourceKind: StudioAssetKind;
  sourceName: string;
  derivationJobId: string;
};

export async function extractAssetStyleDna(
  viewer: Pick<SessionUser, "id">,
  input: ExtractStyleDnaInput
): Promise<{ data: AssetStyleDna } | { error: string; code: string; status: number }> {
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

  const model =
    process.env.OPENAI_CHARACTER_IDENTITY_MODEL?.trim() ||
    process.env.OPENAI_VISION_MODEL?.trim() ||
    "gpt-4o-mini";

  try {
    const analysis = await analyzeCharacterReferenceImagesWithOpenAi(
      {
        imageUrls: [imageUrl],
        imageRoles: ["primary"],
        userDescription: `Source ${input.sourceKind}: ${input.sourceName}. Extract style DNA for derivative asset.`,
        intendedUsage: "Reference-derived asset creation",
      },
      apiKey
    );

    meterAssetDerivation({
      ctx: { userId: viewer.id, feature: "asset_derivation", relatedJobId: input.derivationJobId },
      phase: "vision",
      status: "completed",
      sourceKind: input.sourceKind,
      imageCount: 1,
      model,
    });

    return { data: mapAnalysisToStyleDna(analysis) };
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
