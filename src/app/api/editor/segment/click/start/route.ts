import { NextResponse } from "next/server";
import { resolveEditorSegmentPrompt } from "@/lib/editor-segmentation-prompt";
import {
  parseEditorSegmentClickPoint,
  type EditorSegmentClickBody,
} from "@/lib/editor-segment-click-route-parse";
import { requireActiveUser } from "@/server/auth/permissions";
import { logEditorSegmentJob } from "@/server/editor/editor-segment-click-job-log";
import { createEditorSegmentClickJob } from "@/server/editor/editor-segment-click-job-store";
import { scheduleEditorSegmentClickJob } from "@/server/editor/editor-segment-click-job-runner";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: EditorSegmentClickBody;
  try {
    body = (await request.json()) as EditorSegmentClickBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "invalid_json" }, { status: 400 });
  }

  const clickPoint = parseEditorSegmentClickPoint(body.clickPoint);
  if (!clickPoint) {
    return NextResponse.json(
      { error: "clickPoint { x, y } is required (normalized 0–1).", code: "invalid_click_point" },
      { status: 400 }
    );
  }

  if (!body.imageUrl?.trim()) {
    return NextResponse.json(
      { error: "imageUrl is required.", code: "image_fetch_failed" },
      { status: 400 }
    );
  }

  const prompt = resolveEditorSegmentPrompt({
    category: body.category,
    semanticType: body.semanticType,
    label: body.label,
    objectHint: body.objectHint,
  });

  const editorObjectId = body.editorObjectId?.trim() || `segment_${Date.now()}`;
  const sessionId = body.sessionId?.trim() || "anonymous";

  const job = createEditorSegmentClickJob({
    userId: user.id,
    sessionId,
    prompt,
    imageUrl: body.imageUrl.trim(),
    clickPoint,
    parentLayerId: body.parentLayerId?.trim() ?? null,
    editorObjectId,
    targetBounds: body.targetBounds,
    backgroundStorageKey: body.backgroundStorageKey,
    createCutout: body.createCutout,
  });

  logEditorSegmentJob({
    jobId: job.jobId,
    status: "queued",
    provider: "replicate_sam3",
    elapsedMs: 0,
    finalResult: "queued",
    prompt,
  });

  scheduleEditorSegmentClickJob(job.jobId);

  return NextResponse.json({
    jobId: job.jobId,
    status: "queued",
    prompt,
    editorObjectId,
  });
}
