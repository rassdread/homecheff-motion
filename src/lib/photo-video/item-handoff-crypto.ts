import { createHmac, timingSafeEqual } from "node:crypto";
import {
  PX4A_ITEM_TTL_SEC,
  canonicalItemHandoffBody,
  normalizeItemPhotoUrls,
  normalizeItemReturnPath,
  parseItemHandoffPayload,
  type Px4aItemHandoffPayload,
} from "@/lib/photo-video/item-handoff";

export function studioItemHandoffSecrets(): string[] {
  return [
    process.env.STUDIO_SSO_CLIENT_SECRET?.trim() ?? "",
    process.env.STUDIO_SSO_CLIENT_SECRET_PREVIOUS?.trim() ?? "",
  ].filter(Boolean);
}

export function signItemHandoffPayload(payload: Px4aItemHandoffPayload, secret: string): string {
  const body = Buffer.from(canonicalItemHandoffBody(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
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

export function verifyItemHandoffToken(
  token: string,
  secrets: string[],
  nowSec = Math.floor(Date.now() / 1000)
): Px4aItemHandoffPayload | null {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  if (!body || !sig) return null;
  let matched = false;
  for (const secret of secrets) {
    if (!secret) continue;
    const expected = createHmac("sha256", secret).update(body).digest("base64url");
    if (signaturesMatch(sig, expected)) {
      matched = true;
      break;
    }
  }
  if (!matched) return null;
  try {
    const json = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as unknown;
    const payload = parseItemHandoffPayload(json);
    if (!payload) return null;
    if (payload.e <= nowSec || payload.e > nowSec + PX4A_ITEM_TTL_SEC + 60) return null;
    if (!normalizeItemReturnPath(payload.r)) return null;
    if (normalizeItemPhotoUrls(payload.p).length !== payload.p.length) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createItemHandoffPayload(input: {
  centralUserId: string;
  photoUrls: string[];
  nowSec?: number;
}): Px4aItemHandoffPayload | null {
  const u = input.centralUserId.trim();
  if (!u) return null;
  const p = normalizeItemPhotoUrls(input.photoUrls);
  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  return {
    v: 1,
    u,
    p,
    e: now + PX4A_ITEM_TTL_SEC,
    r: "/sell/new",
  };
}
