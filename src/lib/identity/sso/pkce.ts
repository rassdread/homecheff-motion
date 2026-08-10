import { createHash, randomBytes } from "node:crypto";

export function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generateCodeVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

export function generateState(): string {
  return base64UrlEncode(randomBytes(32));
}

export function codeChallengeS256(verifier: string): string {
  return base64UrlEncode(createHash("sha256").update(verifier).digest());
}
