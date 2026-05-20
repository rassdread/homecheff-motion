import { OcrConcurrencyQueue } from "@/lib/ocr-concurrency-queue";
import { OcrProviderError } from "@/lib/ocr-provider-errors";

const OPENAI_COOLDOWN_MS = 60_000;

let cooldownUntilMs = 0;
let queue: OcrConcurrencyQueue | null = null;

export function getOpenAiMaxConcurrency(): number {
  const override = process.env.OPENAI_MAX_CONCURRENT?.trim();
  if (override === "2") {
    return 2;
  }
  if (override === "1") {
    return 1;
  }
  return process.env.NODE_ENV === "production" ? 1 : 2;
}

export function isOpenAiCooldownActive(): boolean {
  return Date.now() < cooldownUntilMs;
}

export function startOpenAiRateLimitCooldown(ms = OPENAI_COOLDOWN_MS): void {
  cooldownUntilMs = Math.max(cooldownUntilMs, Date.now() + ms);
}

export class OpenAiCooldownError extends Error {
  constructor() {
    super("OpenAI request gate: cooldown active after rate limit.");
    this.name = "OpenAiCooldownError";
  }
}

function getQueue(): OcrConcurrencyQueue {
  if (!queue) {
    queue = new OcrConcurrencyQueue(getOpenAiMaxConcurrency());
  }
  return queue;
}

/** Serializes OpenAI Vision/OCR calls and enforces post-rate-limit cooldown. */
export async function runOpenAiGated<T>(fn: () => Promise<T>): Promise<T> {
  if (isOpenAiCooldownActive()) {
    throw new OpenAiCooldownError();
  }
  return getQueue().run(fn);
}

export function isOpenAiRateLimitFailure(error: unknown): boolean {
  if (error instanceof OpenAiCooldownError) {
    return true;
  }
  if (error instanceof OcrProviderError && error.errorCode === "OPENAI_RATE_LIMITED") {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return lower.includes("rate limit") || lower.includes("too many requests");
}

export function noteOpenAiRateLimitFailure(error: unknown): void {
  if (isOpenAiRateLimitFailure(error)) {
    startOpenAiRateLimitCooldown();
  }
}
