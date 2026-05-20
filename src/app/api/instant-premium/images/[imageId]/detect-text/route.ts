import { NextResponse } from "next/server";
import { detectedBlockToRecord } from "@/lib/baked-text-detection";
import {
  isAutoConfirmBakedTextEnabledFromEnv,
  resolveAutoConfirmBakedTextBlocks,
} from "@/lib/baked-text-auto-confirm";
import { normalizeHeroReprojectBlocks } from "@/lib/instant-text-hero-overlay";
import { averageBlockConfidence, createScanRequestId } from "@/lib/instant-ocr-scan";
import {
  buildOcrErrorPayload,
  classifyOcrFailure,
  OcrProviderError,
} from "@/lib/ocr-provider-errors";
import { prisma } from "@/lib/prisma";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";
import {
  detectTextBlocksFromImageUrlWithTimeout,
  OcrDetectTimeoutError,
} from "@/server/image-text-detection/detect-with-timeout";

type RouteContext = {
  params: Promise<{ imageId: string }>;
};

function logOcrDetectError(payload: Record<string, unknown>): void {
  console.info("[ocr-detect]", "error", payload);
}

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
    mode?: "fast" | "full";
  };
  const mode = body.mode === "full" ? "full" : "fast";
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
        {
          ok: false,
          scanRequestId,
          error: "Forbidden.",
          errorCode: "FORBIDDEN",
          userMessage: "Geen toegang tot deze tekstscan.",
        },
        { status: 403 }
      );
    }
    if (!imageUrl) {
      imageUrl = dbImage.storageKey?.trim() || dbImage.previewUrl?.trim() || "";
    }
  }

  if (!imageUrl) {
    return NextResponse.json(
      {
        ok: false,
        scanRequestId,
        error: "imageUrl is required.",
        errorCode: "MISSING_IMAGE_URL",
        userMessage: "Afbeelding ontbreekt voor tekstscan.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await detectTextBlocksFromImageUrlWithTimeout(imageUrl, scanRequestId, { mode });
    const detected = result.blocks.map(detectedBlockToRecord);
    const autoConfirmEnabled = isAutoConfirmBakedTextEnabledFromEnv();
    const { blocks: resolvedBlocks, autoConfirmed } = resolveAutoConfirmBakedTextBlocks(
      detected,
      autoConfirmEnabled
    );
    const blocks = normalizeHeroReprojectBlocks(resolvedBlocks);
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
      const payload = buildOcrErrorPayload({
        scanRequestId,
        errorCode: "OPENAI_TIMEOUT",
        durationMs,
        provider: "openai",
        logMessage: error.message,
      });
      logOcrDetectError({
        errorCode: payload.errorCode,
        status: 504,
        provider: "openai",
        scanRequestId,
      });
      return NextResponse.json(payload, { status: 504 });
    }

    if (error instanceof OcrProviderError) {
      const payload = buildOcrErrorPayload({
        scanRequestId,
        errorCode: error.errorCode,
        durationMs,
        provider: error.provider ?? "openai",
        logMessage: error.message,
      });
      logOcrDetectError({
        errorCode: payload.errorCode,
        status: 503,
        provider: payload.provider ?? "openai",
        scanRequestId,
      });
      return NextResponse.json(payload, { status: 503 });
    }

    const resolved = classifyOcrFailure(error);
    const payload = buildOcrErrorPayload({
      scanRequestId,
      errorCode: resolved.errorCode,
      durationMs,
      provider: resolved.provider,
      logMessage: resolved.logMessage,
    });
    logOcrDetectError({
      errorCode: payload.errorCode,
      status: resolved.httpStatus,
      provider: payload.provider ?? "openai",
      scanRequestId,
    });
    return NextResponse.json(payload, { status: resolved.httpStatus });
  }
}
