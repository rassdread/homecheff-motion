import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyOcrFailure,
  classifyOpenAiApiFailure,
  isRetryableOcrErrorCode,
  OcrProviderError,
  ocrUserMessage,
} from "@/lib/ocr-provider-errors";

describe("ocr-provider-errors", () => {
  it("maps not configured errors", () => {
    const r = classifyOcrFailure(new Error("OCR is not configured. Set OPENAI_API_KEY."));
    assert.equal(r.errorCode, "OCR_PROVIDER_NOT_CONFIGURED");
    assert.match(r.userMessage, /niet ingesteld/i);
  });

  it("maps OpenAI quota errors", () => {
    assert.equal(
      classifyOpenAiApiFailure(402, "You exceeded your current quota, please check your plan"),
      "OPENAI_QUOTA_EXCEEDED"
    );
  });

  it("maps rate limit errors", () => {
    assert.equal(classifyOpenAiApiFailure(429, "Rate limit reached"), "OPENAI_RATE_LIMITED");
  });

  it("respects OcrProviderError", () => {
    const r = classifyOcrFailure(
      new OcrProviderError("OPENAI_AUTH_FAILED", "bad key", "openai_vision")
    );
    assert.equal(r.errorCode, "OPENAI_AUTH_FAILED");
    assert.equal(r.provider, "openai_vision");
  });

  it("marks non-retryable provider config errors", () => {
    assert.equal(isRetryableOcrErrorCode("OCR_PROVIDER_NOT_CONFIGURED"), false);
    assert.equal(isRetryableOcrErrorCode("OPENAI_AUTH_FAILED"), false);
    assert.equal(isRetryableOcrErrorCode("OPENAI_RATE_LIMITED"), true);
  });

  it("returns Dutch user messages", () => {
    assert.match(ocrUserMessage("OPENAI_RATE_LIMITED"), /te druk/i);
  });
});
