import {
  fetchOpenAiImageEdits,
  fetchSourceImageBuffer,
  openAiImageEditSupportsInputFidelity,
  openAiImageEditSupportsMultiReference,
  resolveOpenAiImageEditModel,
  type OpenAiImageEditReferenceImage,
} from "@/lib/openai-image-generation";
import {
  buildFusionRunRecord,
  resolveFusionVariantImageSlots,
  type FusionVariantImageSlot,
} from "@/lib/editor-fusion-variant-render";
import { validateEditorInstructionVariantImageSource } from "@/server/editor/editor-image-ownership";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";
import type {
  EditorInstructionReference,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";
import type { FusionRenderPayload, FusionRunRecord } from "@/types/editor-fusion-intelligence";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

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
      fusionRun?: FusionRunRecord;
      providerSupportsMultiReference: boolean;
      referenceImageCount: number;
      durationMs: number;
    }
  | {
      ok: false;
      code: "VALIDATION" | "OPENAI" | "STORAGE" | "UNAVAILABLE";
      message: string;
      fusionRun?: FusionRunRecord;
      providerSupportsMultiReference?: boolean;
      referenceImageCount?: number;
      durationMs?: number;
    };

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

function estimateInstructionVariantCostUsd(model: string, imageCount: number): number | undefined {
  const normalized = model.trim().toLowerCase();
  const perImage =
    normalized.startsWith("gpt-image") ? 0.04 : normalized.startsWith("dall-e") ? 0.08 : 0.04;
  return perImage * Math.max(imageCount, 1);
}

async function validateReferenceUrls(input: {
  userId: string;
  sessionId: string;
  slots: FusionVariantImageSlot[];
}): Promise<{ ok: true } | { ok: false; message: string }> {
  for (const slot of input.slots) {
    const ownership = await validateEditorInstructionVariantImageSource({
      userId: input.userId,
      sessionId: input.sessionId,
      imageUrl: slot.url,
    });
    if (!ownership.ok) {
      return {
        ok: false,
        message: `Reference image not allowed: ${slot.referenceId || slot.url}`,
      };
    }
  }
  return { ok: true };
}

async function fetchReferenceBuffers(
  slots: FusionVariantImageSlot[],
  supportsMulti: boolean
): Promise<OpenAiImageEditReferenceImage[]> {
  if (!supportsMulti || slots.length === 0) {
    return [];
  }
  const buffers: OpenAiImageEditReferenceImage[] = [];
  for (const [index, slot] of slots.entries()) {
    const source = await fetchSourceImageBuffer(slot.url);
    buffers.push({
      buffer: source.buffer,
      filename:
        slot.role === "logo"
          ? `logo_${slot.referenceId || index}.png`
          : `${slot.role ?? "reference"}_${slot.referenceId || index}.${source.filename.split(".").pop() ?? "png"}`,
      contentType: source.contentType,
      role: slot.role ?? "reference",
      referenceId: slot.referenceId,
    });
  }
  return buffers;
}

function resolveReferenceSlots(input: {
  imageUrl: string;
  references?: EditorInstructionReference[];
  fusionRenderPayload?: FusionRenderPayload | null;
}): FusionVariantImageSlot[] {
  if (input.fusionRenderPayload) {
    return resolveFusionVariantImageSlots({
      primaryImageUrl: input.imageUrl,
      payload: input.fusionRenderPayload,
    });
  }
  if (!input.references?.length) {
    return [];
  }
  return input.references
    .filter((ref) => ref.url?.trim() && ref.url.trim() !== input.imageUrl.trim())
    .map((ref) => ({
      url: ref.url,
      referenceId: ref.assetId,
      role: ref.type === "LOGO_REFERENCE" ? ("logo" as const) : ("reference" as const),
      name: ref.label,
      isLogo: ref.type === "LOGO_REFERENCE",
      preserveOriginal: ref.type === "LOGO_REFERENCE",
    }));
}

export async function executeEditorInstructionVariant(params: {
  userId: string;
  sessionId: string;
  imageUrl: string;
  prompt: string;
  instruction: EditorInstructionSelection;
  references?: EditorInstructionReference[];
  fusionWorkflowType?: EditorFusionIntent;
  fusionRenderPayload?: FusionRenderPayload | null;
  fusionCreditsCharged?: number;
}): Promise<EditorInstructionVariantResult> {
  const startedAt = Date.now();
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

  const referenceSlots = resolveReferenceSlots({
    imageUrl,
    references: params.references,
    fusionRenderPayload: params.fusionRenderPayload,
  });

  const refValidation = await validateReferenceUrls({
    userId: params.userId,
    sessionId: params.sessionId,
    slots: referenceSlots,
  });
  if (!refValidation.ok) {
    return { ok: false, code: "VALIDATION", message: refValidation.message };
  }

  const editModel = resolveOpenAiImageEditModel();
  const supportsMulti = openAiImageEditSupportsMultiReference(editModel);
  const source = await fetchSourceImageBuffer(imageUrl);
  const additionalImages = await fetchReferenceBuffers(referenceSlots, supportsMulti);
  const referenceImageCount = 1 + (supportsMulti ? additionalImages.length : 0);
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
      additionalImages: supportsMulti ? additionalImages : undefined,
      inputFidelity,
      n: 1,
    },
    logContext: {
      helperPath: "executeEditorInstructionVariant",
      route: "/api/editor/instruction/variant",
      model: editModel,
    },
  });

  const durationMs = Date.now() - startedAt;
  const payload = (await res.json()) as OpenAiImageResponse;

  const baseFusionRun = params.fusionWorkflowType
    ? buildFusionRunRecord({
        workflowType: params.fusionWorkflowType,
        payload: params.fusionRenderPayload,
        slots: referenceSlots,
        creditsCharged: params.fusionCreditsCharged ?? 0,
        providerCostUsd: estimateInstructionVariantCostUsd(editModel, referenceImageCount) ?? 0,
        estimatedProfitUsd: 0,
        providerSupportsMultiReference: supportsMulti,
        referenceImageCount,
        status: "failed",
      })
    : undefined;

  if (!res.ok) {
    return {
      ok: false,
      code: "OPENAI",
      message: payload.error?.message ?? `OpenAI image edit failed (${res.status}).`,
      fusionRun: baseFusionRun,
      providerSupportsMultiReference: supportsMulti,
      referenceImageCount,
      durationMs,
    };
  }

  const imageBuffer = await extractOpenAiImageBuffer(payload);
  if (!imageBuffer) {
    return {
      ok: false,
      code: "OPENAI",
      message: "OpenAI returned no image data.",
      fusionRun: baseFusionRun,
      providerSupportsMultiReference: supportsMulti,
      referenceImageCount,
      durationMs,
    };
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
    return {
      ok: false,
      code: "STORAGE",
      message: "Failed to store generated variant.",
      fusionRun: baseFusionRun,
      providerSupportsMultiReference: supportsMulti,
      referenceImageCount,
      durationMs,
    };
  }

  const costEstimateUsd = estimateInstructionVariantCostUsd(editModel, referenceImageCount);
  const fusionRun =
    params.fusionWorkflowType && baseFusionRun
      ? {
          ...baseFusionRun,
          status: "completed" as const,
          providerCostUsd: costEstimateUsd ?? baseFusionRun.providerCostUsd,
          errorCode: null,
        }
      : undefined;

  return {
    ok: true,
    resultUrl: uploaded.url,
    storageKey,
    provider: "openai",
    model: editModel,
    costEstimateUsd,
    fusionRun,
    providerSupportsMultiReference: supportsMulti,
    referenceImageCount,
    durationMs,
  };
}
