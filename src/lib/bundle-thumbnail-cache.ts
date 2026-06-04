/**
 * Motion V22.3 — in-memory thumbnail URLs per catalog selection key.
 * Survives version toggles within a gallery session (browser may also cache images).
 */

const cache = new Map<string, string>();

export function rememberBundleThumbnail(selectionKey: string, url: string): void {
  const trimmed = url.trim();
  if (!trimmed) {
    return;
  }
  cache.set(selectionKey, trimmed);
}

export function getRememberedBundleThumbnail(selectionKey: string): string | undefined {
  return cache.get(selectionKey);
}

export function resolveBundleDisplayThumbnail(params: {
  selectionKey: string;
  thumbnailUrl: string | null;
  fallbackBundleThumbnail: string | null;
}): string | null {
  const direct = params.thumbnailUrl?.trim();
  if (direct) {
    rememberBundleThumbnail(params.selectionKey, direct);
    return direct;
  }
  return (
    getRememberedBundleThumbnail(params.selectionKey) ??
    params.fallbackBundleThumbnail?.trim() ??
    null
  );
}
