import type { SceneImageGenerateInput, SceneImageGenerateResult, SceneImageProvider } from "@/server/scene-image-providers/types";
import {
  fetchOpenAiImageEdits,
  fetchOpenAiImageGenerations,
  fetchSourceImageBuffer,
  openAiImageModelSupportsEdit,
  prepareOpenAiImageGenerationsBody,
  resolveOpenAiImageEditModel,
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

function detectContentType(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return "image/jpeg";
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50) {
    return "image/png";
  }
  return "image/png";
}

function shouldUseImageEdit(input: SceneImageGenerateInput): boolean {
  return (
    input.generationIntent === "TRANSFORM_EXISTING_ASSET" &&
    Boolean(input.sourceImageUrl?.trim())
  );
}

export class OpenAiSceneImageProvider implements SceneImageProvider {
  readonly id = "openai";

  async generate(input: SceneImageGenerateInput): Promise<SceneImageGenerateResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const size = process.env.STUDIO_SCENE_IMAGE_SIZE?.trim() || "1024x1024";

    if (shouldUseImageEdit(input)) {
      return this.generateFromSourceEdit(input, apiKey, size);
    }

    return this.generateFromPrompt(input, apiKey, size);
  }

  private async generateFromSourceEdit(
    input: SceneImageGenerateInput,
    apiKey: string,
    size: string
  ): Promise<SceneImageGenerateResult> {
    const editModel = resolveOpenAiImageEditModel();
    if (!openAiImageModelSupportsEdit(editModel)) {
      console.warn(
        "[OpenAiSceneImageProvider] Source image present but edit model unsupported — falling back to text-to-image.",
        { editModel, sourceImageUrl: input.sourceImageUrl }
      );
      return this.generateFromPrompt(input, apiKey, size);
    }

    const source = await fetchSourceImageBuffer(input.sourceImageUrl!.trim());
    const inputFidelity =
      input.identityLockLevel === 2 || input.generationIntent === "TRANSFORM_EXISTING_ASSET"
        ? "high"
        : undefined;

    const res = await fetchOpenAiImageEdits({
      apiKey,
      edit: {
        model: editModel,
        prompt: input.prompt,
        size,
        imageBuffer: source.buffer,
        imageFilename: source.filename,
        imageContentType: source.contentType,
        inputFidelity,
        n: 1,
      },
      logContext: {
        helperPath: "OpenAiSceneImageProvider.generateFromSourceEdit",
        route: input.logRoute,
        model: editModel,
      },
    });

    const payload = (await res.json()) as OpenAiImageResponse;
    if (!res.ok) {
      throw new Error(payload.error?.message ?? `OpenAI image edit failed (${res.status}).`);
    }

    const imageBuffer = await this.extractImageBuffer(payload);
    const thumbnailBuffer = await thumbnailFromMain(imageBuffer);

    return {
      imageBuffer,
      thumbnailBuffer,
      contentType: detectContentType(imageBuffer),
      provider: this.id,
      seed: input.seed ?? null,
      model: editModel,
      size,
      generationMode: "image_edit",
    };
  }

  private async generateFromPrompt(
    input: SceneImageGenerateInput,
    apiKey: string,
    size: string
  ): Promise<SceneImageGenerateResult> {
    const model = resolveOpenAiImageModel();
    const body = prepareOpenAiImageGenerationsBody({
      model,
      prompt: input.prompt,
      size,
      n: 1,
    });

    const res = await fetchOpenAiImageGenerations({
      apiKey,
      body,
      logContext: {
        helperPath: "OpenAiSceneImageProvider.generateFromPrompt",
        route: input.logRoute,
        model,
      },
    });

    const payload = (await res.json()) as OpenAiImageResponse;
    if (!res.ok) {
      throw new Error(payload.error?.message ?? `OpenAI image generation failed (${res.status}).`);
    }

    const imageBuffer = await this.extractImageBuffer(payload);
    const thumbnailBuffer = await thumbnailFromMain(imageBuffer);

    return {
      imageBuffer,
      thumbnailBuffer,
      contentType: detectContentType(imageBuffer),
      provider: this.id,
      seed: input.seed ?? null,
      model,
      size,
      generationMode: "text_to_image",
    };
  }

  private async extractImageBuffer(payload: OpenAiImageResponse): Promise<Buffer> {
    const item = payload.data?.[0];
    if (item?.b64_json) {
      return Buffer.from(item.b64_json, "base64");
    }
    if (item?.url) {
      return fetchImageBuffer(item.url);
    }
    throw new Error("OpenAI image generation returned no image data.");
  }
}
