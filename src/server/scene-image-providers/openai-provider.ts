import type { SceneImageGenerateInput, SceneImageGenerateResult, SceneImageProvider } from "@/server/scene-image-providers/types";
import {
  buildOpenAiImageGenerationsBody,
  resolveOpenAiImageModel,
} from "@/lib/openai-image-generation";

type OpenAiImageResponse = {
  data?: Array<{ url?: string; b64_json?: string }>;
  error?: { message?: string };
};

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download generated image (${res.status}).`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function thumbnailFromMain(buffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buffer)
      .resize(256, 256, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    return buffer;
  }
}

export class OpenAiSceneImageProvider implements SceneImageProvider {
  readonly id = "openai";

  async generate(input: SceneImageGenerateInput): Promise<SceneImageGenerateResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const model = resolveOpenAiImageModel();
    const size = process.env.STUDIO_SCENE_IMAGE_SIZE?.trim() || "1024x1024";

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildOpenAiImageGenerationsBody({
          model,
          prompt: input.prompt,
          size,
          n: 1,
        })
      ),
    });

    const payload = (await res.json()) as OpenAiImageResponse;
    if (!res.ok) {
      throw new Error(payload.error?.message ?? `OpenAI image generation failed (${res.status}).`);
    }

    const item = payload.data?.[0];
    let imageBuffer: Buffer;
    if (item?.b64_json) {
      imageBuffer = Buffer.from(item.b64_json, "base64");
    } else if (item?.url) {
      imageBuffer = await fetchImageBuffer(item.url);
    } else {
      throw new Error("OpenAI image generation returned no image data.");
    }

    const thumbnailBuffer = await thumbnailFromMain(imageBuffer);

    return {
      imageBuffer,
      thumbnailBuffer,
      contentType: imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8 ? "image/jpeg" : "image/png",
      provider: this.id,
      seed: input.seed ?? null,
      model,
      size,
    };
  }
}
