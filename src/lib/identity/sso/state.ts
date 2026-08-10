import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
import { validateStudioReturnTo } from "@/lib/identity/return-path";
import { StudioSsoError } from "./errors";

export const STUDIO_SSO_PENDING_COOKIE = "studio_sso_pending";
export const SSO_STATE_TTL_SEC = 10 * 60;

export type SsoPendingPayload = {
  v: 1;
  state: string;
  codeVerifier: string;
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

export function encodeSsoPending(payload: SsoPendingPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSsoPending(raw: string | undefined | null): SsoPendingPayload {
  if (!raw || !raw.includes(".")) {
    throw new StudioSsoError("SSO_STATE_REJECTED");
  }
  const [body, sig] = raw.split(".");
  if (!body || !sig) throw new StudioSsoError("SSO_STATE_REJECTED");
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new StudioSsoError("SSO_STATE_REJECTED");
    }
  } catch (e) {
    if (e instanceof StudioSsoError) throw e;
    throw new StudioSsoError("SSO_STATE_REJECTED");
  }
  let parsed: SsoPendingPayload;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SsoPendingPayload;
  } catch {
    throw new StudioSsoError("SSO_STATE_REJECTED");
  }
  if (parsed.v !== 1 || !parsed.state || !parsed.codeVerifier) {
    throw new StudioSsoError("SSO_STATE_REJECTED");
  }
  if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) {
    throw new StudioSsoError("SSO_EXPIRED");
  }
  parsed.returnTo = validateStudioReturnTo(parsed.returnTo);
  return parsed;
}

export function buildSsoPending(input: {
  state: string;
  codeVerifier: string;
  returnTo?: string | null;
  now?: number;
}): SsoPendingPayload {
  const now = input.now ?? Date.now();
  return {
    v: 1,
    state: input.state,
    codeVerifier: input.codeVerifier,
    returnTo: validateStudioReturnTo(input.returnTo),
    exp: now + SSO_STATE_TTL_SEC * 1000,
  };
}

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

export function applySsoPendingCookie(res: NextResponse, encoded: string): void {
  res.cookies.set(STUDIO_SSO_PENDING_COOKIE, encoded, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: SSO_STATE_TTL_SEC,
  });
}

export function clearSsoPendingCookie(res: NextResponse): void {
  res.cookies.set(STUDIO_SSO_PENDING_COOKIE, "", {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
