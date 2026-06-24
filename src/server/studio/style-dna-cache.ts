import { createHash } from "node:crypto";
import type { ExtractAssetVisionResult } from "@/server/studio/extract-asset-style-dna";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

const cacheByImageKey = new Map<string, ExtractAssetVisionResult>();

export function buildStyleDnaCacheKey(imageUrl: string, sourceKind: StudioAssetKind): string {
  const normalized = imageUrl.trim();
  return createHash("sha256").update(`${sourceKind}::${normalized}`).digest("hex");
}

export function readStyleDnaCache(
  imageUrl: string,
  sourceKind: StudioAssetKind
): ExtractAssetVisionResult | null {
  const key = buildStyleDnaCacheKey(imageUrl, sourceKind);
  return cacheByImageKey.get(key) ?? null;
}

export function writeStyleDnaCache(
  imageUrl: string,
  sourceKind: StudioAssetKind,
  data: ExtractAssetVisionResult
): void {
  const key = buildStyleDnaCacheKey(imageUrl, sourceKind);
  cacheByImageKey.set(key, data);
}

/** Test helper — clear in-memory cache between cases. */
export function clearStyleDnaCacheForTests(): void {
  cacheByImageKey.clear();
}
