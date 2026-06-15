import {
  fetchOpenAiImageEdits,
  fetchSourceImageBuffer,
  openAiImageEditSupportsInputFidelity,
  resolveOpenAiImageEditModel,
} from "@/lib/openai-image-generation";
import { validateEditorInstructionVariantImageSource } from "@/server/editor/editor-image-ownership";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";
import type {
  EditorInstructionReference,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";

type OpenAiImageResponse = {
  data?: Array<{ url?: string; b64_json?: string }>;
  error?: { message?: string };
};

export type EditorInstructionVariantResult =
  | {
      ok: true;
      resultUrl: string;
      storageKey: string;
      provider: string;
      model: string;
      costEstimateUsd?: number;
    }
  | { ok: false; code: "VALIDATION" | "OPENAI" | "STORAGE" | "UNAVAILABLE"; message: string };

async function extractOpenAiImageBuffer(payload: OpenAiImageResponse): Promise<Buffer | null> {
  const item = payload.data?.[0];
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }
  if (item?.url) {
    const res = await fetch(item.url, { cache: "no-store" });
    if (res.ok) {
      return Buffer.from(await res.arrayBuffer());
    }
  }
  return null;
}

function resolveEditSize(width: number, height: number): string {
  const ratio = width / height;
  if (ratio > 1.2) {
    return "1536x1024";
  }
  if (ratio < 0.8) {
    return "1024x1536";
  }
  return "1024x1024";
}

function estimateInstructionVariantCostUsd(model: string): number | undefined {
  const normalized = model.trim().toLowerCase();
  if (normalized.startsWith("gpt-image")) {
    return 0.04;
  }
  if (normalized.startsWith("dall-e")) {
    return 0.08;
  }
  return undefined;
}

export async function executeEditorInstructionVariant(params: {
  userId: string;
  sessionId: string;
  imageUrl: string;
  prompt: string;
  instruction: EditorInstructionSelection;
  references?: EditorInstructionReference[];
}): Promise<EditorInstructionVariantResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, code: "UNAVAILABLE", message: "Image generation is not configured." };
  }

  const imageUrl = params.imageUrl.trim();
  const prompt = params.prompt.trim();
  if (!imageUrl || !prompt) {
    return { ok: false, code: "VALIDATION", message: "imageUrl and prompt are required." };
  }

  const ownership = await validateEditorInstructionVariantImageSource({
    userId: params.userId,
    sessionId: params.sessionId,
    imageUrl,
  });
  if (!ownership.ok) {
    return { ok: false, code: "VALIDATION", message: ownership.error };
  }

  const editModel = resolveOpenAiImageEditModel();
  const source = await fetchSourceImageBuffer(imageUrl);
  const size = resolveEditSize(1024, 1024);
  const inputFidelity =
    openAiImageEditSupportsInputFidelity(editModel) && params.instruction.sliders.preserveStyle >= 70
      ? "high"
      : undefined;

  const res = await fetchOpenAiImageEdits({
    apiKey,
    edit: {
      model: editModel,
      prompt: prompt.slice(0, 4000),
      size,
      imageBuffer: source.buffer,
      imageFilename: source.filename,
      imageContentType: source.contentType,
      inputFidelity,
      n: 1,
    },
    logContext: {
      helperPath: "executeEditorInstructionVariant",
      route: "/api/editor/instruction/variant",
      model: editModel,
    },
  });

  const payload = (await res.json()) as OpenAiImageResponse;
  if (!res.ok) {
    return {
      ok: false,
      code: "OPENAI",
      message: payload.error?.message ?? `OpenAI image edit failed (${res.status}).`,
    };
  }

  const imageBuffer = await extractOpenAiImageBuffer(payload);
  if (!imageBuffer) {
    return { ok: false, code: "OPENAI", message: "OpenAI returned no image data." };
  }

  const storageKey = `editor/instruction-variants/${params.sessionId}/${Date.now()}.png`;
  let uploaded: { url: string; pathname: string };
  try {
    uploaded = await uploadPublicBlob({
      pathname: storageKey,
      body: imageBuffer,
      contentType: "image/png",
      addRandomSuffix: false,
      allowOverwrite: true,
      context: { uploadTarget: storageKey, provider: "editor-instruction-variant" },
    });
  } catch {
    return { ok: false, code: "STORAGE", message: "Failed to store generated variant." };
  }

  return {
    ok: true,
    resultUrl: uploaded.url,
    storageKey,
    provider: "openai",
    model: editModel,
    costEstimateUsd: estimateInstructionVariantCostUsd(editModel),
  };
}
