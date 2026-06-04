import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "hc_session";
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

async function sessionCookieDomain(): Promise<string | undefined> {
  const explicit = process.env.COOKIE_DOMAIN?.trim();
  if (explicit) {
    return explicit || undefined;
  }
  if (process.env.NODE_ENV !== "production") {
    return undefined;
  }
  try {
    const h = await headers();
    const host = h.get("host")?.split(":")[0]?.toLowerCase() ?? "";
    if (host === "homecheff.eu" || host.endsWith(".homecheff.eu")) {
      return ".homecheff.eu";
    }
  } catch {
    return undefined;
  }
  return undefined;
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
  const domain = await sessionCookieDomain();
  jar.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    ...(domain ? { domain } : {}),
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
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

export async function getAuthenticatedUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  const payload = decode(token);
  if (!payload) {
    return null;
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

