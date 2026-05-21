/**
 * Build language-export text layers from project locked / baked text.
 */

import { parseBakedTextBlockRecords } from "@/lib/baked-text-detection";
import {
  createLockedTextLayer,
  parseLockedTextLayersJson,
  type LockedTextLayer,
} from "@/lib/locked-text-layer";
import { analyzeTypographyStyleProfile } from "@/lib/typography-style-profile";
import { smartFitTypographyText } from "@/lib/typography-smart-fit";
import type { LanguageTextLayerRecord } from "@/lib/video-language-export";
import type { TypographyRenderQuality } from "@/lib/typography-style-profile";
import { resolveInstantVideoDimensions } from "@/lib/locked-text-layer";

export function extractLanguageTextLayersFromProject(project: {
  instantLockedTextLayers: unknown;
  instantOutputDurationSeconds: number | null;
  stylePreset?: string | null;
  images: Array<{ bakedTextBlocksJson: unknown; order: number }>;
}): LanguageTextLayerRecord[] {
  const durationMs = Math.max(3000, (project.instantOutputDurationSeconds ?? 8) * 1000);
  const locked = parseLockedTextLayersJson(project.instantLockedTextLayers);
  if (locked.length > 0) {
    return locked.map((layer) => {
      const typography = analyzeTypographyFromLocked(layer, project.stylePreset);
      return {
        id: layer.id,
        sourceText: layer.text,
        translatedText: layer.text,
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        fontSize: layer.fontSize,
        color: layer.color,
        backgroundColor: layer.backgroundColor,
        textAlign: layer.textAlign ?? "center",
        animation: layer.animation,
        startMs: layer.startMs,
        durationMs: layer.durationMs,
        typography,
      };
    });
  }

  const sortedImages = [...project.images].sort((a, b) => a.order - b.order);
  const heroImage = sortedImages[0];
  if (!heroImage) {
    return [];
  }
  const blocks = parseBakedTextBlockRecords(heroImage.bakedTextBlocksJson).filter(
    (b) => b.kept !== false && (b.editedText || b.text).trim().length >= 2
  );
  return blocks.slice(0, 8).map((block, index) => {
    const sourceText = (block.editedText || block.text).trim();
    const typography = analyzeTypographyStyleProfile({
      sourceText,
      fontSize: Math.max(18, Math.min(72, Math.round(block.suggestedFontSize ?? 36))),
      textAlign:
        block.suggestedAlign === "left" || block.suggestedAlign === "right"
          ? block.suggestedAlign
          : "center",
      x: block.bbox.x + block.bbox.width / 2,
      y: block.bbox.y,
      width: block.bbox.width,
      height: block.bbox.height,
      blockType: block.blockType,
      stylePreset: project.stylePreset,
    });
    return {
      id: block.id || `baked-${index}`,
      sourceText,
      translatedText: sourceText,
      x: block.bbox.x + block.bbox.width / 2,
      y: block.bbox.y,
      width: block.bbox.width,
      height: block.bbox.height,
      fontSize: typography.fontSize,
      color: typography.fillColor,
      backgroundColor: typography.background?.color,
      textAlign: typography.textAlign,
      animation: block.animation ?? "none",
      startMs: 0,
      durationMs: durationMs,
      typography,
    };
  });
}

function analyzeTypographyFromLocked(
  layer: LockedTextLayer,
  stylePreset?: string | null
) {
  return analyzeTypographyStyleProfile({
    sourceText: layer.text,
    fontSize: layer.fontSize,
    color: layer.color,
    backgroundColor: layer.backgroundColor,
    textAlign: layer.textAlign,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    stylePreset,
  });
}

/** Apply smart-fit + motion anchor updates after translation. */
export function enrichLanguageTextLayersForRender(params: {
  layers: LanguageTextLayerRecord[];
  languageCode: string;
  aspectRatio: string | null | undefined;
  viduResolution: string | null | undefined;
  quality?: TypographyRenderQuality;
}): LanguageTextLayerRecord[] {
  const { width, height } = resolveInstantVideoDimensions(
    params.aspectRatio,
    params.viduResolution
  );

  return params.layers.map((layer) => {
    const typography =
      layer.typography ??
      analyzeTypographyStyleProfile({
        sourceText: layer.sourceText,
        fontSize: layer.fontSize,
        color: layer.color,
        backgroundColor: layer.backgroundColor,
        textAlign: layer.textAlign,
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        languageCode: params.languageCode,
      });

    const isRtl = params.languageCode === "ar";
    const alignedTypography = {
      ...typography,
      textAlign: isRtl ? ("right" as const) : typography.textAlign,
      compositing: {
        ...typography.compositing,
        direction: isRtl ? ("rtl" as const) : typography.compositing.direction,
        motionAnchor: { x: layer.x, y: layer.y },
        trackingStability: typography.compositing.trackingStability,
        subpixelSnap: true,
      },
    };

    const text = layer.translatedText.trim() || layer.sourceText.trim();
    const fit = smartFitTypographyText({
      text,
      typography: alignedTypography,
      languageCode: params.languageCode,
      canvasWidth: width,
      canvasHeight: height,
      regionWidthNorm: layer.width,
      regionHeightNorm: layer.height,
      anchorX: layer.x,
      anchorY: layer.y,
    });

    return {
      ...layer,
      translatedText: text,
      typography: alignedTypography,
      fit,
      fontSize: fit.fontSize,
    };
  });
}

export function languageLayersToLockedLayers(
  records: LanguageTextLayerRecord[],
  languageCode: string,
  totalDurationMs: number
): LockedTextLayer[] {
  const isRtl = languageCode === "ar";
  return records.map((record) => {
    const text = record.translatedText.trim() || record.sourceText.trim();
    const fitFont = record.fit?.fontSize ?? record.fontSize ?? 42;
    const align = isRtl ? "right" : (record.textAlign ?? "center");
    return createLockedTextLayer({
      id: record.id,
      text,
      language:
        languageCode === "nl" || languageCode === "en" ? languageCode : "auto",
      x: clamp01(record.x),
      y: clamp01(record.y),
      width: record.width,
      height: record.height,
      fontSize: fitFont,
      color: record.color ?? record.typography?.fillColor ?? "#FFFFFF",
      backgroundColor: record.backgroundColor ?? record.typography?.background?.color,
      textAlign: align,
      animation:
        record.animation === "fade-in" ||
        record.animation === "none" ||
        record.animation === "slide-up"
          ? (record.animation as "fade-in" | "none")
          : "none",
      startMs: record.startMs ?? 0,
      durationMs: record.durationMs ?? totalDurationMs,
    });
  });
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, n));
}

export function mergeLanguageTextLayerOverrides(
  base: LanguageTextLayerRecord[],
  overrides: LanguageTextLayerRecord[] | undefined
): LanguageTextLayerRecord[] {
  if (!overrides?.length) {
    return base;
  }
  const byId = new Map(overrides.map((o) => [o.id, o]));
  return base.map((layer) => {
    const patch = byId.get(layer.id);
    if (!patch) {
      return layer;
    }
    return {
      ...layer,
      ...patch,
      sourceText: patch.sourceText || layer.sourceText,
      translatedText: patch.translatedText || patch.sourceText || layer.translatedText,
      typography: patch.typography ?? layer.typography,
      fit: patch.fit ?? layer.fit,
    };
  });
}
