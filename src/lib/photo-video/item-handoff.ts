/**
 * PX.4A.4 — HomeCheff Item toevoegen → Studio photo-video contextual handoff.
 * Token is HMAC-signed; photos are HTTPS listing Blob URLs only.
 * No composition, titles, or media bytes in query strings.
 */

export const PX4A_ITEM_COOKIE = "hc_px4a_item";
export const PX4A_STANDALONE_CREATOR_PATH = "/studio/photo-video";
export const PX4A_ITEM_CREATOR_PATH = "/studio/photo-video/from-item";
export const PX4A_ITEM_HANDOFF_PATH = "/api/photo-video/item-handoff";
export const PX4A_ITEM_TTL_SEC = 2 * 60 * 60;
export const PX4A_ITEM_MAX_PHOTOS = 12;
export const PX4A_ITEM_RETURN_PATH = "/sell/new";
export const PX4A_ITEM_MAX_TOKEN_CHARS = 3500;

export type Px4aItemHandoffPayload = {
  v: 1;
  u: string;
  p: string[];
  e: number;
  r: string;
};

export function isPx4aStandaloneCreatorPath(path: string): boolean {
  const pathname = (path.split("?")[0] ?? path).trim();
  return pathname === PX4A_STANDALONE_CREATOR_PATH;
}

export function isPx4aItemCreatorPath(path: string): boolean {
  const pathname = (path.split("?")[0] ?? path).trim();
  return pathname === PX4A_ITEM_CREATOR_PATH || pathname.startsWith(`${PX4A_ITEM_CREATOR_PATH}/`);
}

export function isHttpsListingUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeItemPhotoUrls(urls: unknown, cap = PX4A_ITEM_MAX_PHOTOS): string[] {
  if (!Array.isArray(urls)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    if (out.length >= cap) break;
    const url = typeof raw === "string" ? raw.trim() : "";
    if (!url || seen.has(url) || !isHttpsListingUrl(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function normalizeItemReturnPath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) return null;
  const pathname = trimmed.split("?")[0] ?? trimmed;
  if (pathname !== PX4A_ITEM_RETURN_PATH) return null;
  return PX4A_ITEM_RETURN_PATH;
}

export function canonicalItemHandoffBody(payload: Px4aItemHandoffPayload): string {
  return JSON.stringify({
    e: payload.e,
    p: payload.p,
    r: payload.r,
    u: payload.u,
    v: 1,
  });
}

export function parseItemHandoffPayload(raw: unknown): Px4aItemHandoffPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (rec.v !== 1) return null;
  if (typeof rec.u !== "string" || !rec.u.trim()) return null;
  if (typeof rec.e !== "number" || !Number.isFinite(rec.e)) return null;
  if (typeof rec.r !== "string") return null;
  const r = normalizeItemReturnPath(rec.r);
  const p = normalizeItemPhotoUrls(rec.p);
  if (!r) return null;
  return { v: 1, u: rec.u.trim(), p, e: rec.e, r };
}

/** Snapshot rule: listing photo removal after return does not mutate this composition. */
export const PX4A_ITEM_PHOTO_SNAPSHOT_LAW =
  "Video composition snapshots chosen listing HTTPS URLs at creator entry. Later gallery edits do not rewrite the composition.";

export function isItemHandoffTokenSizeOk(token: string): boolean {
  return token.length > 0 && token.length <= PX4A_ITEM_MAX_TOKEN_CHARS;
}

export function boundListingPhotoUrls(
  payload: Px4aItemHandoffPayload | null,
  centralUserId: string | null | undefined
): string[] {
  const uid = centralUserId?.trim() ?? "";
  if (!payload || !uid || payload.u !== uid) return [];
  return payload.p;
}

export function itemReturnHref(
  origin: string,
  payload: Px4aItemHandoffPayload | null,
  centralUserId: string | null | undefined
): string {
  const base = origin.replace(/\/$/, "");
  const uid = centralUserId?.trim() ?? "";
  const path =
    payload && uid && payload.u === uid ? payload.r : PX4A_ITEM_RETURN_PATH;
  return `${base}${path}?px4a=1`;
}

export function withItemReturnResult(href: string, result: "ready" | "cancel"): string {
  try {
    const url = new URL(href);
    url.searchParams.set("px4a", "1");
    url.searchParams.set("px4aResult", result);
    return url.toString();
  } catch {
    return href;
  }
}
