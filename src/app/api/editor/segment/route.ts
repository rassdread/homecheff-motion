import { NextResponse } from "next/server";
import { segmentErrorHttpStatus } from "@/lib/editor-segmentation-errors";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  estimateSegmentResponseBytes,
  removeBackground,
  segmentByPrompt,
} from "@/server/editor/editor-segmentation-provider";
import type { EditorCanvasBounds } from "@/types/homecheff-visual-editor";

export const runtime = "nodejs";
export const maxDuration = 120;

type SegmentBody = {
  sourceUrl?: string;
  sessionId?: string;
  mode?: "refine" | "remove_background";
  targetBounds?: EditorCanvasBounds;
  objectHint?: string;
  prompt?: string;
};

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: SegmentBody;
  try {
    body = (await request.json()) as SegmentBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "invalid_json" }, { status: 400 });
  }

  const sourceUrl = body.sourceUrl?.trim();
  if (!sourceUrl) {
    return NextResponse.json({ error: "sourceUrl is required.", code: "missing_source_url" }, { status: 400 });
  }

  const mode = body.mode === "remove_background" ? "remove_background" : "refine";
  const sessionId = body.sessionId?.trim() || "anonymous";

  try {
    if (mode === "remove_background") {
      const result = await removeBackground({
        userId: user.id,
        sourceUrl,
        sessionId,
        subjectPrompt: body.prompt ?? body.objectHint ?? "person",
        targetBounds: body.targetBounds,
      });
      const payload = {
        ...result,
        providerUsed: result.providerUsed,
      };
      if (estimateSegmentResponseBytes(payload) > 512_000) {
        return NextResponse.json(
          { error: "Segmentation response was too large.", code: "response_payload_too_large" },
          { status: segmentErrorHttpStatus("response_payload_too_large") }
        );
      }
      return NextResponse.json(payload);
    }

    const promptResult = await segmentByPrompt({
      userId: user.id,
      imageUrl: sourceUrl,
      prompt: body.prompt ?? body.objectHint ?? "person",
      sessionId,
      editorObjectId: "refine",
      createCutout: false,
    });

    if (!promptResult.ok) {
      const code = promptResult.code ?? "SEGMENT_UNAVAILABLE";
      return NextResponse.json(
        { error: promptResult.error, code },
        { status: segmentErrorHttpStatus(code) }
      );
    }

    const { result } = promptResult;
    const payload = {
      maskUrl: result.maskUrl,
      cutoutUrl: result.cutoutUrl,
      polygon: result.polygon,
      boundingBox: result.boundingBox,
      confidence: result.confidence,
      segmentationSource: result.segmentationSource,
      alphaMask: result.alphaMask,
      providerUsed: result.providerUsed,
      predictionId: result.predictionId,
      runtimeMs: result.runtimeMs,
    };
    if (estimateSegmentResponseBytes(payload) > 512_000) {
      return NextResponse.json(
        { error: "Segmentation response was too large.", code: "response_payload_too_large" },
        { status: segmentErrorHttpStatus("response_payload_too_large") }
      );
    }
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Segmentation failed.";
    console.error("[editor-segment]", { mode, error: message });
    return NextResponse.json(
      { error: message, code: "segmentation_internal_error" },
      { status: 500 }
    );
  }
}
