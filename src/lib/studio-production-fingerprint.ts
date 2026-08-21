/**
 * S2A — Deterministic hashes for UPC / scene context (no media bytes).
 */

import { createHash } from "node:crypto";

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return "null";
}

export function hashProductionFingerprint(payload: unknown): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex").slice(0, 32);
}

/** Strip query/signature from URLs before hashing. */
export function fingerprintMediaPointer(url: string | null | undefined): string | null {
  const raw = url?.trim() ?? "";
  if (!raw) {
    return null;
  }
  try {
    const parsed = new URL(raw);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return raw.split("?")[0] ?? raw;
  }
}
