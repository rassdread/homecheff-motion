import { createHash, randomBytes } from "node:crypto";

/** Length of raw token in bytes before base64url encoding. */
const INVITE_TOKEN_BYTES = 32;

export function generateInviteRawToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
}

export function hashInviteToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}
