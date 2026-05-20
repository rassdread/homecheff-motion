import type { Prisma } from "@prisma/client";
import type { ProjectDetectedTextSnapshot } from "@/lib/hybrid-motion-overlay";
import { parsePosterMotionSettings, type PosterMotionSettings } from "@/lib/poster-motion-preserve";
import type { CreateAnimationProjectImageInput } from "@/types/animation-api";
import type { PreparedInstantImage, PrepareBakedTextImagesResult } from "@/server/instant-premium/prepare-baked-text-images";
import { segmentForegroundForPosterMotion } from "@/server/instant-premium/foreground-segmentation/segment-foreground";

export async function preparePosterMotionPreserveImages(
  images: CreateAnimationProjectImageInput[],
  options: {
    uploadPathPrefix: string;
    posterMotionSettings?: PosterMotionSettings;
  }
): Promise<PrepareBakedTextImagesResult> {
  const settings = parsePosterMotionSettings(options.posterMotionSettings);
  const prepared: PreparedInstantImage[] = [];
  const emptyMetadata: ProjectDetectedTextSnapshot = {
    version: 1,
    capturedAt: new Date().toISOString(),
    blocks: [],
  };

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const sourceUrl = image.workingImageUrl?.trim() || image.previewUrl?.trim();
    if (!sourceUrl) {
      return {
        ok: false,
        error: `Image ${index + 1}: missing source URL for poster motion preparation.`,
      };
    }

    let posterMotionLayersJson: Prisma.InputJsonValue | null = null;
    if (settings.animateForegroundOnly || settings.animateMascot || settings.animateProduct) {
      try {
        const snapshot = await segmentForegroundForPosterMotion({
          sourceUrl,
          uploadPathPrefix: `${options.uploadPathPrefix}/image-${index}`,
          imageIndex: index,
        });
        posterMotionLayersJson = snapshot as unknown as Prisma.InputJsonValue;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Foreground segmentation failed.";
        return { ok: false, error: `Image ${index + 1}: ${message}` };
      }
    }

    prepared.push({
      ...image,
      hasBakedText: false,
      bakedTextProtectionStatus: "none",
      bakedTextExactCopy: null,
      bakedTextMaskRegion: null,
      bakedTextBlocksJson: null,
      instantTextPatches: null,
      /** Original poster pixels sent to Vidu — typography stays in-frame. */
      viduInputUrl: sourceUrl,
      posterMotionLayersJson,
    });
  }

  return {
    ok: true,
    images: prepared,
    extraLockedLayers: [],
    maskBlocksSkipped: 0,
    warnings: settings.preserveAllText
      ? ["Poster motion preserve: typography remains in the original base image (no OCR rebuild)."]
      : [],
    detectedTextMetadata: emptyMetadata,
  };
}
