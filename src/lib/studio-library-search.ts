/**
 * S.5 smart search — name / tags / metadata (pure).
 * Semantic search is future; token match is the v1 contract.
 */

export type StudioLibrarySearchableAsset = {
  id: string;
  title: string;
  description?: string;
  family: string;
  category?: string;
  tags?: string[];
  promptSummary?: string;
  language?: string;
  aspectRatio?: string;
  origin?: string;
  aiModel?: string;
  generator?: string;
  durationSeconds?: number | null;
  status?: string;
  metadataText?: string;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function tokenizeQuery(query: string): string[] {
  return normalize(query)
    .split(/[\s,;/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function haystackFor(asset: StudioLibrarySearchableAsset): string {
  const parts = [
    asset.title,
    asset.description ?? "",
    asset.family,
    asset.category ?? "",
    ...(asset.tags ?? []),
    asset.promptSummary ?? "",
    asset.language ?? "",
    asset.aspectRatio ?? "",
    asset.origin ?? "",
    asset.aiModel ?? "",
    asset.generator ?? "",
    asset.status ?? "",
    asset.metadataText ?? "",
    asset.durationSeconds != null ? `${asset.durationSeconds} seconds` : "",
    asset.durationSeconds != null ? `${Math.round(asset.durationSeconds)}s` : "",
  ];
  return normalize(parts.join(" "));
}

/**
 * Match when every query token appears somewhere in the searchable haystack.
 * Empty query → all assets pass (caller still paginates).
 */
export function assetMatchesLibraryQuery(
  asset: StudioLibrarySearchableAsset,
  query: string
): boolean {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return true;
  const hay = haystackFor(asset);
  return tokens.every((token) => hay.includes(token));
}

export function filterLibraryAssetsByQuery<T extends StudioLibrarySearchableAsset>(
  assets: T[],
  query: string
): T[] {
  if (!query.trim()) return assets;
  return assets.filter((asset) => assetMatchesLibraryQuery(asset, query));
}

export function paginateItems<T>(
  items: T[],
  options?: { offset?: number; limit?: number }
): { items: T[]; total: number; offset: number; limit: number; hasMore: boolean } {
  const total = items.length;
  const offset = Math.max(0, options?.offset ?? 0);
  const limit = Math.min(200, Math.max(1, options?.limit ?? 40));
  const slice = items.slice(offset, offset + limit);
  return {
    items: slice,
    total,
    offset,
    limit,
    hasMore: offset + slice.length < total,
  };
}
