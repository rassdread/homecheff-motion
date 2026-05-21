/**
 * Canonical persisted language text layers — source of truth for multilingual export.
 */

import { randomUUID } from "node:crypto";
import { parseBakedTextBlockRecords, type BakedTextBlockRecord } from "@/lib/baked-text-detection";
import { parseProjectDetectedTextMetadata } from "@/lib/hybrid-motion-overlay";
import { parseLockedTextLayersJson, type LockedTextLayer } from "@/lib/locked-text-layer";
import { analyzeTypographyStyleProfile } from "@/lib/typography-style-profile";
import type { LanguageTextLayerRecord } from "@/lib/video-language-export";

export const LANGUAGE_TEXT_LAYERS_VERSION = 1;
export const LANGUAGE_EXPORT_LAYER_MIN_CONFIDENCE = 0.5;
export const MAX_CANONICAL_LANGUAGE_TEXT_LAYERS = 32;

export type LanguageTextLayerSourceType =
  | "locked"
  | "ocr_baked"
  | "detected_metadata"
  | "persisted"
  | "ocr_recovery";

export type LanguageTextLayerRecoverySource =
  | "persisted"
  | "original_render"
  | "rebuild"
  | "ocr_recovery"
  | "aggregate";

export type CanonicalLanguageTextLayer = {
  id: string;
  text: string;
  normalizedText: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  fontProfile?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
  };
  alignment?: "left" | "center" | "right";
  styleProfile?: string | null;
  sourceType: LanguageTextLayerSourceType;
  confidence: number;
  locked: boolean;
  rtl?: boolean;
  animation?: string;
  startMs?: number;
  durationMs?: number;
};

export type LanguageTextLayersSnapshot = {
  version: typeof LANGUAGE_TEXT_LAYERS_VERSION;
  capturedAt: string;
  recoverySource: LanguageTextLayerRecoverySource;
  layers: CanonicalLanguageTextLayer[];
};

export type LanguageTextLayerSourceStats = {
  persistedCount: number;
  lockedCount: number;
  bakedOcrCount: number;
  detectedMetadataCount: number;
  ocrRecoveredCount: number;
  stylePreservedCount: number;
  totalExtracted: number;
  recoverySource: LanguageTextLayerRecoverySource;
};

export type LanguageTextLayerProjectInput = {
  languageTextLayersJson?: unknown;
  instantLockedTextLayers?: unknown;
  instantDetectedTextMetadata?: unknown;
  instantOutputDurationSeconds?: number | null;
  stylePreset?: string | null;
  images: Array<{
    bakedTextBlocksJson?: unknown;
    order: number;
  }>;
};

export function normalizeLanguageLayerText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function isTranslatableBakedBlock(block: BakedTextBlockRecord): boolean {
  const text = normalizeLanguageLayerText(block.editedText || block.text);
  if (text.length < 2 || block.kept === false) {
    return false;
  }
  if (block.confidence >= LANGUAGE_EXPORT_LAYER_MIN_CONFIDENCE) {
    return true;
  }
  return block.blockType !== "other";
}

function layerDedupeKey(layer: Pick<CanonicalLanguageTextLayer, "normalizedText" | "boundingBox">): string {
  const box = layer.boundingBox;
  return `${layer.normalizedText}|${Math.round(box.x * 100)}|${Math.round(box.y * 100)}|${Math.round(box.width * 100)}`;
}

export function parseLanguageTextLayersSnapshot(raw: unknown): LanguageTextLayersSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (o.version !== LANGUAGE_TEXT_LAYERS_VERSION || !Array.isArray(o.layers)) {
    return null;
  }
  const layers = (o.layers as CanonicalLanguageTextLayer[]).filter(
    (layer) =>
      typeof layer?.id === "string" &&
      typeof layer?.text === "string" &&
      layer.text.trim().length >= 2 &&
      layer.boundingBox &&
      typeof layer.boundingBox.x === "number"
  );
  if (layers.length === 0) {
    return null;
  }
  return {
    version: LANGUAGE_TEXT_LAYERS_VERSION,
    capturedAt: typeof o.capturedAt === "string" ? o.capturedAt : new Date().toISOString(),
    recoverySource:
      (o.recoverySource as LanguageTextLayerRecoverySource) ?? "persisted",
    layers,
  };
}

