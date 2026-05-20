import type { Prisma } from "@prisma/client";
import sharp from "sharp";
import { confirmedBlocks, parseBakedTextProtectionPayload, type BakedTextBlockRecord } from "@/lib/baked-text-detection";
import {
  BAKED_TEXT_MASK_BLOCKS_SKIPPED_WARNING_NL,
  logInvalidMaskRegion,
  normalizeMaskRegionNormalized,
  type BakedTextProtectionStatus,
} from "@/lib/baked-text-protection";
import { parseBakedTextProtectionInput } from "@/lib/baked-text-protection";
import { enrichBakedTextBlocksFromImage } from "@/lib/hybrid-motion-overlay-enrich";
import {
  normalizeTextRenderMode,
  shouldMaskForVidu,
  usesHybridPreAiNeutralize,
  usesPixelPreservedPatches,
  type ImageTextPatchesSnapshot,
  type ProjectDetectedTextSnapshot,
  type TextRenderMode,
} from "@/lib/hybrid-motion-overlay";
import { extractTextPatchesFromImage } from "@/server/instant-premium/hybrid-overlay/extract-text-patches";
import { lockedLayersFromBakedTextBlocks } from "@/server/instant-premium/baked-text-blocks-to-layers";
import {
  maskAndUploadBakedTextSafeImage,
  resolveMaskRegionForProtection,
} from "@/server/instant-premium/mask-baked-text-image";
import { createLockedTextLayer, type LockedTextLayer } from "@/lib/locked-text-layer";
import type { CreateAnimationProjectImageInput } from "@/types/animation-api";

export type PreparedInstantImage = CreateAnimationProjectImageInput & {
  hasBakedText: boolean;
  bakedTextProtectionStatus: BakedTextProtectionStatus;
  bakedTextExactCopy: string | null;
  bakedTextMaskRegion: Prisma.InputJsonValue | null;
  bakedTextBlocksJson: Prisma.InputJsonValue | null;
  instantTextPatches: Prisma.InputJsonValue | null;
  viduInputUrl: string | null;
};

export type PrepareBakedTextImagesResult =
  | {
      ok: true;
      images: PreparedInstantImage[];
      extraLockedLayers: LockedTextLayer[];
      maskBlocksSkipped: number;
      warnings: string[];
      detectedTextMetadata: ProjectDetectedTextSnapshot;
    }
  | { ok: false; error: string };

function parseProtection(image: CreateAnimationProjectImageInput) {
  const modern = parseBakedTextProtectionPayload(image.bakedTextProtection);
  if (modern) {
    return modern;
  }
  const legacy = parseBakedTextProtectionInput(image.bakedTextProtection);
  if (legacy?.enabled) {
    return {
      enabled: true as const,
      exactText: legacy.exactText,
      positionY: legacy.positionY,
      status: legacy.status,
      blocks: [] as const,
    };
  }
  return { enabled: false as const, status: "none" as const };
}

function sanitizeConfirmedBlocks(
  blocks: BakedTextBlockRecord[],
  context: { imageIndex: number; imageWidth: number; imageHeight: number }
): { blocks: BakedTextBlockRecord[]; skipped: number } {
  const valid: BakedTextBlockRecord[] = [];
  let skipped = 0;

  for (const block of blocks) {
    const normalized = normalizeMaskRegionNormalized(block.bbox);
    if (!normalized) {
      skipped += 1;
      logInvalidMaskRegion({
        imageIndex: context.imageIndex,
        ocrText: block.editedText || block.text,
        rawBbox: block.bbox,
        normalizedBbox: null,
        imageWidth: context.imageWidth,
        imageHeight: context.imageHeight,
      });
      continue;
    }
    valid.push({ ...block, bbox: normalized });
  }

  return { blocks: valid, skipped };
}

async function imageDimensionsFromUrl(sourceUrl: string): Promise<{ width: number; height: number }> {
  const res = await fetch(sourceUrl, { cache: "no-store" });
  if (!res.ok) {
    return { width: 720, height: 1280 };
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buffer).metadata();
  return {
    width: Math.max(1, meta.width ?? 720),
    height: Math.max(1, meta.height ?? 1280),
  };
}

