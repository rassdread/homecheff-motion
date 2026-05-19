import { createLockedTextLayer, type LockedTextLayer } from "@/lib/locked-text-layer";
import { confirmedBlocks, layerAnchorFromBbox, type BakedTextBlockRecord } from "@/lib/baked-text-detection";

export function lockedLayersFromBakedTextBlocks(
  blocks: BakedTextBlockRecord[],
  totalDurationMs: number
): LockedTextLayer[] {
  const active = confirmedBlocks(blocks);
  return active.map((block) => {
    const anchor = layerAnchorFromBbox(block.bbox);
    const text = block.editedText;
    return createLockedTextLayer({
      text,
      language: block.language,
      x: anchor.x,
      y: anchor.y,
      width: block.bbox.width,
      fontSize: block.suggestedFontSize,
      textAlign: block.suggestedAlign,
      animation: block.animation,
      startMs: 0,
      durationMs: Math.min(totalDurationMs, Math.max(2000, totalDurationMs)),
    });
  });
}
