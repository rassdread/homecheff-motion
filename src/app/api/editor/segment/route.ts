import { NextResponse } from "next/server";
import { segmentEditorLayer } from "@/server/editor/segment-editor-layer";
import type { EditorCanvasBounds } from "@/types/homecheff-visual-editor";

export const runtime = "nodejs";

type SegmentBody = {
  sourceUrl?: string;
  sessionId?: string;
  mode?: "refine" | "remove_background";
  targetBounds?: EditorCanvasBounds;
};

export async function POST(request: Request) {
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
  const uploadPathPrefix = `editor/segments/${sessionId}`;

  try {
    const result = await segmentEditorLayer({
      sourceUrl,
      uploadPathPrefix,
      mode,
      targetBounds: body.targetBounds,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Segmentation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
