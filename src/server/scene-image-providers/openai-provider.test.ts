import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { buildOpenAiImageGenerationsBody } from "@/lib/openai-image-generation";
import { OpenAiSceneImageProvider } from "@/server/scene-image-providers/openai-provider";

describe("OpenAiSceneImageProvider", () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.STUDIO_SCENE_IMAGE_MODEL;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalApiKey;
    process.env.STUDIO_SCENE_IMAGE_MODEL = originalModel;
  });

  it("uses buildOpenAiImageGenerationsBody without response_format for gpt-image models", async () => {
    process.env.STUDIO_SCENE_IMAGE_MODEL = "gpt-image-1";

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

    const provider = new OpenAiSceneImageProvider();
    await provider.generate({
      prompt: "A friendly mascot chef.",
      sceneId: "scene-1",
      imageRecordId: "img-1",
      ownerId: "user-1",
    });

    assert.ok(requestBody);
    assert.equal("response_format" in requestBody!, false);
    assert.deepEqual(
      requestBody,
      buildOpenAiImageGenerationsBody({
        model: "gpt-image-1",
        prompt: "A friendly mascot chef.",
        size: "1024x1024",
        n: 1,
      })
    );
  });
});
