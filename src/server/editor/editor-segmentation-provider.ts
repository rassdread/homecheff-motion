import { extractMaskContourFromPng } from "@/lib/editor-mask-contour";
import {
  boundsFromPolygon,
  boundsToPolygon,
  refineSelectionPolygonFromBounds,
} from "@/lib/editor-object-mask";
import { resolveEditorSegmentPrompt } from "@/lib/editor-segmentation-prompt";
import { segmentationProviderAvailable } from "@/lib/premium-foreground-segmentation";
import { isReplicateConfigured } from "@/server/admin/replicate-client";
import { editorMaskStoragePath } from "@/server/editor/editor-mask-storage";
import { segmentEditorLayer } from "@/server/editor/segment-editor-layer";
import { segmentEditorImageWithReplicateSam3 } from "@/server/editor/replicate-sam3-editor-segment";
import {
  segmentEditorClickWithSam2,
  type Sam2ClickSegmentResult,
} from "@/server/editor/sam2-click-segment";
import { isSam2SegmentationAvailable } from "@/lib/editor-sam2-segmentation";
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

async function loadSourceImageBuffer(input: {
  imageUrl?: string;
  imageBase64?: string;
}): Promise<Buffer> {
  if (input.imageBase64) {
    const base64 = input.imageBase64.replace(/^data:image\/[a-z+]+;base64,/i, "");
    return Buffer.from(base64, "base64");
  }
  if (!input.imageUrl) {
    throw new Error("Missing image source.");
  }
  const res = await fetch(input.imageUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not fetch image (${res.status}).`);
  }
  return Buffer.from(await res.arrayBuffer());
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

async function maskBufferFromUrl(maskUrl: string): Promise<Buffer | null> {
  const res = await fetch(maskUrl, { cache: "no-store" });
  if (!res.ok) {
    return null;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer.length >= 100 ? buffer : null;
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

export async function segmentByPrompt(
  input: SegmentByPromptInput
): Promise<
  | { ok: true; result: EditorSegmentationProviderResult; shape: EditorObjectShape }
  | { ok: false; error: string; providerAttempted: EditorSegmentProviderId }
> {
  const sessionId = input.sessionId?.trim() || "anonymous";
  const objectId = input.editorObjectId?.trim() || "object";
  const prompt = resolveEditorSegmentPrompt({ explicitPrompt: input.prompt });
  const createCutout = input.createCutout !== false;

  if (isReplicateConfigured()) {
    const rep = await segmentEditorImageWithReplicateSam3({ imageUrl: input.imageUrl, prompt });
    if (rep.ok && rep.result.maskUrl) {
      const sourceBuffer = await loadSourceImageBuffer({ imageUrl: input.imageUrl });
      const maskBuffer = await maskBufferFromUrl(rep.result.maskUrl);
      if (maskBuffer) {
        const meta = await sharp(sourceBuffer).metadata();
        const width = Math.max(1, meta.width ?? 1);
        const height = Math.max(1, meta.height ?? 1);
        const contour = await extractMaskContourFromPng(maskBuffer);
        const boundingBox =
          normalizeBox(rep.result.boundingBox, width, height) ??
          contour.boundingBox ??
          { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };
        const polygon =
          contour.polygon.length >= 3
            ? contour.polygon
            : refineSelectionPolygonFromBounds(boundingBox);
        const persisted = await persistMaskAndCutout({
          userId: input.userId,
          sessionId,
          objectId,
          sourceBuffer,
          maskBuffer,
          createCutout,
          provider: "replicate_sam3",
        });
        const result: EditorSegmentationProviderResult = {
          maskUrl: persisted.maskUrl,
          cutoutUrl: persisted.cutoutUrl,
          polygon,
          boundingBox,
          confidence: rep.result.confidence ?? 0.88,
          segmentationSource: "replicate_sam3",
          alphaMask: true,
          providerUsed: "replicate_sam3",
          predictionId: rep.result.predictionId,
          runtimeMs: rep.result.runtimeMs,
          maskStorageKey: persisted.maskStorageKey,
        };
        return { ok: true, result, shape: providerResultToShape(result, persisted.maskStorageKey) };
      }
    }
    if (!rep.ok && rep.error === "Replicate is not configured") {
      return { ok: false, error: rep.error, providerAttempted: "replicate_sam3" };
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
  | { ok: false; code: string; message: string; fallbacks: string[] }
> {
  const sessionId = input.sessionId?.trim() || "anonymous";
  const objectId = input.editorObjectId?.trim() || "object";
  const createCutout = input.createCutout !== false;
  const prompt = resolveEditorSegmentPrompt({
    category: input.category,
    semanticType: input.semanticType,
    label: input.label,
    objectHint: input.objectHint,
  });

  if (isReplicateConfigured() && input.imageUrl) {
    const rep = await segmentEditorImageWithReplicateSam3({
      imageUrl: input.imageUrl,
      prompt,
    });
    if (rep.ok && rep.result.maskUrl) {
      try {
        const sourceBuffer = await loadSourceImageBuffer({ imageUrl: input.imageUrl });
        const maskBuffer = await maskBufferFromUrl(rep.result.maskUrl);
        if (maskBuffer) {
          const meta = await sharp(sourceBuffer).metadata();
          const width = Math.max(1, meta.width ?? 1);
          const height = Math.max(1, meta.height ?? 1);
          const contour = await extractMaskContourFromPng(maskBuffer);
          let boundingBox =
            normalizeBox(rep.result.boundingBox, width, height) ??
            contour.boundingBox ??
            input.targetBounds ??
            { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };
          if (input.targetBounds && contour.polygon.length < 3) {
            boundingBox = input.targetBounds;
          }
          const polygon =
            contour.polygon.length >= 3
              ? contour.polygon
              : refineSelectionPolygonFromBounds(boundingBox);
          const persisted = await persistMaskAndCutout({
            userId: input.userId,
            sessionId,
            objectId,
            sourceBuffer,
            maskBuffer,
            createCutout,
            provider: "replicate_sam3",
          });
          const result: EditorSegmentationProviderResult = {
            maskUrl: persisted.maskUrl,
            cutoutUrl: persisted.cutoutUrl,
            polygon,
            boundingBox,
            confidence: rep.result.confidence ?? 0.88,
            segmentationSource: "replicate_sam3",
            alphaMask: true,
            providerUsed: "replicate_sam3",
            predictionId: rep.result.predictionId,
            runtimeMs: rep.result.runtimeMs,
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
        }
      } catch (error) {
        console.info("[editor-segmentation]", {
          provider: "replicate_sam3",
          phase: "persist_failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
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
  }

  return {
    ok: false,
    code: "SEGMENT_UNAVAILABLE",
    message: "Could not generate a precise mask. Try manual outline or check provider configuration.",
    fallbacks: ["manual_lasso", "rembg_foreground", "approximate_box"],
  };
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
    });
    if (rep.ok && rep.result.maskUrl) {
      const sourceBuffer = await loadSourceImageBuffer({ imageUrl: input.sourceUrl });
      const maskBuffer = await maskBufferFromUrl(rep.result.maskUrl);
      if (maskBuffer) {
        const meta = await sharp(sourceBuffer).metadata();
        const width = Math.max(1, meta.width ?? 1);
        const height = Math.max(1, meta.height ?? 1);
        const contour = await extractMaskContourFromPng(maskBuffer);
        const boundingBox =
          normalizeBox(rep.result.boundingBox, width, height) ??
          contour.boundingBox ??
          input.targetBounds ??
          { x: 0, y: 0, width: 1, height: 1 };
        const polygon =
          contour.polygon.length >= 3
            ? contour.polygon
            : refineSelectionPolygonFromBounds(boundingBox);
        const persisted = await persistMaskAndCutout({
          userId: input.userId,
          sessionId,
          objectId: "background-remove",
          sourceBuffer,
          maskBuffer,
          createCutout: true,
          provider: "replicate_sam3",
        });
        return {
          maskUrl: persisted.maskUrl,
          cutoutUrl: persisted.cutoutUrl,
          polygon,
          boundingBox,
          confidence: rep.result.confidence ?? 0.85,
          segmentationSource: "replicate_sam3",
          alphaMask: true,
          providerUsed: "replicate_sam3",
          predictionId: rep.result.predictionId,
          runtimeMs: rep.result.runtimeMs,
          maskStorageKey: persisted.maskStorageKey,
        };
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
