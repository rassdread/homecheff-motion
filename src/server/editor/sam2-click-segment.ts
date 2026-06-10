import { extractMaskContourFromPng } from "@/lib/editor-mask-contour";
import {
  buildSam2ProductionStatus,
  DEFAULT_SAM2_PRODUCTION_CONFIG,
  enqueueSam2Request,
  recordSam2RequestOutcome,
  resizeImageBufferForSam2,
  runSam2HealthCheck,
  withSam2Retry,
  type Sam2ProductionStatus,
} from "@/lib/editor-sam2-production";
import {
  auditSam2Availability,
  buildSam2RemotePoints,
  isSam2SegmentationAvailable,
  parseSam2RemoteResponse,
  SAM2_UNAVAILABLE_USER_MESSAGE,
  type Sam2ClickSegmentRequest,
} from "@/lib/editor-sam2-segmentation";
import { recordEditorVisionMetric } from "@/lib/editor-vision-metrics";
import { validateEditorSegmentImageSource } from "@/server/editor/editor-image-ownership";
import { editorMaskStoragePath } from "@/server/editor/editor-mask-storage";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";
import type { EditorObjectShape } from "@/types/homecheff-visual-editor";
import sharp from "sharp";

export type Sam2ClickSegmentResult =
  | { ok: true; shape: EditorObjectShape; maskUrl: string; cutoutUrl?: string }
  | { ok: false; code: "SAM2_UNAVAILABLE" | "VALIDATION" | "REMOTE" | "STORAGE"; message: string };

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

