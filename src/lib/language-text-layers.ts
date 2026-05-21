/**
 * Build language-export text layers from project locked / baked text.
 */

import { randomUUID } from "node:crypto";
import { parseBakedTextBlockRecords } from "@/lib/baked-text-detection";
import {
  createLockedTextLayer,
  parseLockedTextLayersJson,
  type LockedTextLayer,
} from "@/lib/locked-text-layer";
import type { LanguageTextLayerRecord } from "@/lib/video-language-export";

export function extractLanguageTextLayersFromProject(project: {
  instantLockedTextLayers: unknown;
  instantOutputDurationSeconds: number | null;
  images: Array<{ bakedTextBlocksJson: unknown; order: number }>;
}): LanguageTextLayerRecord[] {
  const durationMs = Math.max(3000, (project.instantOutputDurationSeconds ?? 8) * 1000);
  const locked = parseLockedTextLayersJson(project.instantLockedTextLayers);
  if (locked.length > 0) {
    return locked.map((layer) => ({
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
    }));
  }

  const sortedImages = [...project.images].sort((a, b) => a.order - b.order);
  const heroImage = sortedImages[0];
  if (!heroImage) {
    return [];
  }
  const blocks = parseBakedTextBlockRecords(heroImage.bakedTextBlocksJson).filter(
    (b) => b.kept !== false && (b.editedText || b.text).trim().length >= 2
  );
  return blocks.slice(0, 8).map((block, index) => ({
    id: block.id || `baked-${index}`,
    sourceText: (block.editedText || block.text).trim(),
    translatedText: (block.editedText || block.text).trim(),
    x: block.bbox.x + block.bbox.width / 2,
    y: block.bbox.y,
    width: block.bbox.width,
    height: block.bbox.height,
    fontSize: Math.max(18, Math.min(72, Math.round(block.suggestedFontSize ?? 36))),
    textAlign:
      block.suggestedAlign === "left" || block.suggestedAlign === "right"
        ? block.suggestedAlign
        : "center",
    animation: "none",
    startMs: 0,
    durationMs: durationMs,
  }));
}

export function languageLayersToLockedLayers(
  records: LanguageTextLayerRecord[],
  languageCode: string,
  totalDurationMs: number
): LockedTextLayer[] {
  const isRtl = languageCode === "ar";
  return records.map((record) => {
    const text = record.translatedText.trim() || record.sourceText.trim();
    const baseFont = record.fontSize ?? 42;
    const fitFont = autoFitFontSize(text, baseFont, record.width);
    const align =
      isRtl ? "right" : (record.textAlign ?? "center");
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
      color: record.color ?? "#FFFFFF",
      backgroundColor: record.backgroundColor,
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

function autoFitFontSize(text: string, base: number, widthNorm?: number): number {
  const len = text.length;
  let size = base;
  if (len > 40) {
    size = Math.round(base * 0.72);
  } else if (len > 28) {
    size = Math.round(base * 0.82);
  } else if (len > 18) {
    size = Math.round(base * 0.9);
  }
  if (widthNorm != null && widthNorm > 0 && len > 12) {
    const charsPerLine = Math.max(8, Math.floor(widthNorm * 42));
    const lines = Math.ceil(len / charsPerLine);
    if (lines > 2) {
      size = Math.round(size * (2 / lines));
    }
  }
  return Math.max(14, Math.min(96, size));
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
    };
  });
}
