import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";

type CachedOcrEntry = {
  blocks: BakedTextBlockRecord[];
  autoConfirmed: boolean;
};

const ocrByContentHash = new Map<string, CachedOcrEntry>();

export function getCachedBakedTextOcr(
  contentHash: string
): { blocks: BakedTextBlockRecord[]; autoConfirmed: boolean } | null {
  const entry = ocrByContentHash.get(contentHash);
  if (!entry) {
    return null;
  }
  return {
    blocks: entry.blocks.map((b) => ({ ...b })),
    autoConfirmed: entry.autoConfirmed,
  };
}

export function setCachedBakedTextOcr(
  contentHash: string,
  blocks: BakedTextBlockRecord[],
  autoConfirmed: boolean
): void {
  ocrByContentHash.set(contentHash, {
    blocks: blocks.map((b) => ({ ...b })),
    autoConfirmed,
  });
}

export function clearBakedTextOcrCache(): void {
  ocrByContentHash.clear();
}
