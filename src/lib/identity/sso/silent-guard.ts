/**
 * SP.2B.5 — silent SSO loop / post-logout guards (host-only cookies).
 */

import type { NextResponse } from "next/server";

export const STUDIO_SILENT_SSO_ATTEMPT_COOKIE = "studio_silent_sso_attempt";
export const STUDIO_SKIP_SILENT_SSO_COOKIE = "studio_skip_silent_sso";

/** Short TTL: one silent attempt window. */
export const SILENT_SSO_ATTEMPT_TTL_SEC = 120;
/** After Studio-local logout, suppress auto silent SSO briefly. */
export const SKIP_SILENT_SSO_TTL_SEC = 15 * 60;

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

export function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const raw = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** True when a silent SSO attempt is allowed (no skip / no prior attempt marker). */
export function canAttemptSilentSso(cookieHeader: string | null): boolean {
  const skip = readCookieValue(cookieHeader, STUDIO_SKIP_SILENT_SSO_COOKIE);
  if (skip === "1") return false;
  const attempt = readCookieValue(cookieHeader, STUDIO_SILENT_SSO_ATTEMPT_COOKIE);
  if (attempt === "1") return false;
  return true;
}

export function applySilentSsoAttemptCookie(res: NextResponse): void {
  res.cookies.set(STUDIO_SILENT_SSO_ATTEMPT_COOKIE, "1", {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: SILENT_SSO_ATTEMPT_TTL_SEC,
  });
}

export function clearSilentSsoAttemptCookie(res: NextResponse): void {
  res.cookies.set(STUDIO_SILENT_SSO_ATTEMPT_COOKIE, "", {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function applySkipSilentSsoCookie(res: NextResponse): void {
  res.cookies.set(STUDIO_SKIP_SILENT_SSO_COOKIE, "1", {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: SKIP_SILENT_SSO_TTL_SEC,
  });
}

export function clearSkipSilentSsoCookie(res: NextResponse): void {
  res.cookies.set(STUDIO_SKIP_SILENT_SSO_COOKIE, "", {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
