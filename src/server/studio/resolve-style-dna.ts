import { OcrProviderError } from "@/lib/ocr-provider-errors";
import {
  extractAssetStyleDna,
  type ExtractAssetVisionResult,
  type ExtractStyleDnaInput,
} from "@/server/studio/extract-asset-style-dna";
import { readStyleDnaCache, writeStyleDnaCache } from "@/server/studio/style-dna-cache";
import {
  classifyStyleDnaImageUrl,
  resolveStyleDnaImageUrlForProvider,
} from "@/server/studio/style-dna-image-url";
import type { StyleDnaBillingMode, StyleDnaErrorCode } from "@/types/studio-style-dna";
import { STYLE_DNA_ERROR_CODES, styleDnaHttpStatus, styleDnaUserMessage } from "@/types/studio-style-dna";
import type { SessionUser } from "@/server/auth/session";

export type ResolveStyleDnaInput = Omit<ExtractStyleDnaInput, "imageUrl"> & {
  imageUrl: string;
  forceRefresh?: boolean;
  billingMode?: StyleDnaBillingMode;
};

export type ResolveStyleDnaSuccess = {
  ok: true;
  data: ExtractAssetVisionResult;
  cached: boolean;
  billingMode: StyleDnaBillingMode;
};

export type ResolveStyleDnaFailure = {
  ok: false;
  error: string;
  code: StyleDnaErrorCode;
  status: number;
  userMessage: string;
};

export type ResolveStyleDnaResult = ResolveStyleDnaSuccess | ResolveStyleDnaFailure;

function isStyleDnaErrorCode(code: string): code is StyleDnaErrorCode {
  return (STYLE_DNA_ERROR_CODES as readonly string[]).includes(code);
}

function mapExtractionError(input: {
  error: string;
  code: string;
  status: number;
  userMessage?: string;
}): ResolveStyleDnaFailure {
  if (isStyleDnaErrorCode(input.code)) {
    return {
      ok: false,
      error: input.error,
      code: input.code,
      status: input.status,
      userMessage: input.userMessage ?? styleDnaUserMessage(input.code),
    };
  }
  const legacyMap: Record<string, StyleDnaErrorCode> = {
    IMAGE_REQUIRED: "STYLE_DNA_IMAGE_MISSING",
    OPENAI_NOT_CONFIGURED: "STYLE_DNA_PROVIDER_FAILED",
    EXTRACTION_FAILED: "STYLE_DNA_PROVIDER_FAILED",
  };
  const code = legacyMap[input.code] ?? "STYLE_DNA_INTERNAL_ERROR";
  return {
    ok: false,
    error: input.error,
    code,
    status: styleDnaHttpStatus(code),
    userMessage: styleDnaUserMessage(code),
  };
}

function mapThrownError(error: unknown): ResolveStyleDnaFailure {
  if (error instanceof OcrProviderError) {
    const code: StyleDnaErrorCode =
      error.errorCode === "OPENAI_TIMEOUT" || error.errorCode === "OCR_TIMEOUT"
        ? "STYLE_DNA_TIMEOUT"
        : "STYLE_DNA_PROVIDER_FAILED";
    return {
      ok: false,
      error: error.message,
      code,
      status: styleDnaHttpStatus(code),
      userMessage: styleDnaUserMessage(code),
    };
  }
  const message = error instanceof Error ? error.message : "Style DNA extraction failed.";
  if (/timeout/i.test(message)) {
    return {
      ok: false,
      error: message,
      code: "STYLE_DNA_TIMEOUT",
      status: styleDnaHttpStatus("STYLE_DNA_TIMEOUT"),
      userMessage: styleDnaUserMessage("STYLE_DNA_TIMEOUT"),
    };
  }
  if (/unsupported|invalid.*image|unreadable|fetch.*image/i.test(message)) {
    return {
      ok: false,
      error: message,
      code: "STYLE_DNA_IMAGE_UNREADABLE",
      status: styleDnaHttpStatus("STYLE_DNA_IMAGE_UNREADABLE"),
      userMessage: styleDnaUserMessage("STYLE_DNA_IMAGE_UNREADABLE"),
    };
  }
  return {
    ok: false,
    error: message,
    code: "STYLE_DNA_PROVIDER_FAILED",
    status: styleDnaHttpStatus("STYLE_DNA_PROVIDER_FAILED"),
    userMessage: styleDnaUserMessage("STYLE_DNA_PROVIDER_FAILED"),
  };
}

export function resolveEditorStyleDnaBillingMode(input: {
  explicit?: StyleDnaBillingMode;
  analysisRunId?: string | null;
  sessionId?: string | null;
  productionTransactionId?: string;
}): StyleDnaBillingMode {
  if (input.explicit) {
    return input.explicit;
  }
  if (input.productionTransactionId?.trim()) {
    return "production_contract";
  }
  // Editor premium wizard sends sessionId even before analysisRunId is stamped.
  if (input.analysisRunId?.trim() || input.sessionId?.trim()) {
    return "premium_session";
  }
  return "standalone";
}

export { classifyStyleDnaImageUrl };

/** Shared Style DNA resolver — cache-first, typed errors, no wallet billing here. */
export async function resolveStyleDna(
  viewer: Pick<SessionUser, "id">,
  input: ResolveStyleDnaInput
): Promise<ResolveStyleDnaResult> {
  const rawImageUrl = input.imageUrl.trim();
  const billingMode = input.billingMode ?? "standalone";
  const imageUrlType = classifyStyleDnaImageUrl(rawImageUrl);

  if (!rawImageUrl) {
    const code: StyleDnaErrorCode = "STYLE_DNA_IMAGE_MISSING";
    return {
      ok: false,
      error: "Reference image URL is required.",
      code,
      status: styleDnaHttpStatus(code),
      userMessage: styleDnaUserMessage(code),
    };
  }

  const resolvedUrl = resolveStyleDnaImageUrlForProvider(rawImageUrl);
  if (!resolvedUrl.ok) {
    const code: StyleDnaErrorCode =
      resolvedUrl.urlType === "blob" || resolvedUrl.urlType === "data"
        ? "STYLE_DNA_IMAGE_UNREADABLE"
        : "STYLE_DNA_IMAGE_MISSING";
    return {
      ok: false,
      error: resolvedUrl.error,
      code,
      status: styleDnaHttpStatus(code),
      userMessage: styleDnaUserMessage(code),
    };
  }

  const imageUrl = resolvedUrl.url;

  if (!input.forceRefresh) {
    const cached = readStyleDnaCache(imageUrl, input.sourceKind) ?? readStyleDnaCache(rawImageUrl, input.sourceKind);
    if (cached) {
      return {
        ok: true,
        data: cached,
        cached: true,
        billingMode: "cache_hit",
      };
    }
  }

  try {
    const result = await extractAssetStyleDna(viewer, {
      imageUrl,
      sourceKind: input.sourceKind,
      sourceName: input.sourceName,
      derivationJobId: input.derivationJobId,
      skipLegacyMetering: input.skipLegacyMetering,
    });

    if ("error" in result) {
      return mapExtractionError(result);
    }

    writeStyleDnaCache(imageUrl, input.sourceKind, result.data);
    if (rawImageUrl !== imageUrl) {
      writeStyleDnaCache(rawImageUrl, input.sourceKind, result.data);
    }

    return {
      ok: true,
      data: result.data,
      cached: false,
      billingMode,
    };
  } catch (error) {
    return mapThrownError(error);
  }
}
