import type { SceneImageGenerateInput, SceneImageGenerateResult, SceneImageProvider } from "@/server/scene-image-providers/types";
import {
  fetchOpenAiImageEdits,
  fetchOpenAiImageGenerations,
  fetchSourceImageBuffer,
  openAiImageEditSupportsMultiReference,
  openAiImageModelSupportsEdit,
  prepareOpenAiImageGenerationsBody,
  resolveOpenAiImageEditModel,
  resolveOpenAiImageModel,
  type OpenAiImageEditReferenceImage,
} from "@/lib/openai-image-generation";
import { resolveSceneStillCapability } from "@/lib/studio-generation-provider-capabilities";

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

function shouldUseReferenceEdit(input: SceneImageGenerateInput): boolean {
  if (shouldUseImageEdit(input)) {
    return false;
  }
  const capability = resolveSceneStillCapability();
  return capability.useReferenceEdit && Boolean(input.referenceImages?.some((ref) => ref.url.trim()));
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

    if (shouldUseReferenceEdit(input)) {
      try {
        return await this.generateFromReferenceEdit(input, apiKey, size);
      } catch (error) {
        console.warn(
          "[OpenAiSceneImageProvider] Reference edit failed — falling back to text-to-image.",
          { sceneId: input.sceneId, message: error instanceof Error ? error.message : "unknown" }
        );
        return this.generateFromPrompt(input, apiKey, size);
      }
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

    const additionalImages: OpenAiImageEditReferenceImage[] = [];
    const sourceUrl = input.sourceImageUrl!.trim();
    if (openAiImageEditSupportsMultiReference(editModel) && input.referenceImages?.length) {
      for (const ref of input.referenceImages) {
        const refUrl = ref.url.trim();
        if (!refUrl || refUrl === sourceUrl) {
          continue;
        }
        if (additionalImages.length >= 4) {
          break;
        }
        try {
          const fetched = await fetchSourceImageBuffer(refUrl);
          additionalImages.push({
            buffer: fetched.buffer,
            filename: fetched.filename,
            contentType: fetched.contentType,
            role: ref.exactness === "MUST_PRESERVE" ? "logo" : "reference",
            referenceId: ref.entityId,
          });
        } catch {
          /* skip stale supporting refs */
        }
      }
    }

    const res = await fetchOpenAiImageEdits({
      apiKey,
      edit: {
        model: editModel,
        prompt: input.prompt,
        size,
        imageBuffer: source.buffer,
        imageFilename: source.filename,
        imageContentType: source.contentType,
        additionalImages,
        inputFidelity,
        n: 1,
      },
      logContext: {
        helperPath: "OpenAiSceneImageProvider.generateFromSourceEdit",
        route: input.logRoute,
        referenceImageCount: 1 + additionalImages.length,
        providerSupportsMultiReference: openAiImageEditSupportsMultiReference(editModel),
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

  private async generateFromReferenceEdit(
    input: SceneImageGenerateInput,
    apiKey: string,
    size: string
  ): Promise<SceneImageGenerateResult> {
    const editModel = resolveOpenAiImageEditModel();
    const refs = (input.referenceImages ?? []).filter((ref) => ref.url.trim());
    const primary = refs[0];
    if (!primary) {
      return this.generateFromPrompt(input, apiKey, size);
    }
    const source = await fetchSourceImageBuffer(primary.url.trim());
    const additionalImages: OpenAiImageEditReferenceImage[] = [];
    if (openAiImageEditSupportsMultiReference(editModel)) {
      for (const ref of refs.slice(1, 4)) {
        try {
          const fetched = await fetchSourceImageBuffer(ref.url.trim());
          additionalImages.push({
            buffer: fetched.buffer,
            filename: fetched.filename,
            contentType: fetched.contentType,
            role: ref.exactness === "MUST_PRESERVE" ? "logo" : "reference",
            referenceId: ref.entityId,
          });
        } catch {
          /* skip stale supporting refs */
        }
      }
    }

    const res = await fetchOpenAiImageEdits({
      apiKey,
      edit: {
        model: editModel,
        prompt: input.prompt,
        size,
        imageBuffer: source.buffer,
        imageFilename: source.filename,
        imageContentType: source.contentType,
        additionalImages,
        inputFidelity: "high",
        n: 1,
      },
      logContext: {
        helperPath: "OpenAiSceneImageProvider.generateFromReferenceEdit",
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
