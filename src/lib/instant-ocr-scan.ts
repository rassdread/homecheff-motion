import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";

export const OCR_SCAN_TIMEOUT_MS = 12_000;
export const OCR_SCAN_CLIENT_FETCH_TIMEOUT_MS = 12_000;
export const OCR_DETECT_SERVER_TIMEOUT_MS = 10_000;
export const OCR_MAX_CONCURRENT_SCANS = 2;
export const CHECKOUT_PENDING_SCAN_WAIT_MS = 8_000;

export type OcrScanPhase =
  | "idle"
  | "queued"
  | "uploading"
  | "calling_ocr"
  | "received_result"
  | "auto_protected"
  | "needs_review"
  | "no_text_found"
  | "timeout"
  | "failed"
  | "skipped"
  | "interrupted";

export type OcrScanDiagnostics = {
  scanRequestId?: string;
  scanPhase: OcrScanPhase;
  scanStartedAt?: string;
  scanFinishedAt?: string;
  scanDurationMs?: number;
  scanProvider?: string;
  scanBlockCount?: number;
  scanAverageConfidence?: number;
  scanErrorCode?: string;
  scanStatusMessage?: string;
};

export type DetectTextApiResponse = {
  ok?: boolean;
  scanRequestId?: string;
  provider?: string;
  status?: string;
  blockCount?: number;
  averageConfidence?: number;
  durationMs?: number;
  autoConfirmed?: boolean;
  autoConfirmEnabled?: boolean;
  errorCode?: string;
  error?: string;
  userMessage?: string;
  blocks?: BakedTextBlockRecord[];
  imageId?: string;
};

export const OCR_AUTO_RETRY_DELAY_MS = 2_000;
export const OCR_AUTO_RETRY_MAX = 1;

export function isTerminalOcrScanPhase(phase: OcrScanPhase | undefined): boolean {
  return (
    phase === "auto_protected" ||
    phase === "needs_review" ||
    phase === "no_text_found" ||
    phase === "timeout" ||
    phase === "failed" ||
    phase === "skipped"
  );
}

export function createScanRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isActiveOcrScanPhase(phase: OcrScanPhase | undefined): boolean {
  return phase === "queued" || phase === "uploading" || phase === "calling_ocr";
}

export function isPendingOcrScanPhase(phase: OcrScanPhase | undefined): boolean {
  return isActiveOcrScanPhase(phase) || phase === "idle";
}

export function averageBlockConfidence(blocks: BakedTextBlockRecord[]): number {
  const kept = blocks.filter((b) => b.kept !== false);
  if (kept.length === 0) {
    return 0;
  }
  const sum = kept.reduce((acc, b) => acc + b.confidence, 0);
  return sum / kept.length;
}

export function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = error.message.toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    error.name === "AbortError" ||
    error.name === "TimeoutError"
  );
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label}_timeout`));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error("ocr_fetch_timeout");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function logOcrAutoScan(event: string, payload?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  console.info("[ocr-auto-scan]", event, payload ?? {});
}
