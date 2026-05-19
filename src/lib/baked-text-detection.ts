import { randomUUID } from "node:crypto";
import type { LockedTextAnimation, LockedTextAlign, LockedTextLanguage } from "@/lib/locked-text-layer";
import { isLockedTextAnimation } from "@/lib/locked-text-layer";
import { clamp01, type BakedTextMaskRegion } from "@/lib/baked-text-protection";

export type DetectedTextBlock = {
  id: string;
  text: string;
  confidence: number;
  bbox: BakedTextMaskRegion;
  suggestedFontSize: number;
  suggestedAlign: LockedTextAlign;
  language?: LockedTextLanguage;
  blockType: "ui" | "caption" | "cta" | "sign" | "other";
};

/** Client/server payload for a user-reviewed OCR block. */
export type BakedTextBlockRecord = {
  id: string;
  text: string;
  editedText: string;
  confidence: number;
  bbox: BakedTextMaskRegion;
  suggestedFontSize: number;
  suggestedAlign: LockedTextAlign;
  language?: LockedTextLanguage;
  blockType: DetectedTextBlock["blockType"];
  kept: boolean;
  confirmed: boolean;
  animation: LockedTextAnimation;
};

export type BakedTextProtectionPayload = {
  enabled: boolean;
  status?: "none" | "detected" | "confirmed" | "masked" | "skipped";
  /** Legacy single-band mode */
  exactText?: string;
  positionY?: number;
  maskRegion?: BakedTextMaskRegion;
  blocks?: BakedTextBlockRecord[];
};

export function defaultAnimationForTextBlock(block: Pick<DetectedTextBlock, "text" | "bbox" | "blockType">): LockedTextAnimation {
  if (block.blockType === "ui") {
    return "none";
  }
  if (block.blockType === "cta" || block.blockType === "caption") {
    return "fade-in";
  }
  const compact = block.bbox.height < 0.07 && block.text.length < 28;
  if (compact) {
    return "none";
  }
  if (block.bbox.y > 0.72) {
    return "fade-in";
  }
  return "fade-in";
}

export function inferBlockType(text: string, bbox: BakedTextMaskRegion): DetectedTextBlock["blockType"] {
  const t = text.trim().toLowerCase();
  if (/^(ok|cancel|back|next|menu|settings|home|\d{1,2}:\d{2})/i.test(t) || t.length < 12) {
    return "ui";
  }
  if (/(€|\$|buy|shop|order|tap|click|swipe|download)/i.test(t)) {
    return "cta";
  }
  if (bbox.y > 0.75 && text.length < 80) {
    return "caption";
  }
  if (text.length > 40 && bbox.height < 0.12) {
    return "sign";
  }
  return "other";
}

export function suggestFontSizeForBbox(bbox: BakedTextMaskRegion, imageHeight = 1280): number {
  const px = Math.max(12, Math.round(bbox.height * imageHeight * 0.72));
  return Math.min(72, Math.max(18, px));
}

export function suggestAlignForBbox(bbox: BakedTextMaskRegion): LockedTextAlign {
  if (bbox.x < 0.2 && bbox.width < 0.45) {
    return "left";
  }
  if (bbox.x + bbox.width > 0.85 && bbox.width < 0.45) {
    return "right";
  }
  return "center";
}

export function normalizeBbox(raw: {
  x: number;
  y: number;
  width: number;
  height: number;
}): BakedTextMaskRegion {
  const width = Math.min(1, Math.max(0.02, raw.width));
  const height = Math.min(1, Math.max(0.02, raw.height));
  return {
    x: clamp01(raw.x),
    y: clamp01(raw.y),
    width,
    height,
  };
}

export function bboxFromVertices(
  vertices: Array<{ x: number; y: number }>,
  imageWidth: number,
  imageHeight: number
): BakedTextMaskRegion | null {
  if (vertices.length === 0 || imageWidth <= 0 || imageHeight <= 0) {
    return null;
  }
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padX = (maxX - minX) * 0.06;
  const padY = (maxY - minY) * 0.12;
  return normalizeBbox({
    x: (minX - padX) / imageWidth,
    y: (minY - padY) / imageHeight,
    width: (maxX - minX + padX * 2) / imageWidth,
    height: (maxY - minY + padY * 2) / imageHeight,
  });
}

