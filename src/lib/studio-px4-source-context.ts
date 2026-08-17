/**
 * PX.4 — HomeCheff → Studio source context (ids + normalization only).
 *
 * Deep link MUST be path-based: validateStudioReturnTo strips query strings
 * except `/studio?storyboardId=`.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";
import { PX3_INTENTS, type Px3IntentId } from "@/lib/studio-px3-home";
import { validateStudioReturnTo, isPublicStudioSurface } from "@/lib/identity/return-path";

export const PX4_SOURCE = "homecheff" as const;
export const PX4_SOURCE_TYPE_PRODUCT = "product" as const;
export const PX4_SUPPORTED_SOURCE_TYPES = [PX4_SOURCE_TYPE_PRODUCT] as const;
export type Px4SourceType = (typeof PX4_SUPPORTED_SOURCE_TYPES)[number];

export const PX4_MEDIA_CAP = 8;
export const PX4_TITLE_MAX = 200;
export const PX4_DESCRIPTION_MAX = 1500;
export const PX4_CONTEXT_MAX_SKEW_SEC = 60;
export const PX4_SESSION_STORAGE_KEY = "studio_px4_source";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StudioSourceContext = {
  source: typeof PX4_SOURCE;
  sourceType: Px4SourceType;
  sourceId: string;
  title: string;
  description: string;
  media: { url: string }[];
  category: string | null;
  sellerDisplayName: string | null;
  returnTarget: string;
};

export type Px4ResolveResult =
  | { ok: true; context: StudioSourceContext }
  | { ok: false; reason: "unresolved" | "unauthenticated" | "invalid" };

export function isPx4SourceType(value: string): value is Px4SourceType {
  return (PX4_SUPPORTED_SOURCE_TYPES as readonly string[]).includes(value);
}

export function isPx4OpaqueId(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function studioPx4CanonicalPath(sourceType: string, sourceId: string): string {
  return `/studio/from/homecheff/${sourceType}/${sourceId}`;
}

/** Path that survives silent SSO (no query string). */
export function studioPx4SsoReturnTo(sourceType: string, sourceId: string): string {
  return validateStudioReturnTo(studioPx4CanonicalPath(sourceType, sourceId));
}

export function isPx4ContextualEntryPath(path: string): boolean {
  const p = validateStudioReturnTo(path);
  return p.startsWith("/studio/from/homecheff/");
}

export function assertPx4EntryIsPrivate(path: string): boolean {
  return isPx4ContextualEntryPath(path) && !isPublicStudioSurface(path);
}

export function px4IntentHref(id: Px3IntentId): string {
  return PX3_INTENTS.find((intent) => intent.id === id)?.href ?? "/studio/experience";
}

export function clampText(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd();
}

export function normalizeHttpsMediaUrls(urls: unknown, cap = PX4_MEDIA_CAP): { url: string }[] {
  if (!Array.isArray(urls)) return [];
  const out: { url: string }[] = [];
  const seen = new Set<string>();
  for (const item of urls) {
    if (out.length >= cap) break;
    const raw =
      typeof item === "string"
        ? item
        : item && typeof item === "object" && "url" in item
          ? String((item as { url?: unknown }).url ?? "")
          : "";
    const url = raw.trim();
    if (!url || seen.has(url)) continue;
    if (!isValidHttpUrl(url)) continue;
    try {
      if (new URL(url).protocol !== "https:") continue;
    } catch {
      continue;
    }
    seen.add(url);
    out.push({ url });
  }
  return out;
}

export function normalizeStudioSourceContext(raw: {
  sourceType: string;
  sourceId: string;
  title?: unknown;
  description?: unknown;
  media?: unknown;
  category?: unknown;
  sellerDisplayName?: unknown;
  returnTarget?: unknown;
}): StudioSourceContext | null {
  if (!isPx4SourceType(raw.sourceType) || !isPx4OpaqueId(raw.sourceId)) return null;
  const title = clampText(typeof raw.title === "string" ? raw.title : "", PX4_TITLE_MAX);
  const description = clampText(
    typeof raw.description === "string" ? raw.description : "",
    PX4_DESCRIPTION_MAX,
  );
  const category =
    typeof raw.category === "string" && raw.category.trim() ? clampText(raw.category, 80) : null;
  const sellerDisplayName =
    typeof raw.sellerDisplayName === "string" && raw.sellerDisplayName.trim()
      ? clampText(raw.sellerDisplayName, 80)
      : null;
  const returnTarget =
    typeof raw.returnTarget === "string" && isValidHttpUrl(raw.returnTarget)
      ? raw.returnTarget.trim()
      : `https://homecheff.eu/product/${raw.sourceId}`;

  return {
    source: PX4_SOURCE,
    sourceType: raw.sourceType,
    sourceId: raw.sourceId.trim(),
    title,
    description,
    media: normalizeHttpsMediaUrls(raw.media),
    category,
    sellerDisplayName,
    returnTarget,
  };
}

export function px4SessionRememberPayload(context: Pick<StudioSourceContext, "sourceType" | "sourceId">): string {
  return JSON.stringify({
    v: 1,
    source: PX4_SOURCE,
    type: context.sourceType,
    id: context.sourceId,
  });
}

export function signStudioSourceContextRequest(opts: {
  secret: string;
  timestampSec: number;
  centralUserId: string;
  sourceType: string;
  sourceId: string;
}): string {
  const body = `${opts.timestampSec}\n${opts.centralUserId}\n${opts.sourceType}\n${opts.sourceId}`;
  return createHmac("sha256", opts.secret).update(body).digest("base64url");
}

function signaturesMatch(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function verifyStudioSourceContextRequest(opts: {
  secrets: string[];
  timestampSec: number;
  nowSec?: number;
  signature: string;
  centralUserId: string;
  sourceType: string;
  sourceId: string;
}): boolean {
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(opts.timestampSec)) return false;
  if (Math.abs(now - opts.timestampSec) > PX4_CONTEXT_MAX_SKEW_SEC) return false;
  if (!opts.centralUserId.trim() || !isPx4OpaqueId(opts.sourceId)) return false;
  for (const secret of opts.secrets) {
    if (!secret) continue;
    const expected = signStudioSourceContextRequest({
      secret,
      timestampSec: opts.timestampSec,
      centralUserId: opts.centralUserId,
      sourceType: opts.sourceType,
      sourceId: opts.sourceId,
    });
    if (signaturesMatch(opts.signature, expected)) return true;
  }
  return false;
}

/** Owner projection gate — never return another seller's fields. */
export function authorizeOwnerProductProjection(
  row: {
    id: string;
    sellerUserId: string | null;
    integrityStatus?: string | null;
  } | null,
  centralUserId: string,
): { ok: true } | { ok: false; reason: "not_found" } {
  if (!row || !centralUserId.trim()) return { ok: false, reason: "not_found" };
  if (row.sellerUserId !== centralUserId) return { ok: false, reason: "not_found" };
  if ((row.integrityStatus ?? "ACTIVE") === "REMOVED") return { ok: false, reason: "not_found" };
  return { ok: true };
}

export const PX4_EXCLUDED_LISTING_FIELDS = [
  "priceCents",
  "pickupLat",
  "pickupLng",
  "pickupAddress",
  "kvk",
  "stripeConnectAccountId",
  "allergens",
  "integrityHiddenReason",
  "stock",
  "email",
  "iban",
] as const;
