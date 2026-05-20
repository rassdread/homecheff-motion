import { OcrProviderError } from "@/lib/ocr-provider-errors";
import { OCR_DETECT_SERVER_TIMEOUT_MS } from "@/lib/instant-ocr-scan";
import { detectTextBlocksFromImageUrl } from "@/server/image-text-detection";
import type { ImageTextDetectionResult } from "@/server/image-text-detection/types";

export class OcrDetectTimeoutError extends Error {
  readonly code = "OCR_TIMEOUT";

  constructor(message = "OCR detection timed out.") {
    super(message);
    this.name = "OcrDetectTimeoutError";
  }
}

function logOcrDetect(event: string, payload?: Record<string, unknown>): void {
  console.info("[ocr-detect]", event, payload ?? {});
}

export async function detectTextBlocksFromImageUrlWithTimeout(
  imageUrl: string,
  scanRequestId: string
): Promise<ImageTextDetectionResult> {
  logOcrDetect("start", { scanRequestId, imageUrl: imageUrl.slice(0, 80) });

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      detectTextBlocksFromImageUrl(imageUrl),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new OcrDetectTimeoutError()), OCR_DETECT_SERVER_TIMEOUT_MS);
      }),
    ]);
    logOcrDetect("response", {
      scanRequestId,
      provider: result.provider,
      blockCount: result.blocks.length,
    });
    return result;
  } catch (error) {
    if (error instanceof OcrDetectTimeoutError) {
      logOcrDetect("timeout", {
        scanRequestId,
        errorCode: error.code,
        status: 504,
        provider: "openai",
      });
      throw error;
    }
    const errorCode =
      error instanceof OcrProviderError ? error.errorCode : "OCR_PROVIDER_ERROR";
    const provider =
      error instanceof OcrProviderError ? error.provider ?? "openai" : "openai";
    const message = error instanceof Error ? error.message : "OCR failed.";
    logOcrDetect("error", {
      scanRequestId,
      errorCode,
      status: 503,
      provider,
      message,
    });
    throw error;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
