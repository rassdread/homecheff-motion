const RETURN_KEYS = ["section", "scene", "character", "workflow"] as const;

/**
 * Only an internal film-project path may be used as a return destination.
 * Query keys are limited to the workspace selection. Anything else is dropped.
 */
export function safeStudioProjectReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith("/studio/projects/")) return null;
  if (path.startsWith("//") || path.includes("://") || path.includes("\\") || path.includes("@") || path.includes("#")) {
    return null;
  }
  const queryIndex = path.indexOf("?");
  const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : path.slice(queryIndex + 1);
  if (!/^\/studio\/projects\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(pathname)) return null;
  if (!query) return pathname;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(query);
  } catch {
    return null;
  }
  for (const key of params.keys()) {
    if (!RETURN_KEYS.includes(key as (typeof RETURN_KEYS)[number])) return null;
  }
  const next = new URLSearchParams();
  for (const key of RETURN_KEYS) {
    const item = params.get(key);
    if (item && /^[A-Za-z0-9_-]{1,80}$/.test(item)) next.set(key, item);
  }
  const built = next.toString();
  return built ? `${pathname}?${built}` : pathname;
}
