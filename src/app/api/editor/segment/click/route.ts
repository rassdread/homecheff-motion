import { NextResponse } from "next/server";
import { clampNormalizedPoint } from "@/lib/editor-sam2-segmentation";
import { requireActiveUser } from "@/server/auth/permissions";
import { segmentByClick } from "@/server/editor/editor-segmentation-provider";
import type { EditorCanvasBounds, EditorShapePoint } from "@/types/homecheff-visual-editor";

export const runtime = "nodejs";
export const maxDuration = 120;

type ClickBody = {
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
  sessionId?: string;
  createCutout?: boolean;
};

function parsePoint(raw: unknown): EditorShapePoint | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.x !== "number" || typeof o.y !== "number") {
    return null;
  }
  return clampNormalizedPoint({ x: o.x, y: o.y });
}

function parsePoints(raw: unknown): EditorShapePoint[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(parsePoint).filter((p): p is EditorShapePoint => p !== null);
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: ClickBody;
  try {
    body = (await request.json()) as ClickBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const clickPoint = parsePoint(body.clickPoint);
  if (!clickPoint) {
    return NextResponse.json({ error: "clickPoint { x, y } is required (normalized 0–1)." }, { status: 400 });
  }

  const result = await segmentByClick({
    userId: user.id,
    backgroundStorageKey: body.backgroundStorageKey,
    imageUrl: body.imageUrl,
    imageBase64: body.imageBase64,
    clickPoint,
    targetBounds: body.targetBounds,
    positivePoints: parsePoints(body.positivePoints),
    negativePoints: parsePoints(body.negativePoints),
    objectHint: body.objectHint,
    category: body.category,
    semanticType: body.semanticType,
    label: body.label,
    editorObjectId: body.editorObjectId,
    sessionId: body.sessionId,
    createCutout: body.createCutout,
  });

  if (!result.ok) {
    const status = result.code === "SEGMENT_UNAVAILABLE" ? 503 : 502;
    return NextResponse.json(
      {
        error: result.message,
        code: result.code,
        fallbacks: result.fallbacks,
      },
      { status }
    );
  }

  const { shape, result: providerResult } = result;
  return NextResponse.json({
    selectionMode: shape.selectionMode,
    maskUrl: shape.maskUrl,
    cutoutUrl: shape.cutoutUrl,
    polygon: shape.polygon,
    boundingBox: shape.boundingBox,
    segmentationSource: shape.segmentationSource,
    confidence: shape.confidence,
    maskStorageKey: shape.maskStorageKey,
    alphaMask: shape.alphaMask,
    providerUsed: providerResult.providerUsed,
    predictionId: providerResult.predictionId,
    runtimeMs: providerResult.runtimeMs,
  });
}