export function detectedBlockToRecord(block: DetectedTextBlock): BakedTextBlockRecord {
  return {
    id: block.id,
    text: block.text,
    editedText: block.text,
    confidence: block.confidence,
    bbox: block.bbox,
    suggestedFontSize: block.suggestedFontSize,
    suggestedAlign: block.suggestedAlign,
    language: block.language,
    blockType: block.blockType,
    kept: true,
    confirmed: false,
    animation: defaultAnimationForTextBlock(block),
  };
}

export function parseBakedTextBlockRecord(value: unknown): BakedTextBlockRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const o = value as Record<string, unknown>;
  const bboxRaw = o.bbox;
  if (!bboxRaw || typeof bboxRaw !== "object") {
    return null;
  }
  const b = bboxRaw as Record<string, unknown>;
  if (
    typeof b.x !== "number" ||
    typeof b.y !== "number" ||
    typeof b.width !== "number" ||
    typeof b.height !== "number"
  ) {
    return null;
  }
  const text = typeof o.text === "string" ? o.text : "";
  const editedText = typeof o.editedText === "string" ? o.editedText : text;
  if (!editedText.trim() && !text.trim()) {
    return null;
  }
  const animation =
    typeof o.animation === "string" && isLockedTextAnimation(o.animation) ? o.animation : "fade-in";
  return {
    id: typeof o.id === "string" && o.id.trim() ? o.id.trim() : randomUUID(),
    text,
    editedText,
    confidence: typeof o.confidence === "number" ? o.confidence : 0.5,
    bbox: normalizeBbox({ x: b.x, y: b.y, width: b.width, height: b.height }),
    suggestedFontSize: typeof o.suggestedFontSize === "number" ? o.suggestedFontSize : 32,
    suggestedAlign:
      o.suggestedAlign === "left" || o.suggestedAlign === "right" || o.suggestedAlign === "center"
        ? o.suggestedAlign
        : "center",
    language:
      o.language === "nl" || o.language === "en" || o.language === "sr" || o.language === "auto"
        ? o.language
        : "auto",
    blockType:
      o.blockType === "ui" ||
      o.blockType === "caption" ||
      o.blockType === "cta" ||
      o.blockType === "sign" ||
      o.blockType === "other"
        ? o.blockType
        : "other",
    kept: o.kept !== false,
    confirmed: o.confirmed === true,
    animation,
  };
}

export function parseBakedTextBlockRecords(value: unknown): BakedTextBlockRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: BakedTextBlockRecord[] = [];
  for (const item of value) {
    const parsed = parseBakedTextBlockRecord(item);
    if (parsed) {
      out.push(parsed);
    }
  }
  return out;
}

export function confirmedBlocks(records: BakedTextBlockRecord[]): BakedTextBlockRecord[] {
  return records.filter((b) => b.kept && b.confirmed && b.editedText.trim().length > 0);
}

export function layerAnchorFromBbox(bbox: BakedTextMaskRegion): { x: number; y: number } {
  return {
    x: clamp01(bbox.x + bbox.width / 2),
    y: clamp01(bbox.y),
  };
}

export function parseBakedTextProtectionPayload(value: unknown): BakedTextProtectionPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const o = value as Record<string, unknown>;
  if (o.enabled !== true) {
    return { enabled: false, status: "none" };
  }
  const blocks = parseBakedTextBlockRecords(o.blocks);
  return {
    enabled: true,
    status:
      o.status === "detected" ||
      o.status === "confirmed" ||
      o.status === "masked" ||
      o.status === "skipped"
        ? o.status
        : blocks.some((b) => b.confirmed)
          ? "confirmed"
          : blocks.length > 0
            ? "detected"
            : "none",
    exactText: typeof o.exactText === "string" ? o.exactText : undefined,
    positionY: typeof o.positionY === "number" ? o.positionY : undefined,
    blocks,
  };
}
