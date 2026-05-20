import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";

/** Minimum OCR confidence for a block to count as meaningful text. */
export const BAKED_TEXT_OCR_CONFIDENCE_THRESHOLD = 0.52;

/** Character count for “large readable” marketing copy. */
export const BAKED_TEXT_LARGE_TEXT_MIN_CHARS = 12;

/** Minimum normalized bbox area (width × height) with short text to count as a sign/label. */
export const BAKED_TEXT_LARGE_REGION_MIN_AREA = 0.012;

export function shouldPromptBakedTextReview(blocks: BakedTextBlockRecord[]): boolean {
  if (blocks.length === 0) {
    return false;
  }
  for (const block of blocks) {
    if (!block.kept) {
      continue;
    }
    if (block.blockType === "ui") {
      return true;
    }
    if (block.confidence >= BAKED_TEXT_OCR_CONFIDENCE_THRESHOLD) {
      return true;
    }
    const text = (block.editedText || block.text).trim();
    if (text.length >= BAKED_TEXT_LARGE_TEXT_MIN_CHARS) {
      return true;
    }
    const area = block.bbox.width * block.bbox.height;
    if (area >= BAKED_TEXT_LARGE_REGION_MIN_AREA && text.length >= 4) {
      return true;
    }
  }
  return false;
}

export async function hashImageBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
