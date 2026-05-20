import { NextResponse } from "next/server";
import { detectedBlockToRecord } from "@/lib/baked-text-detection";
import {
  isAutoConfirmBakedTextEnabledFromEnv,
  resolveAutoConfirmBakedTextBlocks,
} from "@/lib/baked-text-auto-confirm";
import { averageBlockConfidence, createScanRequestId } from "@/lib/instant-ocr-scan";
import { prisma } from "@/lib/prisma";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";
import {
  detectTextBlocksFromImageUrlWithTimeout,
  OcrDetectTimeoutError,
} from "@/server/image-text-detection/detect-with-timeout";

type RouteContext = {
  params: Promise<{ imageId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const startedAt = Date.now();
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { imageId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    imageUrl?: string;
    scanRequestId?: string;
  };
  const scanRequestId =
    typeof body.scanRequestId === "string" && body.scanRequestId.trim()
      ? body.scanRequestId.trim()
      : createScanRequestId();
  let imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";

  const dbImage = await prisma.animationImage.findUnique({
    where: { id: imageId },
    include: { project: { select: { ownerId: true } } },
  });

  if (dbImage) {
    const allowed = dbImage.project.ownerId === user.id || canAccessAdmin(user);
    if (!allowed) {
      return NextResponse.json(
        { ok: false, scanRequestId, error: "Forbidden.", errorCode: "FORBIDDEN" },
        { status: 403 }
      );
    }
    if (!imageUrl) {
      imageUrl = dbImage.storageKey?.trim() || dbImage.previewUrl?.trim() || "";
    }
  }

  if (!imageUrl) {
    return NextResponse.json(
      { ok: false, scanRequestId, error: "imageUrl is required.", errorCode: "MISSING_IMAGE_URL" },
      { status: 400 }
    );
  }

  try {
    const result = await detectTextBlocksFromImageUrlWithTimeout(imageUrl, scanRequestId);
    const detected = result.blocks.map(detectedBlockToRecord);
    const autoConfirmEnabled = isAutoConfirmBakedTextEnabledFromEnv();
    const { blocks, autoConfirmed } = resolveAutoConfirmBakedTextBlocks(
      detected,
      autoConfirmEnabled
    );
    const durationMs = Date.now() - startedAt;
    const blockCount = blocks.filter((b) => b.kept !== false).length;
    const averageConfidence = averageBlockConfidence(blocks);

    return NextResponse.json({
      ok: true,
      scanRequestId,
      provider: result.provider,
      status: autoConfirmed ? "auto_protected" : blockCount > 0 ? "needs_review" : "no_text_found",
      blockCount,
      averageConfidence,
      durationMs,
      autoConfirmEnabled,
      autoConfirmed,
      imageId,
      imageWidth: result.imageWidth,
      imageHeight: result.imageHeight,
      blocks,
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    if (error instanceof OcrDetectTimeoutError) {
      return NextResponse.json(
        {
          ok: false,
          scanRequestId,
          status: "timeout",
          error: error.message,
          errorCode: "OCR_TIMEOUT",
          durationMs,
        },
        { status: 504 }
      );
    }
    const message = error instanceof Error ? error.message : "Text detection failed.";
    return NextResponse.json(
      {
        ok: false,
        scanRequestId,
        status: "failed",
        error: message,
        errorCode: "OCR_FAILED",
        durationMs,
      },
      { status: 503 }
    );
  }
}
