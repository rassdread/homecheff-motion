import { segmentationProviderAvailable } from "@/lib/premium-foreground-segmentation";
import type { EditorCanvasBounds, EditorObjectShape, EditorShapePoint } from "@/types/homecheff-visual-editor";

export type Sam2PointLabel = "positive" | "negative";

export type Sam2ClickPoint = EditorShapePoint & {
  label: Sam2PointLabel;
};

export type Sam2ClickSegmentRequest = {
  imageUrl?: string;
  imageBase64?: string;
  clickPoint: EditorShapePoint;
  targetBounds?: EditorCanvasBounds;
  positivePoints?: EditorShapePoint[];
  negativePoints?: EditorShapePoint[];
  objectHint?: string;
  editorObjectId?: string;
  sessionId?: string;
  createCutout?: boolean;
};

export type Sam2RemoteRequest = {
  imageUrl?: string;
  imageBase64?: string;
  width?: number;
  height?: number;
  points: Array<{ x: number; y: number; label: 1 | 0 }>;
  targetBounds?: EditorCanvasBounds;
  objectHint?: string;
};

export type Sam2RemoteResponse = {
  maskBase64?: string;
  maskUrl?: string;
  polygon?: EditorShapePoint[];
  boundingBox?: EditorCanvasBounds;
  confidence?: number;
};

export type Sam2Availability = {
  available: boolean;
  endpointConfigured: boolean;
  reason?: string;
  fallbacks: Array<"manual_lasso" | "rembg_foreground" | "approximate_box">;
};

export const SAM2_UNAVAILABLE_USER_MESSAGE =
  "Precise object selection is not available yet.";

export const SAM2_UNAVAILABLE_HUMAN_MESSAGE_NL =
  "Nauwkeurig selecteren is nog niet beschikbaar. Je kunt zelf omlijnen.";

export function isSam2SegmentationAvailable(): boolean {
  return segmentationProviderAvailable("sam2");
}

export function auditSam2Availability(): Sam2Availability {
  const endpointConfigured = Boolean(process.env.SAM2_SEGMENTATION_URL?.trim());
  const available = endpointConfigured;
  return {
    available,
    endpointConfigured,
    reason: available ? undefined : "SAM2_SEGMENTATION_URL missing",
    fallbacks: ["manual_lasso", "rembg_foreground", "approximate_box"],
  };
}

export function clampNormalizedPoint(point: EditorShapePoint): EditorShapePoint {
  return {
    x: Math.min(1, Math.max(0, point.x)),
    y: Math.min(1, Math.max(0, point.y)),
  };
}

export function buildSam2RemotePoints(input: {
  clickPoint: EditorShapePoint;
  positivePoints?: EditorShapePoint[];
  negativePoints?: EditorShapePoint[];
}): Sam2RemoteRequest["points"] {
  const points: Sam2RemoteRequest["points"] = [];
  const pushUnique = (point: EditorShapePoint, label: 1 | 0) => {
    const normalized = clampNormalizedPoint(point);
    const key = `${label}:${normalized.x.toFixed(4)}:${normalized.y.toFixed(4)}`;
    if (points.some((p) => `${p.label}:${p.x.toFixed(4)}:${p.y.toFixed(4)}` === key)) {
      return;
    }
    points.push({ x: normalized.x, y: normalized.y, label });
  };

  for (const point of input.positivePoints ?? []) {
    pushUnique(point, 1);
  }
  pushUnique(input.clickPoint, 1);
  for (const point of input.negativePoints ?? []) {
    pushUnique(point, 0);
  }

  return points;
}

export function parseSam2RemoteResponse(raw: unknown): Sam2RemoteResponse | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const maskBase64 =
    typeof o.maskBase64 === "string"
      ? o.maskBase64
      : typeof o.mask === "string"
        ? o.mask
        : undefined;
  const maskUrl = typeof o.maskUrl === "string" ? o.maskUrl : undefined;
  const confidence = typeof o.confidence === "number" ? o.confidence : undefined;

  const polygon = Array.isArray(o.polygon)
    ? o.polygon
        .map((p) => {
          if (!p || typeof p !== "object") {
            return null;
          }
          const pt = p as Record<string, unknown>;
          if (typeof pt.x !== "number" || typeof pt.y !== "number") {
            return null;
          }
          return clampNormalizedPoint({ x: pt.x, y: pt.y });
        })
        .filter((p): p is EditorShapePoint => p !== null)
    : undefined;

  const bboxRaw = o.boundingBox ?? o.bbox;
  let boundingBox: EditorCanvasBounds | undefined;
  if (bboxRaw && typeof bboxRaw === "object") {
    const b = bboxRaw as Record<string, unknown>;
    if (
      typeof b.x === "number" &&
      typeof b.y === "number" &&
      typeof b.width === "number" &&
      typeof b.height === "number"
    ) {
      boundingBox = { x: b.x, y: b.y, width: b.width, height: b.height };
    }
  }

  if (!maskBase64 && !maskUrl && !polygon?.length) {
    return null;
  }

  return { maskBase64, maskUrl, polygon, boundingBox, confidence };
}

export function sam2ResponseToEditorObjectShape(input: {
  maskUrl?: string;
  cutoutUrl?: string;
  polygon: EditorShapePoint[];
  boundingBox: EditorCanvasBounds;
  confidence?: number;
}): EditorObjectShape {
  return {
    selectionMode: "mask",
    boundingBox: input.boundingBox,
    polygon: input.polygon,
    maskUrl: input.maskUrl,
    alphaMask: Boolean(input.maskUrl),
    cutoutUrl: input.cutoutUrl,
    confidence: input.confidence ?? 0.9,
    editableShape: true,
    segmentationSource: "sam2",
  };
}

export function editorMaskActionUsesSam2Shape(layer: {
  selectionShape?: EditorObjectShape | null;
} | null): boolean {
  return layer?.selectionShape?.segmentationSource === "sam2";
}
