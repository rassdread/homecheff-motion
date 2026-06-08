import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateElevenLabsTtsCostUsd,
  estimateOpenAiVisionCostUsd,
  OPENAI_DALLE3_IMAGE_USD,
} from "@/lib/studio-cost-estimates";
import { buildVoicePreviewDedupHash } from "@/server/provider-cost/studio-cost-metering";

describe("studio-cost-estimates", () => {
  it("DALL-E unit cost matches OpenAI published $0.04", () => {
    assert.equal(OPENAI_DALLE3_IMAGE_USD, 0.04);
  });

  it("vision cost scales with image count", () => {
    assert.equal(estimateOpenAiVisionCostUsd(1), 0.012);
    assert.ok(estimateOpenAiVisionCostUsd(5) > estimateOpenAiVisionCostUsd(1));
  });

  it("ElevenLabs TTS uses multilingual rate for default model", () => {
    const cost = estimateElevenLabsTtsCostUsd({
      characterCount: 1000,
      modelId: "eleven_multilingual_v2",
    });
    assert.equal(cost, 0.1);
  });

  it("preview dedup hash is stable for same inputs", () => {
    const a = buildVoicePreviewDedupHash({
      voiceId: "abc",
      previewText: "Hello",
      language: "en",
      modelId: "eleven_multilingual_v2",
    });
    const b = buildVoicePreviewDedupHash({
      voiceId: "abc",
      previewText: "Hello",
      language: "en",
      modelId: "eleven_multilingual_v2",
    });
    const c = buildVoicePreviewDedupHash({
      voiceId: "abc",
      previewText: "Hi",
      language: "en",
      modelId: "eleven_multilingual_v2",
    });
    assert.equal(a, b);
    assert.notEqual(a, c);
  });
});
