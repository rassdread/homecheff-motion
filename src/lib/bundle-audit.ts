/**
 * Bundle management audit log (stored on AnimationProject.bundleAuditJson).
 */

export type BundleAuditEventType =
  | "rename"
  | "bundle_name"
  | "bundle_key"
  | "version_note"
  | "draft_created";

export type BundleAuditEntry = {
  type: BundleAuditEventType;
  at: string;
  userId: string;
  before: string | null;
  after: string | null;
  meta?: Record<string, string | number | null>;
};

export function parseBundleAuditJson(value: unknown): BundleAuditEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: BundleAuditEntry[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    if (typeof o.type !== "string" || typeof o.at !== "string" || typeof o.userId !== "string") {
      continue;
    }
    out.push({
      type: o.type as BundleAuditEventType,
      at: o.at,
      userId: o.userId,
      before: typeof o.before === "string" || o.before === null ? o.before : null,
      after: typeof o.after === "string" || o.after === null ? o.after : null,
      meta:
        o.meta && typeof o.meta === "object" && !Array.isArray(o.meta)
          ? (o.meta as Record<string, string | number | null>)
          : undefined,
    });
  }
  return out;
}

export function appendBundleAuditEntry(
  existing: unknown,
  entry: Omit<BundleAuditEntry, "at"> & { at?: string }
): BundleAuditEntry[] {
  const rows = parseBundleAuditJson(existing);
  const next: BundleAuditEntry = {
    ...entry,
    at: entry.at ?? new Date().toISOString(),
  };
  return [...rows, next].slice(-100);
}
