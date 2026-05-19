import type { Prisma } from "@prisma/client";
import { confirmedBlocks, parseBakedTextProtectionPayload } from "@/lib/baked-text-detection";
import type { BakedTextProtectionStatus } from "@/lib/baked-text-protection";
import { parseBakedTextProtectionInput } from "@/lib/baked-text-protection";
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
  viduInputUrl: string | null;
};

export type PrepareBakedTextImagesResult =
  | { ok: true; images: PreparedInstantImage[]; extraLockedLayers: LockedTextLayer[] }
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

export async function prepareInstantImagesWithBakedTextProtection(
  images: CreateAnimationProjectImageInput[],
  options: { uploadPathPrefix: string; totalDurationMs: number }
): Promise<PrepareBakedTextImagesResult> {
  const prepared: PreparedInstantImage[] = [];
  const extraLockedLayers: LockedTextLayer[] = [];

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

    if (confirmed.length > 0) {
      const maskRegions = confirmed.map((b) => b.bbox);
      let viduInputUrl: string;
      try {
        const masked = await maskAndUploadBakedTextSafeImage({
          sourceUrl,
          maskRegion: maskRegions[0],
          maskRegions,
          uploadPathPrefix: `${options.uploadPathPrefix}/image-${index}`,
        });
        viduInputUrl = masked.url;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Baked text masking failed.";
        return { ok: false, error: `Image ${index + 1}: ${message}` };
      }

      extraLockedLayers.push(...lockedLayersFromBakedTextBlocks(confirmed, options.totalDurationMs));

      prepared.push({
        ...image,
        hasBakedText: true,
        bakedTextProtectionStatus: "masked",
        bakedTextExactCopy: confirmed.map((b) => b.editedText).join("\n"),
        bakedTextMaskRegion: null,
        bakedTextBlocksJson: confirmed as unknown as Prisma.InputJsonValue,
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

    let viduInputUrl: string;
    try {
      const masked = await maskAndUploadBakedTextSafeImage({
        sourceUrl,
        maskRegion,
        uploadPathPrefix: `${options.uploadPathPrefix}/image-${index}`,
      });
      viduInputUrl = masked.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Baked text masking failed.";
      return { ok: false, error: `Image ${index + 1}: ${message}` };
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
      viduInputUrl,
    });
  }

  return { ok: true, images: prepared, extraLockedLayers };
}
