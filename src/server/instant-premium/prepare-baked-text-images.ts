import type { Prisma } from "@prisma/client";
import { createLockedTextLayer, type LockedTextLayer } from "@/lib/locked-text-layer";
import {
  parseBakedTextProtectionInput,
  type BakedTextProtectionStatus,
} from "@/lib/baked-text-protection";
import {
  maskAndUploadBakedTextSafeImage,
  resolveMaskRegionForProtection,
} from "@/server/instant-premium/mask-baked-text-image";
import type { CreateAnimationProjectImageInput } from "@/types/animation-api";

export type PreparedInstantImage = CreateAnimationProjectImageInput & {
  hasBakedText: boolean;
  bakedTextProtectionStatus: BakedTextProtectionStatus;
  bakedTextExactCopy: string | null;
  bakedTextMaskRegion: Prisma.InputJsonValue | null;
  viduInputUrl: string | null;
};

export type PrepareBakedTextImagesResult =
  | { ok: true; images: PreparedInstantImage[]; extraLockedLayers: LockedTextLayer[] }
  | { ok: false; error: string };

export async function prepareInstantImagesWithBakedTextProtection(
  images: CreateAnimationProjectImageInput[],
  options: { uploadPathPrefix: string; totalDurationMs: number }
): Promise<PrepareBakedTextImagesResult> {
  const prepared: PreparedInstantImage[] = [];
  const extraLockedLayers: LockedTextLayer[] = [];

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const protection = parseBakedTextProtectionInput(image.bakedTextProtection);

    if (!protection?.enabled) {
      prepared.push({
        ...image,
        hasBakedText: false,
        bakedTextProtectionStatus: "none",
        bakedTextExactCopy: null,
        bakedTextMaskRegion: null,
        viduInputUrl: null,
      });
      continue;
    }

    const exactText = protection.exactText?.trim() ?? "";
    if (!exactText) {
      return {
        ok: false,
        error: `Image ${index + 1}: enter the exact text shown in the photo when baked text protection is enabled.`,
      };
    }

    const maskRegion = resolveMaskRegionForProtection({
      maskRegion: protection.maskRegion,
      positionY: protection.positionY,
    });

    const sourceUrl = image.workingImageUrl?.trim() || image.previewUrl?.trim();
    if (!sourceUrl) {
      return {
        ok: false,
        error: `Image ${index + 1}: missing source URL for baked text masking.`,
      };
    }

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
      viduInputUrl,
    });
  }

  return { ok: true, images: prepared, extraLockedLayers };
}
