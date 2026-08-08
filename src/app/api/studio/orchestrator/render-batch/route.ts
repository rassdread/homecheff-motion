import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { PRODUCTION_TRANSACTION_HEADER } from "@/lib/studio-production-transaction";
import { renderProductionBatch } from "@/server/studio/studio-production-batch-render";
import { validateStudioRenderPrerequisites } from "@/server/studio-generation/render-input-validation";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    storyboardId?: string;
    sceneIndices?: number[];
    batchIndex?: number;
    productionTransactionId?: string;
    requireVoice?: boolean;
    requireSubtitles?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const storyboardId = body.storyboardId?.trim() ?? "";
  const sceneIndices = body.sceneIndices ?? [];
  if (!storyboardId || sceneIndices.length === 0) {
    return NextResponse.json({ error: "storyboardId and sceneIndices required" }, { status: 400 });
  }

  const storyboard = await prisma.studioStoryboard.findFirst({
    where: { id: storyboardId, ownerId: user.id },
    select: {
      id: true,
      scenes: {
        select: {
          id: true,
          sceneImages: { select: { imageUrl: true, status: true }, take: 3 },
        },
      },
      voices: { select: { id: true, audioUrl: true }, take: 1 },
      subtitleTracks: { select: { id: true }, take: 1 },
    },
  });
  if (!storyboard) {
    return NextResponse.json({ error: "Storyboard not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  const prereq = validateStudioRenderPrerequisites({
    hasScenes: storyboard.scenes.length > 0,
    hasSceneImages: storyboard.scenes.some((s) =>
      s.sceneImages.some((img) => Boolean(img.imageUrl?.trim()))
    ),
    /** Opt-in: do not block motion batch when voice is merely enabled on the storyboard. */
    voiceRequired: body.requireVoice === true,
    hasVoiceAudio: storyboard.voices.some((v) => Boolean(v.audioUrl?.trim())),
    subtitlesRequired: body.requireSubtitles === true,
    hasSubtitles: storyboard.subtitleTracks.length > 0,
  });
  if (!prereq.ok) {
    return NextResponse.json(
      {
        error: prereq.safeMessage,
        code: prereq.code,
        missing: prereq.missing,
      },
      { status: 400 }
    );
  }

  const productionTransactionId =
    body.productionTransactionId?.trim() ||
    request.headers.get(PRODUCTION_TRANSACTION_HEADER)?.trim() ||
    "";

  const result = await renderProductionBatch({
    viewer: user,
    storyboardId,
    sceneIndices,
    batchIndex: body.batchIndex ?? 0,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: result.httpStatus });
  }

  return NextResponse.json({
    ok: true,
    projectId: result.projectId,
    warnings: result.warnings,
    productionTransactionId: productionTransactionId || undefined,
  });
}
