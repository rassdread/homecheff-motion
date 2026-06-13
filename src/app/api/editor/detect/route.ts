import { NextResponse } from "next/server";
import { recordEditorVisionMetric } from "@/lib/editor-vision-metrics";
import { requireActiveUser } from "@/server/auth/permissions";
import { detectEditorObjectsFromImageUrl } from "@/server/editor/editor-onnx-detection";
import type { EditorDetectionMeta } from "@/types/homecheff-visual-editor";

export const runtime = "nodejs";

function buildDetectMeta(
  result: Awaited<ReturnType<typeof detectEditorObjectsFromImageUrl>>
): EditorDetectionMeta {
  const count = result.detections.length;
  const workerActive = result.backend === "video-worker" && !result.failed;
  const layerSource: EditorDetectionMeta["source"] =
    workerActive && count > 0 ? "onnx" : count > 0 ? "onnx" : "vision";

  let userMessageKey: string | undefined;
  if (result.status === "fallback") {
    userMessageKey = "editor.detectionStatus.visionFallback";
  } else if (result.status === "unavailable") {
    userMessageKey = "editor.detectionStatus.unavailable";
  }

  return {
    source: layerSource,
    backend: result.backend,
    status: result.status,
    detectorKind: result.detectorKind,
    count,
    onnxAvailable: workerActive || (result.available && result.backend !== "fallback"),
    inferenceMs: result.inferenceMs,
    lastDetectedAt: result.detectedAt,
    userMessageKey,
  };
}

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
  const durationMs = result.inferenceMs;

  if (result.failed) {
    recordEditorVisionMetric({
      type: "detection_failed",
      error: result.error ?? "detection_failed",
      durationMs,
    });
  } else if (count > 0) {
    recordEditorVisionMetric({
      type: "detection",
      count,
      source: result.backend === "video-worker" ? "onnx" : "onnx",
      durationMs,
    });
  } else {
    recordEditorVisionMetric({ type: "detection", count: 0, source: "onnx", durationMs });
  }

  const meta = buildDetectMeta(result);

  return NextResponse.json({
    ...result,
    meta,
  });
}