async function callSam2Remote(input: {
  imageUrl?: string;
  imageBase64?: string;
  width: number;
  height: number;
  points: ReturnType<typeof buildSam2RemotePoints>;
  targetBounds?: Sam2ClickSegmentRequest["targetBounds"];
  objectHint?: string;
}): Promise<ReturnType<typeof parseSam2RemoteResponse>> {
  const endpoint = process.env.SAM2_SEGMENTATION_URL!.trim();
  const body = {
    imageUrl: input.imageUrl,
    imageBase64: input.imageBase64?.replace(/^data:image\/[a-z+]+;base64,/i, ""),
    width: input.width,
    height: input.height,
    points: input.points,
    targetBounds: input.targetBounds,
    objectHint: input.objectHint,
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(DEFAULT_SAM2_PRODUCTION_CONFIG.requestTimeoutMs),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SAM2 service error (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as unknown;
  return parseSam2RemoteResponse(json);
}

export async function segmentEditorClickWithSam2(params: {
  userId: string;
  request: Sam2ClickSegmentRequest;
  backgroundStorageKey?: string;
}): Promise<Sam2ClickSegmentResult> {
  if (!isSam2SegmentationAvailable()) {
    return {
      ok: false,
      code: "SAM2_UNAVAILABLE",
      message: SAM2_UNAVAILABLE_USER_MESSAGE,
    };
  }

  const validated = validateEditorSegmentImageSource({
    imageUrl: params.request.imageUrl,
    imageBase64: params.request.imageBase64,
    backgroundStorageKey: params.backgroundStorageKey,
    userId: params.userId,
  });
  if (!validated.ok) {
    return { ok: false, code: "VALIDATION", message: validated.error };
  }

  const sessionId = params.request.sessionId?.trim() || "anonymous";
  const objectId = params.request.editorObjectId?.trim() || "object";

  let sourceBuffer: Buffer;
  try {
    sourceBuffer = await loadSourceImageBuffer({
      imageUrl: validated.imageUrl,
      imageBase64: validated.imageBase64,
    });
  } catch (error) {
    return {
      ok: false,
      code: "VALIDATION",
      message: error instanceof Error ? error.message : "Could not load image.",
    };
  }

  const resized = await resizeImageBufferForSam2(sourceBuffer);
  const width = resized.width;
  const height = resized.height;
  const imageBase64ForSam2 = resized.scaled
    ? `data:image/png;base64,${resized.buffer.toString("base64")}`
    : validated.source === "base64"
      ? validated.imageBase64
      : undefined;

  const points = buildSam2RemotePoints({
    clickPoint: params.request.clickPoint,
    positivePoints: params.request.positivePoints,
    negativePoints: params.request.negativePoints,
  });

  const segmentStarted = Date.now();
  let remote: ReturnType<typeof parseSam2RemoteResponse>;
  try {
    remote = await enqueueSam2Request(() =>
      withSam2Retry(() =>
        callSam2Remote({
          imageUrl:
            resized.scaled || validated.source !== "url" ? undefined : validated.imageUrl,
          imageBase64: imageBase64ForSam2,
          width,
          height,
          points,
          targetBounds: params.request.targetBounds,
          objectHint: params.request.objectHint,
        })
      )
    );
    recordSam2RequestOutcome(true, Date.now() - segmentStarted);
    recordEditorVisionMetric({
      type: "segmentation",
      success: true,
      durationMs: Date.now() - segmentStarted,
    });
  } catch (error) {
    recordSam2RequestOutcome(false, Date.now() - segmentStarted);
    recordEditorVisionMetric({
      type: "segmentation",
      success: false,
      durationMs: Date.now() - segmentStarted,
    });
    return {
      ok: false,
      code: "REMOTE",
      message: error instanceof Error ? error.message : "SAM2 segmentation failed.",
    };
  }

  if (!remote) {
    return { ok: false, code: "REMOTE", message: "SAM2 returned an invalid response." };
  }

  let maskBuffer: Buffer | null = null;
  if (remote.maskBase64) {
    maskBuffer = Buffer.from(remote.maskBase64.replace(/^data:image\/[a-z+]+;base64,/i, ""), "base64");
  } else if (remote.maskUrl) {
    const maskRes = await fetch(remote.maskUrl, { cache: "no-store" });
    if (maskRes.ok) {
      maskBuffer = Buffer.from(await maskRes.arrayBuffer());
    }
  }

  if (!maskBuffer) {
    return { ok: false, code: "REMOTE", message: "SAM2 did not return a mask." };
  }

  const contour = await extractMaskContourFromPng(maskBuffer);
  const polygon = remote.polygon?.length ? remote.polygon : contour.polygon;
  const boundingBox = remote.boundingBox ?? contour.boundingBox;

  const maskPath = editorMaskStoragePath({ userId: params.userId, sessionId, objectId, kind: "mask" });
  let maskUrl: string;
  try {
    const uploaded = await uploadPublicBlob({
      pathname: maskPath,
      body: maskBuffer,
      contentType: "image/png",
      addRandomSuffix: false,
      allowOverwrite: true,
      context: { uploadTarget: maskPath, provider: "editor-sam2-mask" },
    });
    maskUrl = uploaded.url;
  } catch (error) {
    return {
      ok: false,
      code: "STORAGE",
      message: error instanceof Error ? error.message : "Could not store mask.",
    };
  }

  let cutoutUrl: string | undefined;
  if (params.request.createCutout !== false) {
    try {
      const cutoutBuffer = await sharp(sourceBuffer)
        .resize(width, height, { fit: "fill" })
        .ensureAlpha()
        .composite([
          {
            input: await sharp(maskBuffer).resize(width, height, { fit: "fill" }).ensureAlpha().toBuffer(),
            blend: "dest-in",
          },
        ])
        .png()
        .toBuffer();
      const cutoutPath = editorMaskStoragePath({ userId: params.userId, sessionId, objectId, kind: "cutout" });
      const uploadedCutout = await uploadPublicBlob({
        pathname: cutoutPath,
        body: cutoutBuffer,
        contentType: "image/png",
        addRandomSuffix: false,
        allowOverwrite: true,
        context: { uploadTarget: cutoutPath, provider: "editor-sam2-cutout" },
      });
      cutoutUrl = uploadedCutout.url;
    } catch {
      cutoutUrl = undefined;
    }
  }

  recordEditorVisionMetric({ type: "mask_created" });

  const shape: EditorObjectShape = {
    selectionMode: "mask",
    boundingBox,
    polygon,
    maskUrl,
    maskStorageKey: maskPath,
    alphaMask: true,
    cutoutUrl,
    confidence: remote.confidence ?? 0.9,
    editableShape: true,
    segmentationSource: "sam2",
  };

  return { ok: true, shape, maskUrl, cutoutUrl };
}

let cachedSam2Status: Sam2ProductionStatus | null = null;
let cachedSam2StatusAt = 0;

export function getSam2ServiceStatus(): Sam2ProductionStatus {
  const availability = auditSam2Availability();
  const now = Date.now();
  if (cachedSam2Status && now - cachedSam2StatusAt < 30_000) {
    return cachedSam2Status;
  }
  const endpoint = process.env.SAM2_SEGMENTATION_URL?.trim();
  if (endpoint) {
    void runSam2HealthCheck(endpoint, availability).then((status) => {
      cachedSam2Status = status;
      cachedSam2StatusAt = Date.now();
    });
  }
  cachedSam2Status = buildSam2ProductionStatus(availability);
  cachedSam2StatusAt = now;
  return cachedSam2Status;
}
