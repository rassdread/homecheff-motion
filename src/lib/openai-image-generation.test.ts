import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  buildOpenAiImageEditFormData,
  buildOpenAiImageGenerationsBody,
  openAiImageEditSupportsInputFidelity,
  openAiImageEditSupportsMultiReference,
  openAiImageGenerationSupportsResponseFormat,
  openAiImageModelSupportsEdit,
  prepareOpenAiImageGenerationsBody,
  resolveOpenAiImageEditModel,
  resolveOpenAiImageModel,
  stripUnsafeOpenAiImageGenerationParams,
} from "@/lib/openai-image-generation";

describe("openai-image-generation", () => {
  const originalStudioModel = process.env.STUDIO_SCENE_IMAGE_MODEL;
  const originalOpenAiImageModel = process.env.OPENAI_IMAGE_MODEL;

  afterEach(() => {
    process.env.STUDIO_SCENE_IMAGE_MODEL = originalStudioModel;
    process.env.OPENAI_IMAGE_MODEL = originalOpenAiImageModel;
  });

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

  it("prepareOpenAiImageGenerationsBody strips response_format for gpt-image models", () => {
    const body = prepareOpenAiImageGenerationsBody({
      model: "gpt-image-1",
      prompt: "A mascot chef",
      size: "1024x1024",
    });
    assert.equal("response_format" in body, false);
    assert.equal(body.model, "gpt-image-1");
  });

  it("stripUnsafeOpenAiImageGenerationParams removes response_format even if manually injected", () => {
    const stripped = stripUnsafeOpenAiImageGenerationParams({
      model: "gpt-image-1.5",
      prompt: "test",
      n: 1,
      size: "1024x1024",
      response_format: "url",
    });
    assert.equal("response_format" in stripped, false);
  });

  it("resolveOpenAiImageModel falls back to OPENAI_IMAGE_MODEL", () => {
    delete process.env.STUDIO_SCENE_IMAGE_MODEL;
    process.env.OPENAI_IMAGE_MODEL = "gpt-image-1";
    assert.equal(resolveOpenAiImageModel(), "gpt-image-1");
  });

  it("openAiImageModelSupportsEdit returns true for gpt-image and dall-e-2", () => {
    assert.equal(openAiImageModelSupportsEdit("gpt-image-1"), true);
    assert.equal(openAiImageModelSupportsEdit("gpt-image-1.5"), true);
    assert.equal(openAiImageModelSupportsEdit("dall-e-2"), true);
    assert.equal(openAiImageModelSupportsEdit("dall-e-3"), false);
  });

  it("resolveOpenAiImageEditModel falls back to gpt-image-1 when primary is dall-e-3", () => {
    process.env.STUDIO_SCENE_IMAGE_MODEL = "dall-e-3";
    assert.equal(resolveOpenAiImageEditModel(), "gpt-image-1");
  });

  it("buildOpenAiImageEditFormData includes input_fidelity for gpt-image-1", () => {
    const form = buildOpenAiImageEditFormData({
      model: "gpt-image-1",
      prompt: "Transform into chef outfit",
      size: "1024x1024",
      imageBuffer: Buffer.from("fake"),
      inputFidelity: "high",
    });
    assert.equal(form.get("input_fidelity"), "high");
    assert.equal(openAiImageEditSupportsInputFidelity("gpt-image-1"), true);
    assert.equal(openAiImageEditSupportsInputFidelity("gpt-image-2"), false);
  });

  it("appends additional reference images when model supports multi-reference", () => {
    assert.equal(openAiImageEditSupportsMultiReference("gpt-image-1"), true);
    const form = buildOpenAiImageEditFormData({
      model: "gpt-image-1",
      prompt: "Fusion",
      size: "1024x1024",
      imageBuffer: Buffer.from("base"),
      additionalImages: [{ buffer: Buffer.from("ref"), filename: "ref.png", role: "reference" }],
    });
    assert.equal(form.getAll("image").length, 2);
  });
});
