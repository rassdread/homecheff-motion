/**
 * Hard text lock — freeze large readable typography during Vidu motion (prompt + optional patch restore).
 */

import type { BakedTextBlockRecord, BakedTextProtectionPayload } from "@/lib/baked-text-detection";
import { parseBakedTextBlockRecords } from "@/lib/baked-text-detection";
import type { BakedTextMaskRegion } from "@/lib/baked-text-protection";
import { bboxToPolygon } from "@/lib/hybrid-motion-overlay";
import type { AnimationStyleId } from "@/lib/animation-style-types";
import { capHeroReprojectBlocks } from "@/lib/instant-text-hero-overlay";
import { TEXT_DENSE_MIN_BLOCKS, activeKeptBlocks } from "@/lib/instant-text-hero-overlay";

export type TextLockMode = "auto_hard_lock" | "prompt_only" | "off";

export type LockedTextRegion = {
  id: string;
  bbox: BakedTextMaskRegion;
  polygon: { x: number; y: number }[];
  confidence: number;
  blockType: BakedTextBlockRecord["blockType"];
  textPreview: string;
};

export const LOCKED_TEXT_MIN_CONFIDENCE = 0.72;
export const LOCKED_TEXT_MIN_AREA = 0.012;
/** Max patches restored per segment — prevents overlay spam. */
export const MAX_LOCKED_TEXT_REGIONS = 3;

/** Same set as Premium Comic-Strip Engine full merge styles. */
export const AUTO_HARD_LOCK_STYLE_IDS: readonly AnimationStyleId[] = [
  "cartoon_animation",
  "character_animation",
  "marketplace_story",
  "fast_social_animation",
];

const AUTO_HARD_LOCK_STYLES: ReadonlySet<AnimationStyleId> = new Set(AUTO_HARD_LOCK_STYLE_IDS);

export function normalizeTextLockMode(raw: unknown): TextLockMode | undefined {
  if (raw === "auto_hard_lock" || raw === "prompt_only" || raw === "off") {
    return raw;
  }
  return undefined;
}

export function defaultTextLockMode(animationStyleId: AnimationStyleId): TextLockMode {
  return AUTO_HARD_LOCK_STYLES.has(animationStyleId) ? "auto_hard_lock" : "prompt_only";
}

export function resolveTextLockMode(
  animationStyleId: AnimationStyleId,
  override?: TextLockMode | null
): TextLockMode {
  if (override === "off" || override === "prompt_only" || override === "auto_hard_lock") {
    return override;
  }
  return defaultTextLockMode(animationStyleId);
}

export function shouldApplySegmentTextRestore(mode: TextLockMode): boolean {
  return mode === "auto_hard_lock";
}

export function isImportantTextBlock(block: BakedTextBlockRecord): boolean {
  if (block.kept === false || !block.confirmed) {
    return false;
  }
  if (block.confidence < LOCKED_TEXT_MIN_CONFIDENCE) {
    return false;
  }
  const area = block.bbox.width * block.bbox.height;
  if (block.blockType === "other" && area < LOCKED_TEXT_MIN_AREA) {
    return false;
  }
  return block.blockType === "ui" || block.blockType === "cta" || block.blockType === "sign" || block.blockType === "caption" || block.blockType === "other";
}

export function isLargeReadableTextBlock(block: BakedTextBlockRecord): boolean {
  const text = (block.editedText || block.text).trim();
  if (text.length < 2) {
    return false;
  }
  const area = block.bbox.width * block.bbox.height;
  return area >= 0.02 || block.blockType !== "other" || text.length >= 8;
}

