import { extractMaskContourFromPng } from "@/lib/editor-mask-contour";
import {
  boundsFromPolygon,
  boundsToPolygon,
  clickBoundsAroundPoint,
  intersectBounds,
  refineSelectionPolygonFromBounds,
} from "@/lib/editor-object-mask";
import {
  classifyBlobPersistError,
  mapReplicateErrorToCode,
  type EditorSegmentErrorCode,
} from "@/lib/editor-segmentation-errors";
import { resolveEditorSegmentPrompt } from "@/lib/editor-segmentation-prompt";
import { segmentationProviderAvailable } from "@/lib/premium-foreground-segmentation";
import { isReplicateConfigured } from "@/server/admin/replicate-client";
import { editorMaskStoragePath } from "@/server/editor/editor-mask-storage";
import { segmentEditorLayer } from "@/server/editor/segment-editor-layer";
import {
  EDITOR_CLICK_REPLICATE_TIMEOUT_MS,
  EDITOR_CLICK_ROUTE_DEADLINE_MS,
  EDITOR_REFINE_REPLICATE_TIMEOUT_MS,
  segmentEditorImageWithReplicateSam3,
} from "@/server/editor/replicate-sam3-editor-segment";
import {
  segmentEditorClickWithSam2,
  type Sam2ClickSegmentResult,
} from "@/server/editor/sam2-click-segment";
import { isSam2SegmentationAvailable } from "@/lib/editor-sam2-segmentation";
import {
  EDITOR_SEGMENT_IMAGE_FETCH_TIMEOUT_MS,
  EDITOR_SEGMENT_MASK_FETCH_TIMEOUT_MS,
  fetchWithEditorSegmentTimeout,
} from "@/lib/editor-segment-fetch";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";
import type {
  EditorCanvasBounds,
  EditorObjectShape,
  EditorSegmentationSource,
  EditorShapePoint,
} from "@/types/homecheff-visual-editor";
import sharp from "sharp";

export type EditorSegmentProviderId = "replicate_sam3" | "sam2" | "rembg" | "heuristic";

export type EditorSegmentationProviderStatus = {
  replicate: boolean;
  sam2: boolean;
  rembg: boolean;
  primary: EditorSegmentProviderId | "none";
};

export type EditorSegmentationProviderResult = {
  maskUrl?: string;
  cutoutUrl?: string;
  polygon: EditorShapePoint[];
  boundingBox: EditorCanvasBounds;
  confidence: number;
  segmentationSource: EditorSegmentationSource;
  alphaMask: boolean;
  providerUsed: EditorSegmentProviderId;
  predictionId?: string;
  runtimeMs?: number;
  maskStorageKey?: string;
};

export type SegmentByClickInput = {
  userId: string;
  imageUrl?: string;
  imageBase64?: string;
  backgroundStorageKey?: string;
  clickPoint: EditorShapePoint;
  targetBounds?: EditorCanvasBounds;
  positivePoints?: EditorShapePoint[];
  negativePoints?: EditorShapePoint[];
  objectHint?: string;
  category?: string;
  semanticType?: string;
  label?: string;
  editorObjectId?: string;
  sessionId?: string;
  createCutout?: boolean;
  requestId?: string;
};

export type SegmentByPromptInput = {
  userId: string;
  imageUrl: string;
  prompt: string;
  sessionId?: string;
  editorObjectId?: string;
  createCutout?: boolean;
};

export type RemoveBackgroundInput = {
  userId: string;
  sourceUrl: string;
  sessionId?: string;
  subjectPrompt?: string;
  targetBounds?: EditorCanvasBounds;
};

const SEGMENT_RESPONSE_MAX_BYTES = 512_000;

function logEditorSegmentTrace(
  phase: string,
  detail: Record<string, unknown>,
  requestId?: string
): void {
  console.info("[editor-segmentation]", {
    requestId: requestId ?? "none",
    phase,
    ...detail,
  });
}

function segmentClickDeadlineExceeded(startedMs: number): boolean {
  return Date.now() - startedMs > EDITOR_CLICK_ROUTE_DEADLINE_MS;
}

