import { NextResponse } from "next/server";
import { segmentErrorHttpStatus } from "@/lib/editor-segmentation-errors";
import { clampNormalizedPoint } from "@/lib/editor-sam2-segmentation";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  estimateSegmentResponseBytes,
  segmentByClick,
} from "@/server/editor/editor-segmentation-provider";
import type { EditorCanvasBounds, EditorShapePoint } from "@/types/homecheff-visual-editor";

export const runtime = "nodejs";
/** Matches EDITOR_CLICK_ROUTE_DEADLINE_MS + small handler margin. */
export const maxDuration = 30;

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
    return NextResponse.json({ error: "Invalid JSON body.", code: "invalid_json" }, { status: 400 });
  }

  const clickPoint = parsePoint(body.clickPoint);
  if (!clickPoint) {
    return NextResponse.json(
      { error: "clickPoint { x, y } is required (normalized 0–1).", code: "invalid_click_point" },
      { status: 400 }
    );
  }

  const requestId = crypto.randomUUID();

  try {
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
      requestId,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.message,
          code: result.code,
          fallbacks: result.fallbacks,
        },
        { status: segmentErrorHttpStatus(result.code) }
      );
    }

    const { shape, result: providerResult } = result;
    const payload = {
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
    };

    if (estimateSegmentResponseBytes(payload) > 512_000) {
      return NextResponse.json(
        {
          error: "Segmentation response was too large.",
          code: "response_payload_too_large",
          fallbacks: ["manual_lasso", "approximate_box"],
        },
        { status: segmentErrorHttpStatus("response_payload_too_large") }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Segmentation failed.";
    console.error("[editor-segmentation]", { requestId, phase: "route_error", error: message });
    return NextResponse.json(
      {
        error: message,
        code: "segmentation_internal_error",
        fallbacks: ["manual_lasso", "approximate_box"],
      },
      { status: 500 }
    );
  }
}