export async function prepareInstantImagesWithBakedTextProtection(
  images: CreateAnimationProjectImageInput[],
  options: {
    uploadPathPrefix: string;
    totalDurationMs: number;
    textRenderMode?: TextRenderMode;
  }
): Promise<PrepareBakedTextImagesResult> {
  const textRenderMode = normalizeTextRenderMode(options.textRenderMode);
  const useHybridNeutralize = usesHybridPreAiNeutralize(textRenderMode);
  const maskEnabled = shouldMaskForVidu(textRenderMode);
  const prepared: PreparedInstantImage[] = [];
  const extraLockedLayers: LockedTextLayer[] = [];
  const metadataBlocks: ProjectDetectedTextSnapshot["blocks"] = [];
  let maskBlocksSkipped = 0;
  const warnings: string[] = [];

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const protection = parseProtection(image);

    if (!protection.enabled) {
      prepared.push({
        ...image,
        hasBakedText: false,
        bakedTextProtectionStatus: "none",
        bakedTextExactCopy: null,
        bakedTextMaskRegion: null,
        bakedTextBlocksJson: null,
        instantTextPatches: null,
        viduInputUrl: null,
      });
      continue;
    }

    const sourceUrl = image.workingImageUrl?.trim() || image.previewUrl?.trim();
    if (!sourceUrl) {
      return {
        ok: false,
        error: `Image ${index + 1}: missing source URL for baked text masking.`,
      };
    }

    const blockRecords = "blocks" in protection && Array.isArray(protection.blocks) ? protection.blocks : [];
    const confirmed = confirmedBlocks(blockRecords);
    const dims = await imageDimensionsFromUrl(sourceUrl);

    if (confirmed.length > 0) {
      const { blocks: maskableBlocks, skipped } = sanitizeConfirmedBlocks(confirmed, {
        imageIndex: index,
        imageWidth: dims.width,
        imageHeight: dims.height,
      });
      maskBlocksSkipped += skipped;

      let viduInputUrl: string | null = null;
      let textPatchesSnapshot: ImageTextPatchesSnapshot | null = null;

      if (maskableBlocks.length > 0 && maskEnabled) {
        const maskRegions = maskableBlocks.map((b) => b.bbox);
        try {
          const res = await fetch(sourceUrl, { cache: "no-store" });
          const sourceBuffer = res.ok ? Buffer.from(await res.arrayBuffer()) : null;
          if (sourceBuffer) {
            const enriched = await enrichBakedTextBlocksFromImage(sourceBuffer, maskableBlocks, {
              imageWidth: dims.width,
              imageHeight: dims.height,
            });
            metadataBlocks.push(...enriched);
            if (usesPixelPreservedPatches(textRenderMode)) {
              textPatchesSnapshot = await extractTextPatchesFromImage({
                sourceBuffer,
                blocks: maskableBlocks,
                uploadPathPrefix: `${options.uploadPathPrefix}/image-${index}`,
                imageOrder: index,
              });
            }
          }
          const masked = await maskAndUploadBakedTextSafeImage({
            sourceUrl,
            maskRegion: maskRegions[0],
            maskRegions,
            uploadPathPrefix: `${options.uploadPathPrefix}/image-${index}`,
            imageIndex: index,
            useHybridNeutralize,
          });
          viduInputUrl = masked.url;
          maskBlocksSkipped += masked.skippedRegionCount;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Baked text masking failed.";
          return { ok: false, error: `Image ${index + 1}: ${message}` };
        }
      }

      if (maskableBlocks.length > 0) {
        extraLockedLayers.push(...lockedLayersFromBakedTextBlocks(maskableBlocks, options.totalDurationMs));
      }

      prepared.push({
        ...image,
        hasBakedText: true,
        bakedTextProtectionStatus: "masked",
        bakedTextExactCopy: confirmed.map((b) => b.editedText).join("\n"),
        bakedTextMaskRegion: null,
        bakedTextBlocksJson: maskableBlocks as unknown as Prisma.InputJsonValue,
        instantTextPatches: textPatchesSnapshot
          ? (textPatchesSnapshot as unknown as Prisma.InputJsonValue)
          : null,
        viduInputUrl,
      });
      continue;
    }

    const exactText = protection.exactText?.trim() ?? "";
    if (!exactText) {
      return {
        ok: false,
        error: `Image ${index + 1}: confirm detected text blocks or enter exact legacy text.`,
      };
    }

    const maskRegion = resolveMaskRegionForProtection({
      maskRegion: "maskRegion" in protection ? protection.maskRegion : undefined,
      positionY: protection.positionY,
    });

    let viduInputUrl: string | null = null;
    if (maskEnabled) {
      try {
        const masked = await maskAndUploadBakedTextSafeImage({
          sourceUrl,
          maskRegion,
          uploadPathPrefix: `${options.uploadPathPrefix}/image-${index}`,
          imageIndex: index,
          useHybridNeutralize,
        });
        viduInputUrl = masked.url;
        maskBlocksSkipped += masked.skippedRegionCount;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Baked text masking failed.";
        return { ok: false, error: `Image ${index + 1}: ${message}` };
      }
    }

    const positionY = protection.positionY ?? 0.12;
    extraLockedLayers.push(
      createLockedTextLayer({
        text: exactText,
        x: 0.5,
        y: positionY,
        animation: "fade-in",
        startMs: 0,
        durationMs: Math.min(options.totalDurationMs, Math.max(2000, options.totalDurationMs)),
        textAlign: "center",
      })
    );

    prepared.push({
      ...image,
      hasBakedText: true,
      bakedTextProtectionStatus: "masked",
      bakedTextExactCopy: exactText,
      bakedTextMaskRegion: maskRegion as unknown as Prisma.InputJsonValue,
      bakedTextBlocksJson: null,
      instantTextPatches: null,
      viduInputUrl,
    });
  }

  if (maskBlocksSkipped > 0 && !warnings.includes(BAKED_TEXT_MASK_BLOCKS_SKIPPED_WARNING_NL)) {
    warnings.push(BAKED_TEXT_MASK_BLOCKS_SKIPPED_WARNING_NL);
  }

  return {
    ok: true,
    images: prepared,
    extraLockedLayers,
    maskBlocksSkipped,
    warnings,
    detectedTextMetadata: {
      version: 1,
      capturedAt: new Date().toISOString(),
      blocks: metadataBlocks,
    },
  };
}
