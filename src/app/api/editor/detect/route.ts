import { NextResponse } from "next/server";
import { recordEditorVisionMetric } from "@/lib/editor-vision-metrics";
import { requireActiveUser } from "@/server/auth/permissions";
import { detectEditorObjectsFromImageUrl } from "@/server/editor/editor-onnx-detection";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: { imageUrl?: string };
  try {
    body = (await request.json()) as { imageUrl?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const imageUrl = body.imageUrl?.trim();
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required." }, { status: 400 });
  }

  const result = await detectEditorObjectsFromImageUrl(imageUrl);
  const count = result.detections.length;

  if (count > 0) {
    recordEditorVisionMetric({ type: "detection", count, source: "onnx" });
  }

  return NextResponse.json({
    ...result,
    meta: {
      source: count > 0 ? "onnx" : "vision",
      detectorKind: result.detectorKind,
      count,
      onnxAvailable: result.available,
    },
  });
}
