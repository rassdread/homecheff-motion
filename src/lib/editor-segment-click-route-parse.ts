import { clampNormalizedPoint } from "@/lib/editor-sam2-segmentation";
import type { EditorCanvasBounds, EditorShapePoint } from "@/types/homecheff-visual-editor";

export type EditorSegmentClickBody = {
  imageUrl?: string;
  imageBase64?: string;
  backgroundStorageKey?: string;
  clickPoint?: EditorShapePoint;
  targetBounds?: EditorCanvasBounds;
  positivePoints?: EditorShapePoint[];
  negativePoints?: EditorShapePoint[];
  objectHint?: string;
  category?: string;
  semanticType?: string;
  label?: string;
  editorObjectId?: string;
  parentLayerId?: string;
  sessionId?: string;
  createCutout?: boolean;
};

export function parseEditorSegmentClickPoint(raw: unknown): EditorShapePoint | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.x !== "number" || typeof o.y !== "number") {
    return null;
  }
  return clampNormalizedPoint({ x: o.x, y: o.y });
}

export function parseEditorSegmentClickPoints(raw: unknown): EditorShapePoint[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(parseEditorSegmentClickPoint).filter((p): p is EditorShapePoint => p !== null);
}
