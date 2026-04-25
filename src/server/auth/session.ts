import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "hc_session";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-auth-secret-change-me";

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
  jar.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getAuthenticatedUser() {
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
    select: { id: true, email: true, createdAt: true },
  });
}

