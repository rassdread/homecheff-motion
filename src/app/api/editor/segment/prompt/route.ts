import { NextResponse } from "next/server";
import { segmentErrorHttpStatus } from "@/lib/editor-segmentation-errors";
import { requireActiveUser } from "@/server/auth/permissions";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
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

  return runBilledProviderRoute({
    user,
    actionType: "transformation_session",
    relatedJobId: body.sessionId,
    execute: () =>
      segmentByPrompt({
        userId: user.id,
        imageUrl,
        prompt,
        sessionId: body.sessionId,
        editorObjectId: "prompt",
        createCutout: body.createCutout !== false,
      }),
    isFailure: (result) => !result.ok,
    onSuccess: (result, estimatedCredits) => {
      if (!result.ok) {
        const code = result.code ?? (result.error.includes("not configured") ? "SEGMENT_UNAVAILABLE" : "replicate_prediction_failed");
        return NextResponse.json(
          { ok: false, error: result.error, code },
          { status: segmentErrorHttpStatus(code) }
        );
      }

      const { result: seg, shape } = result;
      const bbox = seg.boundingBox;

      return NextResponse.json(
        withEstimatedCredits(
          {
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
          },
          estimatedCredits
        )
      );
    },
  });
}