function lockedLayerToCanonical(
  layer: LockedTextLayer,
  stylePreset?: string | null
): CanonicalLanguageTextLayer {
  const text = normalizeLanguageLayerText(layer.text);
  return {
    id: layer.id,
    text,
    normalizedText: text.toLowerCase(),
    boundingBox: {
      x: layer.x,
      y: layer.y,
      width: layer.width ?? 0.4,
      height: layer.height ?? 0.12,
    },
    fontProfile: {
      fontSize: layer.fontSize,
      fontFamily: layer.fontFamily,
      color: layer.color,
      backgroundColor: layer.backgroundColor,
    },
    alignment: layer.textAlign ?? "center",
    styleProfile: stylePreset ?? null,
    sourceType: "locked",
    confidence: 1,
    locked: true,
    animation: layer.animation,
    startMs: layer.startMs,
    durationMs: layer.durationMs,
  };
}

function bakedBlockToCanonical(
  block: BakedTextBlockRecord,
  stylePreset?: string | null,
  durationMs?: number
): CanonicalLanguageTextLayer {
  const text = normalizeLanguageLayerText(block.editedText || block.text);
  const typography = analyzeTypographyStyleProfile({
    sourceText: text,
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
    stylePreset,
  });
  return {
    id: block.id || randomUUID(),
    text,
    normalizedText: text.toLowerCase(),
    boundingBox: {
      x: block.bbox.x + block.bbox.width / 2,
      y: block.bbox.y,
      width: block.bbox.width,
      height: block.bbox.height,
    },
    fontProfile: {
      fontSize: typography.fontSize,
      color: typography.fillColor,
      backgroundColor: typography.background?.color,
    },
    alignment: typography.textAlign,
    styleProfile: stylePreset ?? null,
    sourceType: "ocr_baked",
    confidence: block.confidence,
    locked: block.reprojectInVideo === true,
    animation: block.animation,
    startMs: 0,
    durationMs,
  };
}

function detectedBlockToCanonical(
  block: {
    id: string;
    text: string;
    editedText?: string;
    bbox: { x: number; y: number; width: number; height: number };
    confidence: number;
    alignment?: "left" | "center" | "right";
    blockType?: string;
  },
  stylePreset?: string | null,
  durationMs?: number
): CanonicalLanguageTextLayer | null {
  const text = normalizeLanguageLayerText(block.editedText || block.text);
  if (text.length < 2 || block.confidence < LANGUAGE_EXPORT_LAYER_MIN_CONFIDENCE) {
    return null;
  }
  return {
    id: block.id,
    text,
    normalizedText: text.toLowerCase(),
    boundingBox: {
      x: block.bbox.x + block.bbox.width / 2,
      y: block.bbox.y,
      width: block.bbox.width,
      height: block.bbox.height,
    },
    fontProfile: {},
    alignment: block.alignment ?? "center",
    styleProfile: stylePreset ?? null,
    sourceType: "detected_metadata",
    confidence: block.confidence,
    locked: false,
    startMs: 0,
    durationMs,
  };
}

