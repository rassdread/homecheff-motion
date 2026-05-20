import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";

type CachedOcrEntry = {
  blocks: BakedTextBlockRecord[];
  autoConfirmed: boolean;
  provider?: string;
};

const ocrByContentHash = new Map<string, CachedOcrEntry>();

export function getCachedBakedTextOcr(
  contentHash: string
): { blocks: BakedTextBlockRecord[]; autoConfirmed: boolean; provider?: string } | null {
  const entry = ocrByContentHash.get(contentHash);
  if (!entry) {
    return null;
  }
  return {
    blocks: entry.blocks.map((b) => ({ ...b })),
    autoConfirmed: entry.autoConfirmed,
    provider: entry.provider,
  };
}

export function setCachedBakedTextOcr(
  contentHash: string,
  blocks: BakedTextBlockRecord[],
  autoConfirmed: boolean,
  provider?: string
): void {
  ocrByContentHash.set(contentHash, {
    blocks: blocks.map((b) => ({ ...b })),
    autoConfirmed,
    provider,
  });
}

export function clearBakedTextOcrCache(): void {
  ocrByContentHash.clear();
}