async function loadSourceImageBuffer(input: {
  imageUrl?: string;
  imageBase64?: string;
}): Promise<{ ok: true; buffer: Buffer } | { ok: false; code: "image_fetch_failed"; message: string }> {
  try {
    if (input.imageBase64) {
      const base64 = input.imageBase64.replace(/^data:image\/[a-z+]+;base64,/i, "");
      return { ok: true, buffer: Buffer.from(base64, "base64") };
    }
    if (!input.imageUrl) {
      return { ok: false, code: "image_fetch_failed", message: "Missing image source." };
    }
    const imageFetchStarted = Date.now();
    const res = await fetchWithEditorSegmentTimeout(
      input.imageUrl,
      EDITOR_SEGMENT_IMAGE_FETCH_TIMEOUT_MS
    );
    if (!res.ok) {
      return {
        ok: false,
        code: "image_fetch_failed",
        message: `Could not fetch image (${res.status}).`,
      };
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    logEditorSegmentTrace("image_fetch_ms", {
      ms: Date.now() - imageFetchStarted,
      bytes: buffer.length,
    });
    return { ok: true, buffer };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      code: "image_fetch_failed",
      message: aborted
        ? "Image fetch timed out."
        : error instanceof Error
          ? error.message
          : "Could not fetch image.",
    };
  }
}

function normalizeBox(
  box: EditorCanvasBounds | number[] | null | undefined,
  width: number,
  height: number
): EditorCanvasBounds | null {
  if (!box) {
    return null;
  }
  if (Array.isArray(box) && box.length >= 4) {
    const [x, y, w, h] = box;
    const looksNormalized = x <= 1 && y <= 1 && w <= 1 && h <= 1;
    if (looksNormalized) {
      return { x, y, width: w, height: h };
    }
    return {
      x: x / width,
      y: y / height,
      width: w / width,
      height: h / height,
    };
  }
  const b = box as EditorCanvasBounds;
  if (b.width <= 1.05 && b.height <= 1.05 && b.x <= 1.05 && b.y <= 1.05) {
    return b;
  }
  return {
    x: b.x / width,
    y: b.y / height,
    width: b.width / width,
    height: b.height / height,
  };
}

async function persistMaskAndCutout(params: {
  userId: string;
  sessionId: string;
  objectId: string;
  sourceBuffer: Buffer;
  maskBuffer: Buffer;
  createCutout: boolean;
  provider: EditorSegmentProviderId;
}): Promise<{ maskUrl: string; cutoutUrl?: string; maskStorageKey: string }> {
  const meta = await sharp(params.sourceBuffer).metadata();
  const width = Math.max(1, meta.width ?? 1);
  const height = Math.max(1, meta.height ?? 1);

  const maskPath = editorMaskStoragePath({
    userId: params.userId,
    sessionId: params.sessionId,
    objectId: params.objectId,
    kind: "mask",
  });
  const uploadedMask = await uploadPublicBlob({
    pathname: maskPath,
    body: params.maskBuffer,
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
    context: { uploadTarget: maskPath, provider: `editor-${params.provider}-mask` },
  });

  let cutoutUrl: string | undefined;
  if (params.createCutout) {
    const cutoutBuffer = await sharp(params.sourceBuffer)
      .resize(width, height, { fit: "fill" })
      .ensureAlpha()
      .composite([
        {
          input: await sharp(params.maskBuffer).resize(width, height, { fit: "fill" }).ensureAlpha().toBuffer(),
          blend: "dest-in",
        },
      ])
      .png()
      .toBuffer();
    const cutoutPath = editorMaskStoragePath({
      userId: params.userId,
      sessionId: params.sessionId,
      objectId: params.objectId,
      kind: "cutout",
    });
    const uploadedCutout = await uploadPublicBlob({
      pathname: cutoutPath,
      body: cutoutBuffer,
      contentType: "image/png",
      addRandomSuffix: false,
      allowOverwrite: true,
      context: { uploadTarget: cutoutPath, provider: `editor-${params.provider}-cutout` },
    });
    cutoutUrl = uploadedCutout.url;
  }

  return { maskUrl: uploadedMask.url, cutoutUrl, maskStorageKey: maskPath };
}