export function aggregateCanonicalLanguageTextLayers(params: {
  project: LanguageTextLayerProjectInput;
  extraLayers?: CanonicalLanguageTextLayer[];
  recoverySource?: LanguageTextLayerRecoverySource;
}): { layers: CanonicalLanguageTextLayer[]; stats: LanguageTextLayerSourceStats } {
  const { project, extraLayers = [], recoverySource = "aggregate" } = params;
  const durationMs = Math.max(3000, (project.instantOutputDurationSeconds ?? 8) * 1000);
  const stylePreset = project.stylePreset ?? null;

  const byKey = new Map<string, CanonicalLanguageTextLayer>();
  let lockedCount = 0;
  let bakedOcrCount = 0;
  let detectedMetadataCount = 0;
  let ocrRecoveredCount = 0;

  const add = (layer: CanonicalLanguageTextLayer) => {
    const key = layerDedupeKey(layer);
    const existing = byKey.get(key);
    if (!existing || layer.confidence > existing.confidence || layer.locked) {
      byKey.set(key, layer);
    }
  };

  for (const layer of parseLockedTextLayersJson(project.instantLockedTextLayers)) {
    add(lockedLayerToCanonical(layer, stylePreset));
    lockedCount += 1;
  }

  const sortedImages = [...project.images].sort((a, b) => a.order - b.order);
  for (const image of sortedImages) {
    const blocks = parseBakedTextBlockRecords(image.bakedTextBlocksJson).filter(isTranslatableBakedBlock);
    for (const block of blocks) {
      add(bakedBlockToCanonical(block, stylePreset, durationMs));
      bakedOcrCount += 1;
    }
  }

  const detected = parseProjectDetectedTextMetadata(project.instantDetectedTextMetadata);
  if (detected) {
    for (const block of detected.blocks) {
      const canonical = detectedBlockToCanonical(
        {
          id: block.id,
          text: block.text,
          editedText: block.editedText,
          bbox: block.bbox,
          confidence: block.confidence,
          alignment: block.alignment,
          blockType: block.blockType,
        },
        stylePreset,
        durationMs
      );
      if (canonical) {
        add(canonical);
        detectedMetadataCount += 1;
      }
    }
  }

  for (const layer of extraLayers) {
    add(layer);
    if (layer.sourceType === "ocr_recovery") {
      ocrRecoveredCount += 1;
    }
  }

  const layers = [...byKey.values()]
    .sort((a, b) => {
      if (a.locked !== b.locked) {
        return a.locked ? -1 : 1;
      }
      return b.confidence - a.confidence;
    })
    .slice(0, MAX_CANONICAL_LANGUAGE_TEXT_LAYERS);

  const stylePreservedCount = layers.filter(
    (l) => l.sourceType === "locked" || l.locked || l.styleProfile != null
  ).length;

  return {
    layers,
    stats: {
      persistedCount: 0,
      lockedCount,
      bakedOcrCount,
      detectedMetadataCount,
      ocrRecoveredCount,
      stylePreservedCount,
      totalExtracted: layers.length,
      recoverySource,
    },
  };
}

export function canonicalToLanguageTextLayerRecords(
  layers: CanonicalLanguageTextLayer[],
  stylePreset?: string | null
): LanguageTextLayerRecord[] {
  return layers.map((layer) => {
    const typography = analyzeTypographyStyleProfile({
      sourceText: layer.text,
      fontSize: layer.fontProfile?.fontSize,
      color: layer.fontProfile?.color,
      backgroundColor: layer.fontProfile?.backgroundColor,
      textAlign: layer.alignment,
      x: layer.boundingBox.x,
      y: layer.boundingBox.y,
      width: layer.boundingBox.width,
      height: layer.boundingBox.height,
      stylePreset: layer.styleProfile ?? stylePreset,
    });
    return {
      id: layer.id,
      sourceText: layer.text,
      translatedText: layer.text,
      x: layer.boundingBox.x,
      y: layer.boundingBox.y,
      width: layer.boundingBox.width,
      height: layer.boundingBox.height,
      fontSize: layer.fontProfile?.fontSize ?? typography.fontSize,
      color: layer.fontProfile?.color ?? typography.fillColor,
      backgroundColor: layer.fontProfile?.backgroundColor ?? typography.background?.color,
      textAlign: layer.alignment ?? typography.textAlign,
      animation: layer.animation,
      startMs: layer.startMs,
      durationMs: layer.durationMs,
      typography,
    };
  });
}

export function buildLanguageTextLayersSnapshot(params: {
  layers: CanonicalLanguageTextLayer[];
  recoverySource: LanguageTextLayerRecoverySource;
}): LanguageTextLayersSnapshot {
  return {
    version: LANGUAGE_TEXT_LAYERS_VERSION,
    capturedAt: new Date().toISOString(),
    recoverySource: params.recoverySource,
    layers: params.layers,
  };
}

export function detectedBlocksToCanonicalLayers(
  blocks: Array<{
    id: string;
    text: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
    suggestedAlign?: "left" | "center" | "right";
    blockType?: BakedTextBlockRecord["blockType"];
  }>,
  stylePreset?: string | null,
  durationMs?: number
): CanonicalLanguageTextLayer[] {
  const out: CanonicalLanguageTextLayer[] = [];
  for (const block of blocks) {
    const record: BakedTextBlockRecord = {
      id: block.id,
      text: block.text,
      editedText: block.text,
      confidence: block.confidence,
      bbox: block.bbox,
      suggestedFontSize: 36,
      suggestedAlign: block.suggestedAlign ?? "center",
      blockType: block.blockType ?? "other",
      kept: true,
      confirmed: true,
      animation: "none",
    };
    if (!isTranslatableBakedBlock(record)) {
      continue;
    }
    out.push({
      ...bakedBlockToCanonical(record, stylePreset, durationMs),
      sourceType: "ocr_recovery",
      locked: false,
    });
  }
  return out;
}
