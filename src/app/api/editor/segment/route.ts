import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
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
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sourceUrl = body.sourceUrl?.trim();
  if (!sourceUrl) {
    return NextResponse.json({ error: "sourceUrl is required." }, { status: 400 });
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
      return NextResponse.json({
        ...result,
        providerUsed: result.providerUsed,
      });
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
      return NextResponse.json({ error: promptResult.error }, { status: 503 });
    }

    const { result } = promptResult;
    return NextResponse.json({
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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Segmentation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