async function maskBufferFromMaskRef(
  maskRef: string
): Promise<{ ok: true; buffer: Buffer } | { ok: false; code: "mask_fetch_failed"; message: string }> {
  try {
    if (maskRef.startsWith("data:")) {
      const base64 = maskRef.replace(/^data:image\/[a-z+]+;base64,/i, "");
      const buffer = Buffer.from(base64, "base64");
      if (buffer.length < 100) {
        return { ok: false, code: "mask_fetch_failed", message: "Mask data URI was too small." };
      }
      return { ok: true, buffer };
    }
    const maskFetchStarted = Date.now();
    const res = await fetchWithEditorSegmentTimeout(
      maskRef,
      EDITOR_SEGMENT_MASK_FETCH_TIMEOUT_MS
    );
    if (!res.ok) {
      return {
        ok: false,
        code: "mask_fetch_failed",
        message: `Could not fetch mask (${res.status}).`,
      };
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) {
      return { ok: false, code: "mask_fetch_failed", message: "Mask payload was too small." };
    }
    logEditorSegmentTrace("mask_fetch_ms", { ms: Date.now() - maskFetchStarted, bytes: buffer.length });
    return { ok: true, buffer };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      code: "mask_fetch_failed",
      message: aborted
        ? "Mask fetch timed out."
        : error instanceof Error
          ? error.message
          : "Could not fetch mask.",
    };
  }
}

function segmentFailure(
  code: EditorSegmentErrorCode,
  message: string
): { ok: false; code: EditorSegmentErrorCode; message: string; fallbacks: string[] } {
  return {
    ok: false,
    code,
    message,
    fallbacks: ["manual_lasso", "rembg_foreground", "approximate_box"],
  };
}

export function estimateSegmentResponseBytes(payload: Record<string, unknown>): number {
  return Buffer.byteLength(JSON.stringify(payload), "utf8");
}

function providerResultToShape(
  result: EditorSegmentationProviderResult,
  maskStorageKey?: string
): EditorObjectShape {
  return {
    selectionMode: result.maskUrl ? "mask" : "polygon",
    boundingBox: result.boundingBox,
    polygon: result.polygon,
    maskUrl: result.maskUrl,
    maskStorageKey,
    alphaMask: result.alphaMask,
    cutoutUrl: result.cutoutUrl,
    confidence: result.confidence,
    editableShape: true,
    segmentationSource: result.segmentationSource,
  };
}

export function getEditorSegmentationProviderStatus(): EditorSegmentationProviderStatus {
  const replicate = isReplicateConfigured();
  const sam2 = isSam2SegmentationAvailable();
  const rembg = segmentationProviderAvailable("rembg");
  const primary: EditorSegmentProviderId | "none" = replicate
    ? "replicate_sam3"
    : sam2
      ? "sam2"
      : rembg
        ? "rembg"
        : "none";
  return { replicate, sam2, rembg, primary };
}

async function finalizeReplicateSam3Segment(input: {
  userId: string;
  sessionId: string;
  objectId: string;
  imageUrl: string;
  rep: Extract<Awaited<ReturnType<typeof segmentEditorImageWithReplicateSam3>>, { ok: true }>;
  createCutout: boolean;
  targetBounds?: EditorCanvasBounds;
  clickPoint?: EditorShapePoint;
  requestId?: string;
  clickStartedMs?: number;
}): Promise<
  | { ok: true; result: EditorSegmentationProviderResult; shape: EditorObjectShape; maskUrl: string; cutoutUrl?: string }
  | { ok: false; code: EditorSegmentErrorCode; message: string }
