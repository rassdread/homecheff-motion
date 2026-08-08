/**
 * SHARED_PURE — Resolve client idempotency keys for Studio generation routes.
 */

export function resolveStudioGenerationIdempotencyKey(input: {
  headerKey?: string | null;
  clientMutationId?: string | null;
  fallbackPrefix: string;
}): string {
  const header =
    typeof input.headerKey === "string" && input.headerKey.trim() ?
      input.headerKey.trim().slice(0, 128)
    : null;
  const mutation =
    typeof input.clientMutationId === "string" && input.clientMutationId.trim() ?
      input.clientMutationId.trim().slice(0, 128)
    : null;
  return (
    header ||
    mutation ||
    `${input.fallbackPrefix}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
  );
}
