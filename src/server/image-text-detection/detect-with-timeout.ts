import { OcrProviderError } from "@/lib/ocr-provider-errors";
import { logOcrPerf } from "@/lib/ocr-performance-log";
import { OCR_DETECT_SERVER_TIMEOUT_MS } from "@/lib/instant-ocr-scan";
import type { OcrDetectMode } from "@/lib/instant-ocr-scan";
import { detectTextBlocksFromImageUrl } from "@/server/image-text-detection";
import { getOcrHealthSnapshot } from "@/server/image-text-detection/ocr-health";
import type { ImageTextDetectionResult } from "@/server/image-text-detection/types";

export class OcrDetectTimeoutError extends Error {
  readonly code = "OCR_TIMEOUT";

  constructor(message = "OCR detection timed out.", readonly phase = "openai") {
    super(message);
    this.name = "OcrDetectTimeoutError";
  }
}

function logOcrDetect(event: string, payload?: Record<string, unknown>): void {
  console.info("[ocr-detect]", event, payload ?? {});
}

export async function detectTextBlocksFromImageUrlWithTimeout(
  imageUrl: string,
  scanRequestId: string,
  options?: { mode?: OcrDetectMode }
): Promise<ImageTextDetectionResult> {
  const mode = options?.mode ?? "fast";
  const started = Date.now();
  const providerName = getOcrHealthSnapshot().provider;
  logOcrDetect("start", { scanRequestId, mode, imageUrl: imageUrl.slice(0, 80), provider: providerName });

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      detectTextBlocksFromImageUrl(imageUrl, { mode }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new OcrDetectTimeoutError(
                `${providerName === "google" ? "Google Vision" : providerName === "openai" ? "OpenAI Vision" : "OCR"} timed out.`,
                providerName === "google" ? "google" : "openai"
              )
            ),
          OCR_DETECT_SERVER_TIMEOUT_MS
        );
      }),
    ]);
    const openAiMs = Date.now() - started;
    logOcrDetect("response", {
      scanRequestId,
      provider: result.provider,
      blockCount: result.blocks.length,
      openAiMs,
    });
    logOcrPerf("detect-complete", { scanRequestId, mode, openAiMs, blockCount: result.blocks.length });
    return result;
  } catch (error) {
    const durationMs = Date.now() - started;
    if (error instanceof OcrDetectTimeoutError) {
      logOcrDetect("timeout", {
        scanRequestId,
        errorCode: error.code,
        status: 504,
        provider: "openai",
        durationMs,
        phase: error.phase,
      });
      logOcrPerf("detect-timeout", { scanRequestId, mode, durationMs, phase: error.phase });
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
      durationMs,
    });
    logOcrPerf("detect-error", { scanRequestId, mode, durationMs, errorCode });
    throw error;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
