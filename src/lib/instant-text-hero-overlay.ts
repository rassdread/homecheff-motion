import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import { confirmedBlocks } from "@/lib/baked-text-detection";

/** Max OCR hero texts reprojected per image in the final video. */
export const MAX_HERO_OVERLAYS_PER_IMAGE = 3;

/** At or above this count of kept blocks, image is treated as text-dense (no auto reproject). */
export const TEXT_DENSE_MIN_BLOCKS = 4;

export type OcrTextDensity = "sparse" | "text_dense";

export function classifyOcrTextDensity(activeBlockCount: number): OcrTextDensity {
  return activeBlockCount >= TEXT_DENSE_MIN_BLOCKS ? "text_dense" : "sparse";
}

export function activeKeptBlocks(blocks: BakedTextBlockRecord[]): BakedTextBlockRecord[] {
  return blocks.filter((b) => b.kept !== false);
}

export function isSingleClearHeadline(blocks: BakedTextBlockRecord[]): boolean {
  const active = activeKeptBlocks(blocks);
  if (active.length !== 1) {
    return false;
  }
  const block = active[0];
  const text = block.editedText.trim();
  return (
    block.confidence >= 0.8 &&
    text.length >= 2 &&
    text.length <= 80 &&
    block.bbox.height >= 0.04 &&
    block.bbox.height <= 0.35
  );
}

/** Blocks the user explicitly chose to place back in the final video. */
export function heroBlocksForReprojection(blocks: BakedTextBlockRecord[]): BakedTextBlockRecord[] {
  return confirmedBlocks(blocks).filter((b) => b.reprojectInVideo === true);
}

export function applyDefaultReprojectInVideo(blocks: BakedTextBlockRecord[]): BakedTextBlockRecord[] {
  const active = activeKeptBlocks(blocks);
  const density = classifyOcrTextDensity(active.length);

  if (density === "text_dense") {
    return blocks.map((b) => ({ ...b, reprojectInVideo: false }));
  }

  if (isSingleClearHeadline(blocks)) {
    const headlineId = active[0].id;
    return blocks.map((b) => ({
      ...b,
      reprojectInVideo: b.id === headlineId,
    }));
  }

  return blocks.map((b) => ({ ...b, reprojectInVideo: false }));
}

export function capHeroReprojectBlocks(
  blocks: BakedTextBlockRecord[],
  max = MAX_HERO_OVERLAYS_PER_IMAGE
): BakedTextBlockRecord[] {
  const heroes = heroBlocksForReprojection(blocks);
  if (heroes.length <= max) {
    return blocks;
  }
  const keepIds = new Set(heroes.slice(0, max).map((b) => b.id));
  return blocks.map((b) => ({
    ...b,
    reprojectInVideo: b.reprojectInVideo === true && keepIds.has(b.id),
  }));
}

export function normalizeHeroReprojectBlocks(blocks: BakedTextBlockRecord[]): BakedTextBlockRecord[] {
  return capHeroReprojectBlocks(applyDefaultReprojectInVideo(blocks));
}

export function countHeroReprojectBlocks(blocks: BakedTextBlockRecord[]): number {
  return heroBlocksForReprojection(blocks).length;
}

export function canEnableHeroReproject(
  blocks: BakedTextBlockRecord[],
  blockId: string,
  max = MAX_HERO_OVERLAYS_PER_IMAGE
): boolean {
  const block = blocks.find((b) => b.id === blockId);
  if (!block || block.reprojectInVideo === true) {
    return true;
  }
  return countHeroReprojectBlocks(blocks) < max;
}

export function usesAutomaticOcrReprojection(textRenderMode: string): boolean {
  return textRenderMode === "hybrid_overlay" || textRenderMode === "exact_freeze";
}
