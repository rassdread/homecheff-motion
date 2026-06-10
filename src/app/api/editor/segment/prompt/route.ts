import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { segmentByPrompt } from "@/server/editor/editor-segmentation-provider";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Text-prompt segmentation — Replicate SAM3 first, REMBG fallback. */
export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: { imageUrl?: string; prompt?: string; sessionId?: string; createCutout?: boolean };
  try {
    body = (await request.json()) as { imageUrl?: string; prompt?: string; sessionId?: string; createCutout?: boolean };
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

  const result = await segmentByPrompt({
    userId: user.id,
    imageUrl,
    prompt,
    sessionId: body.sessionId,
    editorObjectId: "prompt",
    createCutout: body.createCutout !== false,
  });

  if (!result.ok) {
    const status = result.error.includes("not configured") ? 503 : 422;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  const { result: seg, shape } = result;
  const bbox = seg.boundingBox;

  return NextResponse.json({
    ok: true,
    segmentationSource: seg.segmentationSource,
    maskUrl: seg.maskUrl,
    cutoutUrl: seg.cutoutUrl,
    overlayUrl: null,
    confidence: seg.confidence,
    predictionId: seg.predictionId,
    runtimeMs: seg.runtimeMs,
    providerUsed: seg.providerUsed,
    boundingBox: bbox,
    polygon: seg.polygon,
    selectionMode: shape.selectionMode,
    alphaMask: seg.alphaMask,
  });
}
