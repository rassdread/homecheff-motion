/**
 * S.8B — Billable generation idempotency (no random paid keys).
 */

import { createHash } from "node:crypto";

export type StudioIdempotencyKeySource = "header" | "client" | "fingerprint";

export type ResolvedStudioIdempotencyKey = {
  key: string;
  source: StudioIdempotencyKeySource;
};

function digestFingerprint(fallbackPrefix: string, fingerprint: string): string {
  return createHash("sha256")
    .update(`${fallbackPrefix}:${fingerprint}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Resolve idempotency for billable generation.
 * Prefer Idempotency-Key / clientMutationId.
 * Legacy: require deterministic operationFingerprint — never Date.now()/random().
 */
export function resolveStudioGenerationIdempotencyKeyDetailed(input: {
  headerKey?: string | null;
  clientMutationId?: string | null;
  operationFingerprint?: string | null;
  fallbackPrefix: string;
}): ResolvedStudioIdempotencyKey | null {
  const header =
    typeof input.headerKey === "string" && input.headerKey.trim()
      ? input.headerKey.trim().slice(0, 128)
      : null;
  if (header) {
    return { key: header, source: "header" };
  }

  const mutation =
    typeof input.clientMutationId === "string" && input.clientMutationId.trim()
      ? input.clientMutationId.trim().slice(0, 128)
      : null;
  if (mutation) {
    return { key: mutation, source: "client" };
  }

  const fingerprint =
    typeof input.operationFingerprint === "string" && input.operationFingerprint.trim()
      ? input.operationFingerprint.trim().slice(0, 256)
      : null;
  if (fingerprint) {
    return {
      key: `${input.fallbackPrefix}:fp:${digestFingerprint(input.fallbackPrefix, fingerprint)}`,
      source: "fingerprint",
    };
  }

  return null;
}

/**
 * String resolver for routes. Throws IDEMPOTENCY_REQUIRED when no key/fingerprint.
 */
export function resolveStudioGenerationIdempotencyKey(input: {
  headerKey?: string | null;
  clientMutationId?: string | null;
  operationFingerprint?: string | null;
  fallbackPrefix: string;
}): string {
  const resolved = resolveStudioGenerationIdempotencyKeyDetailed(input);
  if (!resolved) {
    throw new Error("IDEMPOTENCY_REQUIRED");
  }
  return resolved.key;
}

export function tryResolveStudioGenerationIdempotencyKey(
  input: Parameters<typeof resolveStudioGenerationIdempotencyKeyDetailed>[0]
): ResolvedStudioIdempotencyKey | null {
  return resolveStudioGenerationIdempotencyKeyDetailed(input);
}
