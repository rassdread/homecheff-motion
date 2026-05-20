import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import { clamp01, type BakedTextMaskRegion } from "@/lib/baked-text-protection";

/** Padding applied around each OCR bbox before neutralization (25–40%). */
export const AGGRESSIVE_MASK_PADDING_RATIO = 0.32;

const UI_CONTAINER_BLOCK_TYPES = new Set<BakedTextBlockRecord["blockType"]>([
  "ui",
  "cta",
  "sign",
  "caption",
]);

function clampRegion(region: BakedTextMaskRegion): BakedTextMaskRegion {
  const x = clamp01(region.x);
  const y = clamp01(region.y);
  const width = Math.min(1 - x, Math.max(0.02, region.width));
  const height = Math.min(1 - y, Math.max(0.02, region.height));
  return { x, y, width, height };
}

export function expandMaskRegion(
  bbox: BakedTextMaskRegion,
  paddingRatio: number
): BakedTextMaskRegion {
  const padX = bbox.width * paddingRatio;
  const padY = bbox.height * paddingRatio;
  return clampRegion({
    x: bbox.x - padX,
    y: bbox.y - padY,
    width: bbox.width + padX * 2,
    height: bbox.height + padY * 2,
  });
}

/** Expand OCR bbox to likely UI card / phone screen / sign container. */
export function inferUiContainerMaskRegion(
  block: Pick<BakedTextBlockRecord, "bbox" | "blockType">
): BakedTextMaskRegion {
  const { bbox, blockType } = block;
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;

  let width = bbox.width;
  let height = bbox.height;

  if (blockType === "ui") {
    width = Math.max(width * 2.4, 0.44);
    height = Math.max(height * 3.2, 0.28);
  } else if (blockType === "cta") {
    width = Math.max(width * 2.1, 0.4);
    height = Math.max(height * 2.4, 0.16);
  } else if (blockType === "sign") {
    width = Math.max(width * 2.2, 0.58);
    height = Math.max(height * 2.0, 0.2);
  } else if (blockType === "caption") {
    width = Math.max(width * 1.7, 0.5);
    height = Math.max(height * 1.6, 0.12);
  } else {
    return expandMaskRegion(bbox, AGGRESSIVE_MASK_PADDING_RATIO);
  }

  return clampRegion({
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
  });
}

function regionsOverlap(a: BakedTextMaskRegion, b: BakedTextMaskRegion): boolean {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  return a.x < bx2 && ax2 > b.x && a.y < by2 && ay2 > b.y;
}

function unionRegion(a: BakedTextMaskRegion, b: BakedTextMaskRegion): BakedTextMaskRegion {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  return clampRegion({
    x,
    y,
    width: Math.max(ax2, bx2) - x,
    height: Math.max(ay2, by2) - y,
  });
}

/** Merge overlapping mask bands so Vidu never sees gaps between adjacent UI text. */
export function mergeOverlappingMaskRegions(regions: BakedTextMaskRegion[]): BakedTextMaskRegion[] {
  let merged = regions.map((r) => ({ ...r }));
  let changed = true;
  while (changed) {
    changed = false;
    const next: BakedTextMaskRegion[] = [];
    const used = new Set<number>();
    for (let i = 0; i < merged.length; i += 1) {
      if (used.has(i)) continue;
      let current = merged[i];
      used.add(i);
      for (let j = i + 1; j < merged.length; j += 1) {
        if (used.has(j)) continue;
        if (regionsOverlap(current, merged[j])) {
          current = unionRegion(current, merged[j]);
          used.add(j);
          changed = true;
        }
      }
      next.push(current);
    }
    merged = next;
  }
  return merged;
}

export function maskRegionForBlock(
  block: Pick<BakedTextBlockRecord, "bbox" | "blockType">,
  aggressive: boolean
): BakedTextMaskRegion {
  if (!aggressive) {
    return block.bbox;
  }
  if (UI_CONTAINER_BLOCK_TYPES.has(block.blockType)) {
    return inferUiContainerMaskRegion(block);
  }
  return expandMaskRegion(block.bbox, AGGRESSIVE_MASK_PADDING_RATIO);
}

export function buildViduMaskRegionsFromBlocks(
  blocks: BakedTextBlockRecord[],
  aggressive: boolean
): BakedTextMaskRegion[] {
  const regions = blocks.map((block) => maskRegionForBlock(block, aggressive));
  return aggressive ? mergeOverlappingMaskRegions(regions) : regions;
}
