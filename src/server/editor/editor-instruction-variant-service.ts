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
import {
  applyBrandProtectionPostComposite,
} from "@/lib/brand-asset-post-composite";
import {
  validateProtectedBrandAssetsPostRender,
  withBrandProtectionLogApplied,
} from "@/lib/brand-asset-protection-layer";
import { resolveOpenAiEditSize } from "@/lib/editor-instruction-render-dimensions";
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

async function readImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buffer).metadata();
    return {
      width: Math.max(1, meta.width ?? 1024),
      height: Math.max(1, meta.height ?? 1024),
    };
  } catch {
    return { width: 1024, height: 1024 };
  }
}

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

function buildBrandProtectionLogForResult(input: {
  protection: NonNullable<FusionRenderPayload["brandProtection"]>;
  postCompositeApplied: boolean;
  appliedAssetIds: string[];
  validationWarnings: string[];
  perspectiveWarpApplied?: boolean;
  perspectiveWarpAssetIds?: string[];
  overlayPlans?: import("@/types/brand-asset-protection").PostCompositeOverlayPlan[];
}): import("@/types/brand-asset-protection").BrandAssetProtectionLog {
  const primaryPlan = input.overlayPlans?.[0];
  return withBrandProtectionLogApplied(input.protection.log, {
    postCompositeApplied: input.postCompositeApplied,
    postCompositeAssetCount: input.appliedAssetIds.length,
    postCompositeAppliedAssetIds: input.appliedAssetIds,
    perspectiveWarpApplied: input.perspectiveWarpApplied ?? false,
    perspectiveWarpAssetIds: input.perspectiveWarpAssetIds,
    surfaceType: primaryPlan?.surfaceType,
    quadGenerated: Boolean(primaryPlan?.quad),
    quadSource: primaryPlan?.quadSource,
    quadUsed: input.perspectiveWarpApplied ?? false,
    validationPassed: input.validationWarnings.length === 0,
    validationWarnings: input.validationWarnings,
  });
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
  /** S2B.2 — OpenAI inpaint mask (already inverted for OpenAI semantics). */
  maskBuffer?: Buffer;
  forceInputFidelity?: "high" | "low";
  providerRouteLabel?: string;
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
  const sourceDimensions = await readImageDimensions(source.buffer);
  const additionalImages = await fetchReferenceBuffers(referenceSlots, supportsMulti);
  const referenceImageCount = 1 + (supportsMulti ? additionalImages.length : 0);
  const size = resolveOpenAiEditSize(sourceDimensions.width, sourceDimensions.height);
  const inputFidelity =
    params.forceInputFidelity ??
    (openAiImageEditSupportsInputFidelity(editModel) && params.instruction.sliders.preserveStyle >= 70
      ? "high"
      : undefined);

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
      maskBuffer: params.maskBuffer,
      maskFilename: params.maskBuffer ? "clothing_mask.png" : undefined,
      inputFidelity,
      n: 1,
    },
    logContext: {
      helperPath: "executeEditorInstructionVariant",
      route: params.providerRouteLabel ?? "/api/editor/instruction/variant",
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

  let finalBuffer = imageBuffer;
  let brandProtectionLog: import("@/types/brand-asset-protection").BrandAssetProtectionLog | undefined;

  const brandProtection = params.fusionRenderPayload?.brandProtection;
  if (brandProtection?.postCompositeAssets.length) {
    const composite = await applyBrandProtectionPostComposite({
      renderBuffer: imageBuffer,
      protection: brandProtection,
      sourceImageWidth: sourceDimensions.width,
      sourceImageHeight: sourceDimensions.height,
    });
    finalBuffer = composite.buffer;

    const validation = validateProtectedBrandAssetsPostRender({
      protection: brandProtection,
      renderSucceeded: true,
      postCompositeApplied: composite.applied,
      perspectiveWarpApplied: composite.perspectiveWarpApplied,
    });

    brandProtectionLog = buildBrandProtectionLogForResult({
      protection: brandProtection,
      postCompositeApplied: composite.applied,
      appliedAssetIds: composite.appliedAssetIds,
      perspectiveWarpApplied: composite.perspectiveWarpApplied,
      perspectiveWarpAssetIds: composite.perspectiveWarpAssetIds,
      overlayPlans: composite.overlayPlans,
      validationWarnings: [...composite.warnings, ...validation.warnings],
    });

    if (composite.applied) {
      console.info("[brand-protection] post-composite applied", {
        postCompositeApplied: composite.applied,
        perspectiveWarpApplied: composite.perspectiveWarpApplied,
        appliedAssetIds: composite.appliedAssetIds,
        perspectiveWarpAssetIds: composite.perspectiveWarpAssetIds,
        skippedAssetIds: composite.skippedAssetIds,
        overlayCount: composite.overlayPlans.length,
        quadUsed: composite.perspectiveWarpApplied,
        surfaceType: composite.overlayPlans[0]?.surfaceType,
        quadSource: composite.overlayPlans[0]?.quadSource,
        sourceImageWidth: sourceDimensions.width,
        sourceImageHeight: sourceDimensions.height,
      });
    }
  }

  const storageKey = `editor/instruction-variants/${params.sessionId}/${Date.now()}.png`;
  let uploaded: { url: string; pathname: string };
  try {
    uploaded = await uploadPublicBlob({
      pathname: storageKey,
      body: finalBuffer,
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
          brandProtectionLog,
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
