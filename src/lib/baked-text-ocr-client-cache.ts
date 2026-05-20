import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";

type CachedOcrEntry = {
  blocks: BakedTextBlockRecord[];
};

const ocrByContentHash = new Map<string, CachedOcrEntry>();

export function getCachedBakedTextOcr(contentHash: string): BakedTextBlockRecord[] | null {
  const entry = ocrByContentHash.get(contentHash);
  return entry ? entry.blocks.map((b) => ({ ...b })) : null;
}

export function setCachedBakedTextOcr(contentHash: string, blocks: BakedTextBlockRecord[]): void {
  ocrByContentHash.set(contentHash, {
    blocks: blocks.map((b) => ({ ...b })),
  });
}

export function clearBakedTextOcrCache(): void {
  ocrByContentHash.clear();
}
