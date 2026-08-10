/**
 * SP.2B.3 — pending claim confirmation after SSO exchange (before link).
 * Dual-proof still required at finalize; this cookie only holds confirmed HC claims display + ids.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
import { validateStudioReturnTo } from "@/lib/identity/return-path";
import { StudioSsoError } from "./errors";

export const STUDIO_CLAIM_PENDING_COOKIE = "studio_claim_pending";
export const CLAIM_PENDING_TTL_SEC = 10 * 60;

export type ClaimPendingPayload = {
  v: 1;
  claimStudioUserId: string;
  centralUserId: string;
  /** Safe display only — not used as identity proof. */
  email: string;
  displayName: string | null;
  returnTo: string;
  exp: number;
};

function signingSecret(): string {
  const s = process.env.AUTH_SECRET?.trim();
  if (!s || s.length < 16) {
    throw new StudioSsoError("CONFIG_ERROR", "AUTH_SECRET missing");
  }
  return s;
}

function sign(body: string): string {
  return createHmac("sha256", signingSecret()).update(body).digest("base64url");
}

export function encodeClaimPending(payload: ClaimPendingPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeClaimPending(raw: string | undefined | null): ClaimPendingPayload {
  if (!raw || !raw.includes(".")) {
    throw new StudioSsoError("CLAIM_UNAUTHORIZED");
  }
  const [body, sig] = raw.split(".");
  if (!body || !sig) throw new StudioSsoError("CLAIM_UNAUTHORIZED");
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new StudioSsoError("CLAIM_UNAUTHORIZED");
    }
  } catch (e) {
    if (e instanceof StudioSsoError) throw e;
    throw new StudioSsoError("CLAIM_UNAUTHORIZED");
  }
  let parsed: ClaimPendingPayload;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ClaimPendingPayload;
  } catch {
    throw new StudioSsoError("CLAIM_UNAUTHORIZED");
  }
  if (parsed.v !== 1 || !parsed.claimStudioUserId || !parsed.centralUserId || !parsed.email) {
    throw new StudioSsoError("CLAIM_UNAUTHORIZED");
  }
  if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) {
    throw new StudioSsoError("SSO_EXPIRED");
  }
  parsed.returnTo = validateStudioReturnTo(parsed.returnTo);
  return parsed;
}

export function buildClaimPending(input: {
  claimStudioUserId: string;
  centralUserId: string;
  email: string;
  displayName?: string | null;
  returnTo?: string | null;
  now?: number;
}): ClaimPendingPayload {
  const now = input.now ?? Date.now();
  return {
    v: 1,
    claimStudioUserId: input.claimStudioUserId.trim(),
    centralUserId: input.centralUserId.trim(),
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName?.trim() || null,
    returnTo: validateStudioReturnTo(input.returnTo),
    exp: now + CLAIM_PENDING_TTL_SEC * 1000,
  };
}

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

export function applyClaimPendingCookie(res: NextResponse, encoded: string): void {
  res.cookies.set(STUDIO_CLAIM_PENDING_COOKIE, encoded, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: CLAIM_PENDING_TTL_SEC,
  });
}

export function clearClaimPendingCookie(res: NextResponse): void {
  res.cookies.set(STUDIO_CLAIM_PENDING_COOKIE, "", {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
