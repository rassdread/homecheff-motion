/**
 * First-party Studio acquisition UTMs — essential attribution (same class as affiliate cookies).
 * Survives landing → login/register → checkout via sessionStorage + host cookie.
 * Keep SEPARATE from hc_studio_aff_ref (affiliate).
 * Analytics emission may still be gated; cookie persistence is always allowed.
 */

export const STUDIO_UTM_COOKIE = "hc_studio_utm_v1";
export const STUDIO_UTM_STORAGE_KEY = "hc_studio_utm_v1";
export const STUDIO_UTM_TTL_DAYS = 30;

/** Stripe metadata value max is 500; keep attribution fields shorter. */
const STRIPE_META_MAX = 120;

export type StudioUtmCapture = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_path?: string;
  captured_at: string;
};

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

function cookieSecure(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

export function scrubUtmValue(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const t = value.trim().slice(0, 120);
  if (!t) return undefined;
  if (/[<>\"'`\\]/.test(t)) return undefined;
  return t;
}

export function readUtmFromSearchParams(
  params: URLSearchParams,
  landingPath?: string,
): StudioUtmCapture | null {
  const out: StudioUtmCapture = { captured_at: new Date().toISOString() };
  let hit = false;
  for (const key of UTM_KEYS) {
    const v = scrubUtmValue(params.get(key));
    if (v) {
      out[key] = v;
      hit = true;
    }
  }
  if (!hit) return null;
  const path = scrubUtmValue(landingPath);
  if (path) out.landing_path = path;
  return out;
}

export function persistStudioUtm(capture: StudioUtmCapture): void {
  if (typeof window === "undefined") return;
  try {
    const json = JSON.stringify(capture);
    window.sessionStorage.setItem(STUDIO_UTM_STORAGE_KEY, json);
    const maxAge = STUDIO_UTM_TTL_DAYS * 24 * 60 * 60;
    document.cookie = `${STUDIO_UTM_COOKIE}=${encodeURIComponent(json)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${
      cookieSecure() ? "; Secure" : ""
    }`;
  } catch {
    /* ignore */
  }
}

export function parseStudioUtmCookieValue(raw: string | null | undefined): StudioUtmCapture | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as StudioUtmCapture;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.captured_at !== "string") return null;
    return parsed;
  } catch {
    try {
      const parsed = JSON.parse(raw) as StudioUtmCapture;
      if (!parsed || typeof parsed !== "object") return null;
      if (typeof parsed.captured_at !== "string") return null;
      return parsed;
    } catch {
      return null;
    }
  }
}

export function readPersistedStudioUtm(): StudioUtmCapture | null {
  if (typeof window === "undefined") return null;
  try {
    const fromSession = window.sessionStorage.getItem(STUDIO_UTM_STORAGE_KEY);
    if (fromSession) {
      return JSON.parse(fromSession) as StudioUtmCapture;
    }
  } catch {
    /* fall through */
  }
  try {
    const raw = document.cookie
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith(`${STUDIO_UTM_COOKIE}=`))
      ?.slice(STUDIO_UTM_COOKIE.length + 1);
    if (!raw) return null;
    return parseStudioUtmCookieValue(raw);
  } catch {
    return null;
  }
}

/** First-touch: only overwrite when no prior capture exists. */
export function captureStudioUtmFirstTouch(
  params: URLSearchParams,
  landingPath: string,
): StudioUtmCapture | null {
  const existing = readPersistedStudioUtm();
  if (existing?.utm_source || existing?.utm_campaign) return existing;
  const next = readUtmFromSearchParams(params, landingPath);
  if (!next) return existing;
  persistStudioUtm(next);
  return next;
}

export function utmQueryString(capture: StudioUtmCapture | null): string {
  if (!capture) return "";
  const sp = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const v = capture[key];
    if (v) sp.set(key, v);
  }
  return sp.toString();
}

/** Append first-touch UTMs to same-origin auth/product hrefs. */
export function withStudioUtm(href: string): string {
  if (typeof window === "undefined") return href;
  if (!href.startsWith("/")) return href;
  const capture = readPersistedStudioUtm();
  const qs = utmQueryString(capture);
  if (!qs) return href;
  const u = new URL(href, window.location.origin);
  for (const key of UTM_KEYS) {
    if (!u.searchParams.has(key) && capture?.[key]) {
      u.searchParams.set(key, capture[key]!);
    }
  }
  return `${u.pathname}${u.search}${u.hash}`;
}

function truncateMeta(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const t = value.trim().slice(0, STRIPE_META_MAX);
  return t || undefined;
}

/** Flatten capture into Stripe Checkout session metadata keys (omit empties). */
export function studioUtmToStripeMetadata(
  capture: StudioUtmCapture | null | undefined,
): Record<string, string> {
  if (!capture) return {};
  const out: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const v = truncateMeta(capture[key]);
    if (v) out[key] = v;
  }
  const landing = truncateMeta(capture.landing_path);
  if (landing) out.landing_path = landing;
  const at = truncateMeta(capture.captured_at);
  if (at) out.first_touch_at = at;
  return out;
}

export function hasStudioUtmSignal(capture: StudioUtmCapture | null | undefined): boolean {
  return Boolean(capture?.utm_source || capture?.utm_campaign);
}
