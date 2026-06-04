/**
 * Shared client fetch defaults for same-origin API routes.
 * `include` sends session cookies reliably in Safari and on schemeful-same-site subdomains.
 */
export const SAME_ORIGIN_JSON_FETCH_INIT: RequestInit = {
  credentials: "include",
  cache: "no-store",
  headers: { Accept: "application/json" },
};

/** Relative API path only — never pass an absolute cross-origin URL. */
export function sameOriginApiPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) {
    throw new Error(`API path must be relative, got: ${path}`);
  }
  if (/^https?:\/\//i.test(trimmed)) {
    throw new Error(`API path must not be absolute: ${path}`);
  }
  return trimmed;
}

export type SameOriginJsonResult<T> = {
  ok: boolean;
  status: number;
  data: T;
  networkError: boolean;
  aborted?: boolean;
  accessControl?: boolean;
};

export function isAbortLikeError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /\babort(ed)?\b/i.test(message);
}

/** Safari/WebKit often labels CORS, offline, and TLS failures as "access control checks". */
export function isAccessControlLikeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /access control checks/i.test(message) || /Failed to fetch/i.test(message);
}

export async function fetchSameOriginJson<T>(
  path: string,
  init?: RequestInit
): Promise<SameOriginJsonResult<T>> {
  const url = sameOriginApiPath(path);
  try {
    const res = await fetch(url, {
      ...SAME_ORIGIN_JSON_FETCH_INIT,
      ...init,
      headers: {
        ...(SAME_ORIGIN_JSON_FETCH_INIT.headers as Record<string, string>),
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
    const data = (await res.json().catch(() => ({}))) as T;
    return { ok: res.ok, status: res.status, data, networkError: false, aborted: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const aborted = isAbortLikeError(error);
    const accessControl = isAccessControlLikeError(error);
    const hint = accessControl
      ? "Network or CORS blocked this request. Stay on the same site you logged in on and retry."
      : message;
    return {
      ok: false,
      status: 0,
      data: { error: hint } as T,
      networkError: true,
      aborted,
      accessControl,
    };
  }
}