> {
  if (!input.rep.result.maskUrl) {
    return {
      ok: false,
      code: "replicate_mask_format_unsupported",
      message: "Replicate returned a mask format that could not be used.",
    };
  }

  if (
    input.clickStartedMs &&
    segmentClickDeadlineExceeded(input.clickStartedMs)
  ) {
    return {
      ok: false,
      code: "replicate_timeout",
      message: "Segmentation took too long before finalize. Try again.",
    };
  }

  const sourceLoaded = await loadSourceImageBuffer({ imageUrl: input.imageUrl });
  if (!sourceLoaded.ok) {
    return { ok: false, code: sourceLoaded.code, message: sourceLoaded.message };
  }

  const maskLoaded = await maskBufferFromMaskRef(input.rep.result.maskUrl);
  if (!maskLoaded.ok) {
    return { ok: false, code: maskLoaded.code, message: maskLoaded.message };
  }

  try {
    const sourceBuffer = sourceLoaded.buffer;
    const maskBuffer = maskLoaded.buffer;
    const meta = await sharp(sourceBuffer).metadata();
    const width = Math.max(1, meta.width ?? 1);
    const height = Math.max(1, meta.height ?? 1);
    const contour = await extractMaskContourFromPng(maskBuffer);
    let boundingBox =
      normalizeBox(input.rep.result.boundingBox, width, height) ??
      contour.boundingBox ??
      input.targetBounds ??
      { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };
    if (contour.polygon.length < 3 && input.clickPoint) {
      const clickBox = clickBoundsAroundPoint(input.clickPoint, 0.24);
      boundingBox =
        input.targetBounds ? intersectBounds(clickBox, input.targetBounds) : clickBox;
    }
    const polygon =
      contour.polygon.length >= 3
        ? contour.polygon
        : refineSelectionPolygonFromBounds(boundingBox);
    const blobStarted = Date.now();
    const persisted = await persistMaskAndCutout({
      userId: input.userId,
      sessionId: input.sessionId,
      objectId: input.objectId,
      sourceBuffer,
      maskBuffer,
      createCutout: input.createCutout,
      provider: "replicate_sam3",
    });
    logEditorSegmentTrace(
      "blob_upload_ms",
      {
        ms: Date.now() - blobStarted,
        createCutout: input.createCutout,
        totalMs: input.clickStartedMs ? Date.now() - input.clickStartedMs : undefined,
      },
      input.requestId
    );
    const result: EditorSegmentationProviderResult = {
      maskUrl: persisted.maskUrl,
      cutoutUrl: persisted.cutoutUrl,
      polygon,
      boundingBox,
      confidence: input.rep.result.confidence ?? 0.88,
      segmentationSource: "replicate_sam3",
      alphaMask: true,
      providerUsed: "replicate_sam3",
      predictionId: input.rep.result.predictionId,
      runtimeMs: input.rep.result.runtimeMs,
      maskStorageKey: persisted.maskStorageKey,
    };
    const shape = providerResultToShape(result, persisted.maskStorageKey);
    return {
      ok: true,
      result,
      shape,
      maskUrl: persisted.maskUrl,
      cutoutUrl: persisted.cutoutUrl,
    };
  } catch (error) {
    const code = classifyBlobPersistError(error);
    return {
      ok: false,
      code,
      message: error instanceof Error ? error.message : "Could not persist segmentation mask.",
    };
  }
}

export async function segmentByPrompt(
  input: SegmentByPromptInput
): Promise<
  | { ok: true; result: EditorSegmentationProviderResult; shape: EditorObjectShape }
  | { ok: false; error: string; code?: EditorSegmentErrorCode; providerAttempted: EditorSegmentProviderId }
> {
  const sessionId = input.sessionId?.trim() || "anonymous";
  const objectId = input.editorObjectId?.trim() || "object";
  const prompt = resolveEditorSegmentPrompt({ explicitPrompt: input.prompt });
  const createCutout = input.createCutout !== false;

  if (isReplicateConfigured()) {
    logEditorSegmentTrace("replicate_prompt_start", { imageUrl: Boolean(input.imageUrl), prompt });
    const rep = await segmentEditorImageWithReplicateSam3({
      imageUrl: input.imageUrl,
      prompt,
      timeoutMs: EDITOR_REFINE_REPLICATE_TIMEOUT_MS,
    });
    if (!rep.ok) {
      return {
        ok: false,
        error: rep.error,
        code: mapReplicateErrorToCode(rep.error),
        providerAttempted: "replicate_sam3",
      };
    }
    if (rep.ok) {
      const finalized = await finalizeReplicateSam3Segment({
        userId: input.userId,
        sessionId,
        objectId,
        imageUrl: input.imageUrl,
        rep,
        createCutout,
      });
      if (finalized.ok) {
        return {
          ok: true,
          result: finalized.result,
          shape: finalized.shape,
        };
      }
      return {
        ok: false,
        error: finalized.message,
        code: finalized.code,
        providerAttempted: "replicate_sam3",
      };
    }
  }

  if (segmentationProviderAvailable("rembg")) {
    const uploadPathPrefix = `editor/segments/${sessionId}`;
    const rembgResult = await segmentEditorLayer({
      sourceUrl: input.imageUrl,
      uploadPathPrefix,
      mode: "refine",
    });
    if (rembgResult.maskUrl) {
      const result: EditorSegmentationProviderResult = {
        ...rembgResult,
        providerUsed: "rembg",
        segmentationSource: rembgResult.segmentationSource,
      };
      return { ok: true, result, shape: providerResultToShape(result) };
    }
  }

  return { ok: false, error: "No segmentation provider available.", providerAttempted: "heuristic" };
}

