/** Shared client fetch defaults for same-origin API routes (avoids cross-origin / CORS issues). */
export const SAME_ORIGIN_JSON_FETCH_INIT: RequestInit = {
  credentials: "same-origin",
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
};

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
    return { ok: res.ok, status: res.status, data, networkError: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      status: 0,
      data: { error: message } as T,
      networkError: true,
    };
  }
}
