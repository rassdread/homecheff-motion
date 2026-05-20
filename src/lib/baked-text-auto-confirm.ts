import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";

/** All kept blocks must meet this confidence for auto-confirm. */
export const BAKED_TEXT_AUTO_CONFIRM_MIN_CONFIDENCE = 0.8;

export function isAutoConfirmBakedTextEnabledFromEnv(
  value: string | undefined = process.env.AUTO_CONFIRM_BAKED_TEXT
): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export function isSuspiciousBakedTextBlock(block: BakedTextBlockRecord): boolean {
  const text = (block.editedText || block.text).trim();
  if (!text) {
    return true;
  }
  if (!Number.isFinite(block.confidence)) {
    return true;
  }
  if (block.confidence < BAKED_TEXT_AUTO_CONFIRM_MIN_CONFIDENCE) {
    return true;
  }
  return false;
}

/** True when every kept block is high-confidence and readable (no manual review required). */
export function canAutoConfirmBakedTextBlocks(blocks: BakedTextBlockRecord[]): boolean {
  const active = blocks.filter((b) => b.kept !== false);
  if (active.length === 0) {
    return false;
  }
  for (const block of active) {
    if (isSuspiciousBakedTextBlock(block)) {
      return false;
    }
  }
  return true;
}

/** Marks blocks confirmed using exact OCR `text` (not user-edited copy). */
export function applyAutoConfirmToBlocks(blocks: BakedTextBlockRecord[]): BakedTextBlockRecord[] {
  return blocks.map((block) => ({
    ...block,
    kept: true,
    confirmed: true,
    editedText: block.text.trim(),
  }));
}

export function resolveAutoConfirmBakedTextBlocks(
  blocks: BakedTextBlockRecord[],
  autoConfirmEnabled: boolean
): { blocks: BakedTextBlockRecord[]; autoConfirmed: boolean } {
  if (!autoConfirmEnabled || !canAutoConfirmBakedTextBlocks(blocks)) {
    return { blocks, autoConfirmed: false };
  }
  return {
    blocks: applyAutoConfirmToBlocks(blocks),
    autoConfirmed: true,
  };
}
