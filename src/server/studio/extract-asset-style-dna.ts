import { OcrProviderError } from "@/lib/ocr-provider-errors";
import {
  draftPatchFromVisionAnalysis,
  mapVisionAnalysisToStyleDna,
  mapVisionJsonToAnalysis,
} from "@/lib/studio-asset-vision-analysis";
import {
  analyzeAssetReferenceVisionWithOpenAiTracked,
  resolveAssetVisionModel,
} from "@/server/studio/analyze-asset-reference-vision";
import { meterAssetDerivation } from "@/server/provider-cost/studio-cost-metering";
import type { OpenAiVisionUsageMetrics } from "@/server/openai/openai-vision-usage";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { StudioAssetKind } from "@/types/studio-asset-creation";
import type { StyleDnaErrorCode } from "@/types/studio-style-dna";
import { styleDnaHttpStatus, styleDnaUserMessage } from "@/types/studio-style-dna";
import type { SessionUser } from "@/server/auth/session";

export type ExtractStyleDnaInput = {
  imageUrl: string;
  sourceKind: StudioAssetKind;
  sourceName: string;
  derivationJobId: string;
  /** Skip legacy asset_derivation metering — editor premium logs via recordEditorPremiumProviderCost. */
  skipLegacyMetering?: boolean;
};

export type ExtractAssetVisionResult = {
  styleDna: AssetStyleDna;
  visionAnalysis: AssetVisionAnalysis;
  metrics?: OpenAiVisionUsageMetrics;
};

function mapStyleDnaThrownError(error: unknown): {
  error: string;
  code: StyleDnaErrorCode;
  status: number;
  userMessage: string;
} {
  if (error instanceof OcrProviderError) {
    const code: StyleDnaErrorCode =
      error.errorCode === "OPENAI_TIMEOUT" || error.errorCode === "OCR_TIMEOUT"
        ? "STYLE_DNA_TIMEOUT"
        : "STYLE_DNA_PROVIDER_FAILED";
    return {
      error: error.message,
      code,
      status: styleDnaHttpStatus(code),
      userMessage: styleDnaUserMessage(code),
    };
  }
  const message = error instanceof Error ? error.message : "Style DNA extraction failed.";
  if (/timeout/i.test(message)) {
    const code: StyleDnaErrorCode = "STYLE_DNA_TIMEOUT";
    return {
      error: message,
      code,
      status: styleDnaHttpStatus(code),
      userMessage: styleDnaUserMessage(code),
    };
  }
  const code: StyleDnaErrorCode = "STYLE_DNA_PROVIDER_FAILED";
  return {
    error: message,
    code,
    status: styleDnaHttpStatus(code),
    userMessage: styleDnaUserMessage(code),
  };
}

export async function extractAssetStyleDna(
  viewer: Pick<SessionUser, "id">,
  input: ExtractStyleDnaInput
): Promise<
  | { data: ExtractAssetVisionResult }
  | { error: string; code: StyleDnaErrorCode; status: number; userMessage: string }
> {
  const imageUrl = input.imageUrl.trim();
  if (!imageUrl) {
    const code: StyleDnaErrorCode = "STYLE_DNA_IMAGE_MISSING";
    return {
      error: "Reference image URL is required.",
      code,
      status: styleDnaHttpStatus(code),
      userMessage: styleDnaUserMessage(code),
    };
  }

  const lower = imageUrl.toLowerCase();
  if (lower.startsWith("blob:") || lower.startsWith("data:")) {
    const code: StyleDnaErrorCode = "STYLE_DNA_IMAGE_UNREADABLE";
    return {
      error: "Local browser image URLs cannot be analyzed.",
      code,
      status: styleDnaHttpStatus(code),
      userMessage: styleDnaUserMessage(code),
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const code: StyleDnaErrorCode = "STYLE_DNA_PROVIDER_FAILED";
    return {
      error: "Style analysis is not configured.",
      code,
      status: styleDnaHttpStatus(code),
      userMessage: styleDnaUserMessage(code),
    };
  }

  const model = resolveAssetVisionModel();

  try {
    const tracked = await analyzeAssetReferenceVisionWithOpenAiTracked(
      {
        imageUrl,
        sourceKind: input.sourceKind,
        sourceName: input.sourceName,
        userDescription: `Extract universal vision analysis for derivative ${input.sourceKind} asset.`,
      },
      apiKey
    );

    const visionAnalysis = mapVisionJsonToAnalysis(tracked.json, { sourceName: input.sourceName });
    const styleDna = mapVisionAnalysisToStyleDna(visionAnalysis);

    if (!input.skipLegacyMetering) {
      meterAssetDerivation({
        ctx: { userId: viewer.id, feature: "asset_derivation", relatedJobId: input.derivationJobId },
        phase: "vision",
        status: "completed",
        sourceKind: input.sourceKind,
        imageCount: 1,
        model,
      });
    }

    return { data: { styleDna, visionAnalysis, metrics: tracked.metrics } };
  } catch (e) {
    if (!input.skipLegacyMetering) {
      meterAssetDerivation({
        ctx: { userId: viewer.id, feature: "asset_derivation", relatedJobId: input.derivationJobId },
        phase: "vision",
        status: "failed",
        sourceKind: input.sourceKind,
        imageCount: 1,
        model,
      });
    }
    return mapStyleDnaThrownError(e);
  }
}

export { draftPatchFromVisionAnalysis, mapVisionAnalysisToStyleDna };
