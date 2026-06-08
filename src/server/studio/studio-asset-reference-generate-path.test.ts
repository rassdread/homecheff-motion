import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { prepareOpenAiImageGenerationsBody } from "@/lib/openai-image-generation";
import { generateImageBuffersFromPrompt } from "@/server/studio/studio-image-generation-core";

describe("asset reference generate path", () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalProvider = process.env.STUDIO_SCENE_IMAGE_PROVIDER;
  const originalModel = process.env.STUDIO_SCENE_IMAGE_MODEL;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.STUDIO_SCENE_IMAGE_PROVIDER = "openai";
    process.env.STUDIO_SCENE_IMAGE_MODEL = "gpt-image-1";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalApiKey;
    process.env.STUDIO_SCENE_IMAGE_PROVIDER = originalProvider;
    process.env.STUDIO_SCENE_IMAGE_MODEL = originalModel;
  });

  it("POST /api/studio/asset-references/generate path does not send response_format for gpt-image models", async () => {
    let requestBody: Record<string, unknown> | null = null;
    globalThis.fetch = mock.fn(async (_url, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("fakepng").toString("base64") }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    await generateImageBuffersFromPrompt({
      prompt: "Garden mascot variant from Globe Man.",
      correlationId: "asset-ref-gen-1",
      ownerId: "user-1",
      logRoute: "/api/studio/asset-references/generate",
    });

    assert.ok(requestBody);
    assert.equal("response_format" in requestBody!, false);
    assert.equal(requestBody!.model, "gpt-image-1");
    assert.deepEqual(
      requestBody,
      prepareOpenAiImageGenerationsBody({
        model: "gpt-image-1",
        prompt: "Garden mascot variant from Globe Man.",
        size: "1024x1024",
        n: 1,
      })
    );
  });

  it("uses /v1/images/edits when transform intent and source image are provided", async () => {
    let requestUrl = "";
    let usedFormData = false;
    globalThis.fetch = mock.fn(async (url, init) => {
      requestUrl = String(url);
      usedFormData = init?.body instanceof FormData;
      if (String(url).includes("example.com")) {
        return new Response(Buffer.from("fakepng"), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        });
      }
      return new Response(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("fakepng").toString("base64") }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    const result = await generateImageBuffersFromPrompt({
      prompt: "Transform Globe Man into Chef — same mascot, chef outfit only.",
      correlationId: "asset-ref-edit-1",
      ownerId: "user-1",
      logRoute: "/api/studio/asset-references/generate",
      sourceImageUrl: "https://example.com/globe.png",
      generationIntent: "TRANSFORM_EXISTING_ASSET",
      identityLockLevel: 2,
    });

    assert.match(requestUrl, /\/v1\/images\/edits$/);
    assert.equal(usedFormData, true);
    assert.equal(result.generationMode, "image_edit");
  });
});
