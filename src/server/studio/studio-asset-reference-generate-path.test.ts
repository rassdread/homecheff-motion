import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { buildOpenAiImageGenerationsBody } from "@/lib/openai-image-generation";
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

  it("generateImageBuffersFromPrompt does not send response_format for gpt-image models", async () => {
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
    });

    assert.ok(requestBody);
    assert.equal("response_format" in requestBody!, false);
    assert.deepEqual(
      requestBody,
      buildOpenAiImageGenerationsBody({
        model: "gpt-image-1",
        prompt: "Garden mascot variant from Globe Man.",
        size: "1024x1024",
        n: 1,
      })
    );
  });
});
