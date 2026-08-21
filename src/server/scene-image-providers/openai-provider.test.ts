import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import {
  fetchOpenAiImageGenerations,
  prepareOpenAiImageGenerationsBody,
} from "@/lib/openai-image-generation";
import { OpenAiSceneImageProvider } from "@/server/scene-image-providers/openai-provider";

describe("OpenAiSceneImageProvider", () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.STUDIO_SCENE_IMAGE_MODEL;
  const originalRefEdit = process.env.STUDIO_SCENE_IMAGE_REFERENCE_EDIT;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalApiKey;
    process.env.STUDIO_SCENE_IMAGE_MODEL = originalModel;
    process.env.STUDIO_SCENE_IMAGE_REFERENCE_EDIT = originalRefEdit;
  });

  it("uses prepareOpenAiImageGenerationsBody without response_format for gpt-image models", async () => {
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
      logRoute: "/api/studio/asset-references/generate",
    });

    assert.ok(requestBody);
    assert.equal("response_format" in requestBody!, false);
    assert.deepEqual(
      requestBody,
      prepareOpenAiImageGenerationsBody({
        model: "gpt-image-1",
        prompt: "A friendly mascot chef.",
        size: "1024x1024",
        n: 1,
      })
    );
  });

  it("forwards referenceImages into OpenAI edit when the primary model supports edits", async () => {
    process.env.STUDIO_SCENE_IMAGE_MODEL = "gpt-image-1";
    process.env.STUDIO_SCENE_IMAGE_REFERENCE_EDIT = "true";

    const calls: Array<{ url: string; isForm: boolean }> = [];
    globalThis.fetch = mock.fn(async (url, init) => {
      const href = String(url);
      const isForm = typeof init?.body !== "string";
      calls.push({ url: href, isForm });
      if (href.includes("cdn.example")) {
        return new Response(Buffer.from("fakepng"), { status: 200, headers: { "Content-Type": "image/png" } });
      }
      return new Response(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("fakepng").toString("base64") }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    const provider = new OpenAiSceneImageProvider();
    await provider.generate({
      prompt: "Amina in the bakery",
      sceneId: "scene-1",
      imageRecordId: "img-1",
      ownerId: "user-1",
      referenceImages: [
        { url: "https://cdn.example/amina.jpg", entityId: "char-a", role: "primary", exactness: "SHOULD_MATCH" },
      ],
    });

    assert.ok(calls.some((call) => call.url.includes("/v1/images/edits") && call.isForm));
    assert.equal(calls.some((call) => call.url.includes("/v1/images/generations")), false);
  });

  it("fetchOpenAiImageGenerations hard-strips response_format for gpt-image models", async () => {
    let requestBody: Record<string, unknown> | null = null;
    globalThis.fetch = mock.fn(async (_url, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    await fetchOpenAiImageGenerations({
      apiKey: "test-key",
      body: {
        model: "gpt-image-1",
        prompt: "test",
        n: 1,
        size: "1024x1024",
        response_format: "url",
      },
      logContext: {
        helperPath: "test.fetchOpenAiImageGenerations",
        route: "/api/studio/asset-references/generate",
      },
    });

    assert.ok(requestBody);
    assert.equal("response_format" in requestBody!, false);
    assert.equal(requestBody!.model, "gpt-image-1");
  });
});
