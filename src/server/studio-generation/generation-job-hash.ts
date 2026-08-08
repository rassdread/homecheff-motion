import { createHash } from "node:crypto";

/** Stable hash of input refs — never include secrets or full private prompts. */
export function hashStudioGenerationInput(parts: Record<string, unknown>): string {
  const normalized = JSON.stringify(parts, Object.keys(parts).sort());
  return createHash("sha256").update(normalized).digest("hex");
}
