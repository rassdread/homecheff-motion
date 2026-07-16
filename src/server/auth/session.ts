import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAMES,
  LEGACY_SHARED_COOKIE_DOMAIN,
} from "@/server/auth/cookie-names";

const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-auth-secret-change-me";

/**
 * `Secure` cookies are not sent on http:// — local `next start` with NODE_ENV=production
 * on http://localhost needs COOKIE_SECURE=false.
 *
 * Production HTTPS on a custom domain (e.g. motion.*) should use Secure cookies: set
 * `COOKIE_SECURE=true`, or set any of `NEXT_PUBLIC_APP_URL` / `PUBLIC_BASE_URL` to an
 * `https://` URL so we infer Secure=true when COOKIE_SECURE is unset.
 */
function sessionCookieSecure(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }
  if (process.env.COOKIE_SECURE === "false" || process.env.COOKIE_SECURE === "0") {
    return false;
  }
  if (process.env.COOKIE_SECURE === "true" || process.env.COOKIE_SECURE === "1") {
    return true;
  }
  if (process.env.VERCEL === "1") {
    return true;
  }
  const publicUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_URL?.trim() ||
    process.env.PUBLIC_BASE_URL?.trim() ||
    "";
  if (publicUrl.startsWith("https://")) {
    return true;
  }
  return false;
}

type SessionPayload = { userId: string; nonce: string };

function sign(value: string): string {
  return createHmac("sha256", AUTH_SECRET).update(value).digest("hex");
}

function encode(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json, "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(raw: string): SessionPayload | null {
  const [body, sig] = raw.split(".");
  if (!body || !sig) {
    return null;
  }
  const expected = sign(body);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!parsed.userId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Studio HMAC = body.hexSig (2 parts). Growth JWT = 3 parts — never treat as Studio. */
function looksLikeStudioHmac(raw: string): boolean {
  const parts = raw.trim().split(".");
  return parts.length === 2 && /^[0-9a-f]{64}$/i.test(parts[1] ?? "");
}

function baseCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: sessionCookieSecure(),
    path: "/",
    maxAge,
  };
}

/**
 * Host-only product session. Do not set Domain=.homecheff.eu (P0 containment).
 * Explicit COOKIE_DOMAIN is intentionally ignored for session cookies so Studio
 * cannot reintroduce shared-domain collision with Growth.
 */
function clearLegacyAndCanonical(jar: Awaited<ReturnType<typeof cookies>>): void {
  const expire = baseCookieOptions(0);
  jar.set(AUTH_COOKIE_NAMES.studio, "", expire);
  jar.set(AUTH_COOKIE_NAMES.legacy, "", expire);
  jar.set(AUTH_COOKIE_NAMES.legacy, "", {
    ...expire,
    domain: LEGACY_SHARED_COOKIE_DOMAIN,
  });
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) {
    return false;
  }
  const verifyHash = scryptSync(password, salt, 64);
  const hashBuf = Buffer.from(hash, "hex");
  return verifyHash.length === hashBuf.length && timingSafeEqual(verifyHash, hashBuf);
}

export async function createSession(userId: string): Promise<void> {
  const value = encode({ userId, nonce: randomBytes(8).toString("hex") });
  const jar = await cookies();
  clearLegacyAndCanonical(jar);
  jar.set(AUTH_COOKIE_NAMES.studio, value, baseCookieOptions(60 * 60 * 24 * 30));
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  clearLegacyAndCanonical(jar);
}

export type SessionUser = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  invitedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function readStudioSessionRaw(
  jar: Awaited<ReturnType<typeof cookies>>,
): { token: string | null; source: "studio" | "legacy" | null } {
  const primary = jar.get(AUTH_COOKIE_NAMES.studio)?.value?.trim() ?? "";
  if (primary) {
    return { token: primary, source: "studio" };
  }

  const legacy = jar.get(AUTH_COOKIE_NAMES.legacy)?.value?.trim() ?? "";
  if (!legacy || !looksLikeStudioHmac(legacy)) {
    return { token: null, source: null };
  }

  return { token: legacy, source: "legacy" };
}

export async function getAuthenticatedUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const { token, source } = readStudioSessionRaw(jar);
  if (!token) {
    return null;
  }
  const payload = decode(token);
  if (!payload) {
    return null;
  }

  if (source === "legacy") {
    try {
      clearLegacyAndCanonical(jar);
      jar.set(AUTH_COOKIE_NAMES.studio, token, baseCookieOptions(60 * 60 * 24 * 30));
    } catch {
      /* best-effort upgrade; may fail outside Route Handlers */
    }
  }

  return prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      invitedById: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