export async function segmentByClick(
  input: SegmentByClickInput
): Promise<
  | { ok: true; result: EditorSegmentationProviderResult; shape: EditorObjectShape; maskUrl: string; cutoutUrl?: string }
  | { ok: false; code: EditorSegmentErrorCode; message: string; fallbacks: string[] }
> {
  const sessionId = input.sessionId?.trim() || "anonymous";
  const objectId = input.editorObjectId?.trim() || "object";
  const createCutout = input.createCutout !== false;
  const requestId = input.requestId?.trim() || "none";
  const clickStartedMs = Date.now();
  const prompt = resolveEditorSegmentPrompt({
    category: input.category,
    semanticType: input.semanticType,
    label: input.label,
    objectHint: input.objectHint,
  });

  logEditorSegmentTrace(
    "click_start",
    {
      provider: "replicate_sam3",
      imageUrlPresent: Boolean(input.imageUrl),
      prompt,
      createCutout,
      sessionId,
      objectId,
    },
    requestId
  );

  try {
    if (isReplicateConfigured() && input.imageUrl) {
      logEditorSegmentTrace("replicate_click_start", { imageUrl: input.imageUrl, prompt }, requestId);
      const rep = await segmentEditorImageWithReplicateSam3({
        imageUrl: input.imageUrl,
        prompt,
        clickPoint: input.clickPoint,
        timeoutMs: EDITOR_CLICK_REPLICATE_TIMEOUT_MS,
      });
      if (!rep.ok) {
        logEditorSegmentTrace(
          "replicate_click_failed",
          {
            error: rep.error,
            failureCode: mapReplicateErrorToCode(rep.error),
            totalMs: Date.now() - clickStartedMs,
          },
          requestId
        );
        return segmentFailure(mapReplicateErrorToCode(rep.error), rep.error);
      }
      if (segmentClickDeadlineExceeded(clickStartedMs)) {
        logEditorSegmentTrace(
          "click_deadline_after_replicate",
          { totalMs: Date.now() - clickStartedMs },
          requestId
        );
        return segmentFailure(
          "replicate_timeout",
          "Segmentation took too long. Try again."
        );
      }
      logEditorSegmentTrace(
        "replicate_click_completed",
        {
          predictionId: rep.result.predictionId,
          replicatePredictionMs: rep.result.runtimeMs,
          maskFormat: rep.result.maskUrl?.startsWith("data:") ? "data_uri" : rep.result.maskUrl ? "url" : "missing",
          totalMs: Date.now() - clickStartedMs,
        },
        requestId
      );
      const finalized = await finalizeReplicateSam3Segment({
        userId: input.userId,
        sessionId,
        objectId,
        imageUrl: input.imageUrl,
        rep,
        createCutout,
        targetBounds: input.targetBounds,
        clickPoint: input.clickPoint,
        requestId,
        clickStartedMs,
      });
      if (finalized.ok) {
        logEditorSegmentTrace(
          "click_success",
          {
            provider: "replicate_sam3",
            maskUrl: Boolean(finalized.maskUrl),
            cutoutUrl: Boolean(finalized.cutoutUrl),
            totalMs: Date.now() - clickStartedMs,
          },
          requestId
        );
        return finalized;
      }
      logEditorSegmentTrace(
        "click_finalize_failed",
        {
          code: finalized.code,
          message: finalized.message,
          totalMs: Date.now() - clickStartedMs,
        },
        requestId
      );
      return segmentFailure(finalized.code, finalized.message);
    }
  } catch (error) {
    logEditorSegmentTrace(
      "click_internal_error",
      {
        error: error instanceof Error ? error.message : String(error),
        totalMs: Date.now() - clickStartedMs,
      },
      requestId
    );
    return segmentFailure(
      "segmentation_internal_error",
      error instanceof Error ? error.message : "Segmentation failed."
    );
  }

  if (isSam2SegmentationAvailable()) {
    const sam2: Sam2ClickSegmentResult = await segmentEditorClickWithSam2({
      userId: input.userId,
      backgroundStorageKey: input.backgroundStorageKey,
      request: {
        imageUrl: input.imageUrl,
        imageBase64: input.imageBase64,
        clickPoint: input.clickPoint,
        targetBounds: input.targetBounds,
        positivePoints: input.positivePoints,
        negativePoints: input.negativePoints,
        objectHint: input.objectHint,
        editorObjectId: input.editorObjectId,
        sessionId: input.sessionId,
        createCutout: input.createCutout,
      },
    });
    if (sam2.ok) {
      const result: EditorSegmentationProviderResult = {
        maskUrl: sam2.maskUrl,
        cutoutUrl: sam2.cutoutUrl,
        polygon: sam2.shape.polygon ?? boundsToPolygon(sam2.shape.boundingBox),
        boundingBox: sam2.shape.boundingBox,
        confidence: sam2.shape.confidence ?? 0.9,
        segmentationSource: "sam2",
        alphaMask: true,
        providerUsed: "sam2",
        maskStorageKey: sam2.shape.maskStorageKey,
      };
      return {
        ok: true,
        result,
        shape: sam2.shape,
        maskUrl: sam2.maskUrl,
        cutoutUrl: sam2.cutoutUrl,
      };
    }
  }

  if (segmentationProviderAvailable("rembg") && input.imageUrl) {
    try {
      const uploadPathPrefix = `editor/segments/${sessionId}`;
      const rembgResult = await segmentEditorLayer({
        sourceUrl: input.imageUrl,
        uploadPathPrefix,
        mode: "refine",
        targetBounds: input.targetBounds,
      });
      if (rembgResult.maskUrl) {
        const result: EditorSegmentationProviderResult = {
          ...rembgResult,
          providerUsed: "rembg",
          segmentationSource: rembgResult.segmentationSource,
        };
        const shape = providerResultToShape(result);
        return {
          ok: true,
          result,
          shape,
          maskUrl: rembgResult.maskUrl ?? "",
          cutoutUrl: rembgResult.cutoutUrl,
        };
      }
    } catch (error) {
      return segmentFailure(
        "image_fetch_failed",
        error instanceof Error ? error.message : "Could not fetch editor image."
      );
    }
  }

  return segmentFailure(
    "SEGMENT_UNAVAILABLE",
    "Could not generate a precise mask. Try manual outline or check provider configuration."
  );
}

