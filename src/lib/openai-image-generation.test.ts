import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOpenAiImageGenerationsBody,
  openAiImageGenerationSupportsResponseFormat,
} from "@/lib/openai-image-generation";

describe("openai-image-generation", () => {
  it("includes response_format only for dall-e models", () => {
    assert.equal(openAiImageGenerationSupportsResponseFormat("dall-e-3"), true);
    assert.equal(openAiImageGenerationSupportsResponseFormat("dall-e-2"), true);
    assert.equal(openAiImageGenerationSupportsResponseFormat("gpt-image-1"), false);
    assert.equal(openAiImageGenerationSupportsResponseFormat("gpt-image-1.5"), false);
  });

  it("omits response_format for gpt-image models", () => {
    for (const model of ["gpt-image-1", "gpt-image-1.5", "gpt-image-1-mini"]) {
      const body = buildOpenAiImageGenerationsBody({
        model,
        prompt: "A mascot chef",
        size: "1024x1024",
      });
      assert.equal("response_format" in body, false, model);
    }
  });

  it("omits response_format for unknown models", () => {
    const body = buildOpenAiImageGenerationsBody({
      model: "some-future-image-model",
      prompt: "A mascot chef",
      size: "1024x1024",
    });
    assert.equal("response_format" in body, false);
  });

  it("adds response_format url for dall-e-3", () => {
    const body = buildOpenAiImageGenerationsBody({
      model: "dall-e-3",
      prompt: "A mascot chef",
      size: "1024x1024",
    });
    assert.equal(body.response_format, "url");
  });
});
