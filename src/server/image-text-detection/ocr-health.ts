import {
  classifyOpenAiApiFailure,
  ocrUserMessage,
  type OcrErrorCode,
} from "@/lib/ocr-provider-errors";
import { OCR_DETECT_SERVER_TIMEOUT_MS } from "@/lib/instant-ocr-scan";

export type OcrHealthProvider = "openai" | "google" | "none";

export type OcrHealthSnapshot = {
  ok: boolean;
  provider: OcrHealthProvider;
  hasOpenAiKey: boolean;
  hasGoogleKey: boolean;
  model: string | null;
  errors: string[];
  checkedAt: string;
  statusReason: string;
  launchCritical: boolean;
};

export function getOcrHealthSnapshot(): OcrHealthSnapshot {
  const googleKey = process.env.GOOGLE_VISION_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const errors: string[] = [];

  let provider: OcrHealthProvider = "none";
  if (googleKey) {
    provider = "google";
  } else if (openAiKey) {
    provider = "openai";
  } else {
    errors.push(ocrUserMessage("OCR_PROVIDER_NOT_CONFIGURED"));
  }

  const model =
    provider === "openai"
      ? process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini"
      : provider === "google"
        ? "google-vision"
        : null;

  const statusReason =
    provider === "google"
      ? "Google Vision API key configured. Run health check to verify connectivity."
      : provider === "openai"
        ? `OpenAI Vision configured (${model}). Run health check to verify API.`
        : "No OCR provider — set GOOGLE_VISION_API_KEY or OPENAI_API_KEY.";

  return {
    ok: errors.length === 0,
    provider,
    hasOpenAiKey: Boolean(openAiKey),
    hasGoogleKey: Boolean(googleKey),
    model,
    errors,
    checkedAt: new Date().toISOString(),
    statusReason,
    launchCritical: false,
  };
}

export async function runOcrHealthCheck(): Promise<{
  ok: boolean;
  errorCode?: OcrErrorCode;
  message?: string;
}> {
  const snapshot = getOcrHealthSnapshot();
  if (!snapshot.ok) {
    return { ok: false, errorCode: "OCR_PROVIDER_NOT_CONFIGURED", message: snapshot.errors[0] };
  }

  if (snapshot.provider === "google") {
    return {
      ok: true,
      message: "Google Vision key present — live OCR probe uses production detect-text route.",
    };
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    const signal =
      typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
        ? AbortSignal.timeout(Math.min(5_000, OCR_DETECT_SERVER_TIMEOUT_MS))
        : undefined;

    const res = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${openAiKey}` },
      signal,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      const msg = body.error?.message ?? `OpenAI models check failed (${res.status}).`;
      const errorCode = classifyOpenAiApiFailure(res.status, msg);
      return { ok: false, errorCode, message: msg };
    }
    return { ok: true };
  }

  return { ok: true };
}
