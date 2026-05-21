/**
 * Build language-export text layers from project locked / baked text.
 */

import {
  aggregateCanonicalLanguageTextLayers,
  canonicalToLanguageTextLayerRecords,
  parseLanguageTextLayersSnapshot,
  type LanguageTextLayerProjectInput,
  type LanguageTextLayerSourceStats,
} from "@/lib/canonical-language-text-layers";
import {
  createLockedTextLayer,
  type LockedTextLayer,
} from "@/lib/locked-text-layer";
import { analyzeTypographyStyleProfile } from "@/lib/typography-style-profile";
import { smartFitTypographyText } from "@/lib/typography-smart-fit";
import type { LanguageTextLayerRecord } from "@/lib/video-language-export";
import type { TypographyRenderQuality } from "@/lib/typography-style-profile";
import { resolveInstantVideoDimensions } from "@/lib/locked-text-layer";

export type ExtractLanguageTextLayersResult = {
  layers: LanguageTextLayerRecord[];
  stats: LanguageTextLayerSourceStats;
};

export function extractLanguageTextLayersFromProject(
  project: LanguageTextLayerProjectInput
): LanguageTextLayerRecord[] {
  return extractLanguageTextLayersWithStats(project).layers;
}

export function extractLanguageTextLayersWithStats(
  project: LanguageTextLayerProjectInput
): ExtractLanguageTextLayersResult {
  const persisted = parseLanguageTextLayersSnapshot(project.languageTextLayersJson);
  if (persisted && persisted.layers.length > 0) {
    const layers = canonicalToLanguageTextLayerRecords(
      persisted.layers,
      project.stylePreset
    );
    const lockedCount = persisted.layers.filter((l) => l.sourceType === "locked" || l.locked).length;
    const ocrRecoveredCount = persisted.layers.filter((l) => l.sourceType === "ocr_recovery").length;
    const bakedOcrCount = persisted.layers.filter((l) => l.sourceType === "ocr_baked").length;
    const detectedMetadataCount = persisted.layers.filter(
      (l) => l.sourceType === "detected_metadata"
    ).length;
    return {
      layers,
      stats: {
        persistedCount: persisted.layers.length,
        lockedCount,
        bakedOcrCount,
        detectedMetadataCount,
        ocrRecoveredCount,
        stylePreservedCount: persisted.layers.filter((l) => l.styleProfile != null || l.locked).length,
        totalExtracted: layers.length,
        recoverySource: persisted.recoverySource,
      },
    };
  }

  const { layers: canonical, stats } = aggregateCanonicalLanguageTextLayers({
    project,
    recoverySource: "aggregate",
  });
  return {
    layers: canonicalToLanguageTextLayerRecords(canonical, project.stylePreset),
    stats,
  };
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
