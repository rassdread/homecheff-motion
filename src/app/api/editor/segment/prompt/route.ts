import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { segmentEditorImageWithReplicateSam3 } from "@/server/editor/replicate-sam3-editor-segment";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Text-prompt segmentation via Replicate SAM3 (Editor click-to-segment fallback). */
export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: { imageUrl?: string; prompt?: string };
  try {
    body = (await request.json()) as { imageUrl?: string; prompt?: string };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Replicate could not process this image." },
      { status: 400 }
    );
  }

  const imageUrl = body.imageUrl?.trim();
  const prompt = body.prompt?.trim() ?? "person";
  if (!imageUrl) {
    return NextResponse.json(
      { ok: false, error: "Replicate could not process this image." },
      { status: 400 }
    );
  }

  const result = await segmentEditorImageWithReplicateSam3({ imageUrl, prompt });
  if (!result.ok) {
    const status = result.error === "Replicate is not configured" ? 503 : 422;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  const bbox = result.result.boundingBox;
  const polygon =
    result.result.polygons?.[0]?.map((pair) => ({ x: pair[0], y: pair[1] })) ?? [];

  return NextResponse.json({
    ok: true,
    segmentationSource: "replicate_sam3",
    maskUrl: result.result.maskUrl,
    overlayUrl: result.result.overlayUrl,
    confidence: result.result.confidence,
    predictionId: result.result.predictionId,
    runtimeMs: result.result.runtimeMs,
    boundingBox: bbox
      ? { x: bbox[0], y: bbox[1], width: bbox[2], height: bbox[3] }
      : null,
    polygon,
    polygons: result.result.polygons,
  });
}