export async function removeBackground(
  input: RemoveBackgroundInput
): Promise<EditorSegmentationProviderResult> {
  const sessionId = input.sessionId?.trim() || "anonymous";
  const subjectPrompt = resolveEditorSegmentPrompt({
    explicitPrompt: input.subjectPrompt ?? "person",
  });

  if (isReplicateConfigured()) {
    const rep = await segmentEditorImageWithReplicateSam3({
      imageUrl: input.sourceUrl,
      prompt: subjectPrompt,
      timeoutMs: EDITOR_CLICK_REPLICATE_TIMEOUT_MS,
    });
    if (rep.ok) {
      const finalized = await finalizeReplicateSam3Segment({
        userId: input.userId,
        sessionId,
        objectId: "background-remove",
        imageUrl: input.sourceUrl,
        rep,
        createCutout: true,
        targetBounds: input.targetBounds,
      });
      if (finalized.ok) {
        return finalized.result;
      }
    }
  }

  const uploadPathPrefix = `editor/segments/${sessionId}`;
  const rembgResult = await segmentEditorLayer({
    sourceUrl: input.sourceUrl,
    uploadPathPrefix,
    mode: "remove_background",
    targetBounds: input.targetBounds,
  });
  return {
    ...rembgResult,
    providerUsed: rembgResult.segmentationSource === "rembg" ? "rembg" : "heuristic",
  };
}

export async function createCutout(input: SegmentByClickInput): Promise<
  | { ok: true; cutoutUrl: string; maskUrl: string; shape: EditorObjectShape }
  | { ok: false; message: string }
> {
  const click = await segmentByClick({ ...input, createCutout: true });
  if (!click.ok) {
    return { ok: false, message: click.message };
  }
  if (!click.cutoutUrl || !click.maskUrl) {
    return { ok: false, message: "Cutout could not be created." };
  }
  return { ok: true, cutoutUrl: click.cutoutUrl, maskUrl: click.maskUrl, shape: click.shape };
}