export function buildLockedTextRegionsFromBlocks(
  blocks: BakedTextBlockRecord[],
  mode: TextLockMode
): LockedTextRegion[] {
  if (mode === "off") {
    return [];
  }
  const candidates = blocks
    .filter((b) => isImportantTextBlock(b) && isLargeReadableTextBlock(b))
    .sort((a, b) => b.bbox.width * b.bbox.height - a.bbox.width * a.bbox.height);

  const regions: LockedTextRegion[] = [];
  for (const block of candidates) {
    if (regions.length >= MAX_LOCKED_TEXT_REGIONS) {
      break;
    }
    const textPreview = (block.editedText || block.text).trim().slice(0, 48);
    regions.push({
      id: block.id,
      bbox: block.bbox,
      polygon: bboxToPolygon(block.bbox),
      confidence: block.confidence,
      blockType: block.blockType,
      textPreview,
    });
  }
  return regions;
}

export function blocksFromImageProtection(
  protection: BakedTextProtectionPayload | null,
  bakedTextBlocksJson: unknown
): BakedTextBlockRecord[] {
  const fromJson = parseBakedTextBlockRecords(bakedTextBlocksJson);
  if (fromJson.length > 0) {
    return fromJson;
  }
  return protection?.blocks ?? [];
}

export function applyAutoHardLockReprojectFlags(
  blocks: BakedTextBlockRecord[],
  mode: TextLockMode
): BakedTextBlockRecord[] {
  if (mode !== "auto_hard_lock") {
    return blocks;
  }
  const lockedIds = new Set(buildLockedTextRegionsFromBlocks(blocks, mode).map((r) => r.id));
  return blocks.map((b) => ({
    ...b,
    reprojectInVideo: lockedIds.has(b.id) ? true : b.reprojectInVideo,
  }));
}

export function normalizeBlocksWithTextLock(
  blocks: BakedTextBlockRecord[],
  mode: TextLockMode
): BakedTextBlockRecord[] {
  const flagged = applyAutoHardLockReprojectFlags(blocks, mode);
  return capHeroReprojectBlocks(flagged);
}

export function isTextHeavyImage(blocks: BakedTextBlockRecord[]): boolean {
  return activeKeptBlocks(blocks).length >= TEXT_DENSE_MIN_BLOCKS;
}

/** Large hero headline / sign copy visible on poster (cartoon safety). */
export function hasVisibleHeroHeadline(blocks: BakedTextBlockRecord[]): boolean {
  return blocks.some(
    (b) =>
      b.kept !== false &&
      (b.editedText || b.text).trim().length >= 4 &&
      (b.blockType === "sign" || b.blockType === "ui" || b.blockType === "cta") &&
      b.bbox.height >= 0.05 &&
      b.bbox.width * b.bbox.height >= 0.02
  );
}

export function imageNeedsTextLockWarning(
  blocks: BakedTextBlockRecord[],
  mode: TextLockMode,
  lockedCount: number
): boolean {
  if (mode !== "auto_hard_lock" || lockedCount > 0) {
    return false;
  }
  const visibleCopy = blocks.filter(
    (b) =>
      b.kept !== false &&
      (b.editedText || b.text).trim().length >= 4 &&
      (b.blockType === "ui" ||
        b.blockType === "cta" ||
        b.blockType === "sign" ||
        b.blockType === "caption" ||
        b.bbox.height >= 0.04)
  );
  if (visibleCopy.length === 0) {
    return false;
  }
  const lockedIds = new Set(buildLockedTextRegionsFromBlocks(blocks, mode).map((r) => r.id));
  return visibleCopy.some((b) => !lockedIds.has(b.id));
}

/** One compact Vidu line (priority 1) — no long block. */
export function buildHardTextLockPromptLine(mode: TextLockMode, lockedCount: number): string {
  if (mode === "off") {
    return "";
  }
  if (mode === "auto_hard_lock") {
    const scope =
      lockedCount > 0 ?
        `${lockedCount} zones`
      : "headlines, CTA, UI, logos, and speech bubbles";
    return `LOCKED_TEXT_REGIONS: ${scope} frozen — never animate, morph, or reinterpret typography in locked areas.`;
  }
  return "Preserve all on-screen text and logos exactly as in the frame — static typography only.";
}
