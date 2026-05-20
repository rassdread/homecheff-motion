/** Safe OCR error codes returned by detect-text (never include secrets). */
export const OCR_ERROR_CODES = [
  "OCR_PROVIDER_NOT_CONFIGURED",
  "OPENAI_QUOTA_EXCEEDED",
  "OPENAI_AUTH_FAILED",
  "OPENAI_RATE_LIMITED",
  "OPENAI_TIMEOUT",
  "OCR_PROVIDER_ERROR",
  "OCR_TIMEOUT",
  "MISSING_IMAGE_URL",
  "FORBIDDEN",
] as const;

export type OcrErrorCode = (typeof OCR_ERROR_CODES)[number];

export type OcrErrorPayload = {
  ok: false;
  scanRequestId: string;
  status: "failed" | "timeout";
  errorCode: OcrErrorCode;
  userMessage: string;
  error?: string;
  durationMs: number;
  provider?: string;
};

const DUTCH_USER_MESSAGES: Record<OcrErrorCode, string> = {
  OCR_PROVIDER_NOT_CONFIGURED: "OpenAI OCR is niet ingesteld op de server.",
  OPENAI_QUOTA_EXCEEDED: "OpenAI OCR heeft geen beschikbare credits of quota.",
  OPENAI_AUTH_FAILED: "OpenAI OCR-authenticatie is mislukt op de server.",
  OPENAI_RATE_LIMITED: "OpenAI OCR is tijdelijk te druk. Probeer opnieuw.",
  OPENAI_TIMEOUT: "Tekstscan duurde te lang. Probeer opnieuw of sla over.",
  OCR_PROVIDER_ERROR: "Tekstscan mislukt. Probeer opnieuw of sla over.",
  OCR_TIMEOUT: "Tekstscan duurde te lang. Probeer opnieuw of sla over.",
  MISSING_IMAGE_URL: "Afbeelding ontbreekt voor tekstscan.",
  FORBIDDEN: "Geen toegang tot deze tekstscan.",
};

export class OcrProviderError extends Error {
  readonly errorCode: OcrErrorCode;
  readonly provider?: string;

  constructor(errorCode: OcrErrorCode, message: string, provider?: string) {
    super(message);
    this.name = "OcrProviderError";
    this.errorCode = errorCode;
    this.provider = provider;
  }
}

export function ocrUserMessage(errorCode: OcrErrorCode): string {
  return DUTCH_USER_MESSAGES[errorCode] ?? DUTCH_USER_MESSAGES.OCR_PROVIDER_ERROR;
}

export function isRetryableOcrErrorCode(errorCode: string | undefined): boolean {
  if (!errorCode) {
    return true;
  }
  return (
    errorCode === "OPENAI_RATE_LIMITED" ||
    errorCode === "OCR_PROVIDER_ERROR" ||
    errorCode === "OPENAI_TIMEOUT" ||
    errorCode === "OCR_TIMEOUT"
  );
}

export function classifyOpenAiApiFailure(status: number, message: string): OcrErrorCode {
  const lower = message.toLowerCase();
  if (
    status === 401 ||
    lower.includes("incorrect api key") ||
    lower.includes("invalid api key") ||
    lower.includes("authentication") ||
    lower.includes("unauthorized")
  ) {
    return "OPENAI_AUTH_FAILED";
  }
  if (
    status === 402 ||
    lower.includes("quota") ||
    lower.includes("insufficient_quota") ||
    lower.includes("billing") ||
    lower.includes("exceeded your current")
  ) {
    return "OPENAI_QUOTA_EXCEEDED";
  }
  if (
    status === 429 ||
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  ) {
    return "OPENAI_RATE_LIMITED";
  }
  return "OCR_PROVIDER_ERROR";
}

export function classifyOcrFailure(error: unknown): {
  errorCode: OcrErrorCode;
  userMessage: string;
  httpStatus: number;
  provider?: string;
  logMessage: string;
} {
  if (error instanceof OcrProviderError) {
    return {
      errorCode: error.errorCode,
      userMessage: ocrUserMessage(error.errorCode),
      httpStatus: 503,
      provider: error.provider,
      logMessage: error.message,
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("not configured") || lower.includes("set google_vision") || lower.includes("set openai_api_key")) {
    return {
      errorCode: "OCR_PROVIDER_NOT_CONFIGURED",
      userMessage: ocrUserMessage("OCR_PROVIDER_NOT_CONFIGURED"),
      httpStatus: 503,
      provider: "none",
      logMessage: message,
    };
  }

  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("abort")) {
    return {
      errorCode: "OPENAI_TIMEOUT",
      userMessage: ocrUserMessage("OPENAI_TIMEOUT"),
      httpStatus: 504,
      provider: "openai",
      logMessage: message,
    };
  }

  const openAiCode = classifyOpenAiApiFailure(0, message);
  if (openAiCode !== "OCR_PROVIDER_ERROR") {
    return {
      errorCode: openAiCode,
      userMessage: ocrUserMessage(openAiCode),
      httpStatus: 503,
      provider: "openai",
      logMessage: message,
    };
  }

  return {
    errorCode: "OCR_PROVIDER_ERROR",
    userMessage: ocrUserMessage("OCR_PROVIDER_ERROR"),
    httpStatus: 503,
    provider: "openai",
    logMessage: message,
  };
}

export function buildOcrErrorPayload(params: {
  scanRequestId: string;
  errorCode: OcrErrorCode;
  durationMs: number;
  provider?: string;
  logMessage?: string;
}): OcrErrorPayload {
  const isTimeout = params.errorCode === "OPENAI_TIMEOUT" || params.errorCode === "OCR_TIMEOUT";
  return {
    ok: false,
    scanRequestId: params.scanRequestId,
    status: isTimeout ? "timeout" : "failed",
    errorCode: params.errorCode,
    userMessage: ocrUserMessage(params.errorCode),
    error: params.logMessage,
    durationMs: params.durationMs,
    provider: params.provider,
  };
}
