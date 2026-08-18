/**
 * PX.4A.5 reverse handoff: HTTPS listing-video URL only (never the File/Blob).
 */

import { homecheffIdentityOriginFromEnv } from "@/lib/identity/homecheff-origin";
import { isHttpsListingUrl } from "@/lib/photo-video/item-handoff";

export const PX4A_EXPORT_ATTACH_PATH = "/api/studio/px4a-export-attach";
export const PX4A_EXPORT_ATTACH_TTL_SEC = 20 * 60;
export const PX4A_EXPORT_ATTACH_MAX_TOKEN_CHARS = 8000;
export const PX4A_EXPORT_VIDEO_STORAGE_KEY = "hc-px4a-export-video:v1";

export type Px4aExportAttachPayload = {
  v: 1;
  kind: "export-attach";
  u: string;
  videoUrl: string;
  duration: number;
  thumb: string | null;
  e: number;
  r: "/sell/new";
};

export function isAllowedExportVideoUrl(value: string): boolean {
  if (!isHttpsListingUrl(value)) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host.endsWith(".blob.vercel-storage.com") ||
      host.endsWith(".public.blob.vercel-storage.com") ||
      host === "blob.vercel-storage.com"
    );
  } catch {
    return false;
  }
}

export function canonicalExportAttachBody(payload: Px4aExportAttachPayload): string {
  return JSON.stringify({
    duration: payload.duration,
    e: payload.e,
    kind: "export-attach",
    r: payload.r,
    thumb: payload.thumb,
    u: payload.u,
    v: 1,
    videoUrl: payload.videoUrl,
  });
}

export function parseExportAttachPayload(raw: unknown): Px4aExportAttachPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (rec.v !== 1 || rec.kind !== "export-attach") return null;
  if (typeof rec.u !== "string" || !rec.u.trim()) return null;
  if (typeof rec.e !== "number" || !Number.isFinite(rec.e)) return null;
  if (rec.r !== "/sell/new") return null;
  if (typeof rec.videoUrl !== "string" || !isAllowedExportVideoUrl(rec.videoUrl)) return null;
  if (typeof rec.duration !== "number" || !Number.isFinite(rec.duration) || rec.duration <= 0 || rec.duration > 30.35) {
    return null;
  }
  const thumb = rec.thumb == null ? null : typeof rec.thumb === "string" && isHttpsListingUrl(rec.thumb) ? rec.thumb : null;
  return {
    v: 1,
    kind: "export-attach",
    u: rec.u.trim(),
    videoUrl: rec.videoUrl.trim(),
    duration: rec.duration,
    thumb,
    e: rec.e,
    r: "/sell/new",
  };
}

export function isExportAttachTokenSizeOk(token: string): boolean {
  return token.length > 0 && token.length <= PX4A_EXPORT_ATTACH_MAX_TOKEN_CHARS;
}

export function homecheffExportAttachAction(): string {
  return `${homecheffIdentityOriginFromEnv()}${PX4A_EXPORT_ATTACH_PATH}`;
}

export function isTrustedHomecheffExportAttachAction(action: string): boolean {
  try {
    const url = new URL(action);
    const expected = new URL(homecheffExportAttachAction());
    return url.origin === expected.origin && url.pathname === expected.pathname;
  } catch {
    return false;
  }
}

export function createExportAttachPayload(input: {
  centralUserId: string;
  videoUrl: string;
  durationSeconds: number;
  thumbnailUrl?: string | null;
  nowSec?: number;
}): Px4aExportAttachPayload | null {
  const u = input.centralUserId.trim();
  if (!u || !isAllowedExportVideoUrl(input.videoUrl)) return null;
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0 || input.durationSeconds > 30.35) {
    return null;
  }
  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  const thumb =
    input.thumbnailUrl && isHttpsListingUrl(input.thumbnailUrl) ? input.thumbnailUrl.trim() : null;
  return {
    v: 1,
    kind: "export-attach",
    u,
    videoUrl: input.videoUrl.trim(),
    duration: input.durationSeconds,
    thumb,
    e: now + PX4A_EXPORT_ATTACH_TTL_SEC,
    r: "/sell/new",
  };
}
