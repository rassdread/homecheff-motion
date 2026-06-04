/**
 * Read-only bundle integrity checks (warnings only, no auto-repair).
 */

import { resolveProjectBundleGroupKey } from "@/lib/project-display-title";

export type BundleIntegrityRow = {
  id: string;
  ownerId: string;
  projectType: string;
  status: string;
  title: string | null;
  bundleName: string | null;
  bundleKey: string | null;
  sourceProjectId: string | null;
};

export type BundleIntegrityWarning = {
  code: string;
  message: string;
  projectId: string;
  relatedProjectId?: string;
};

export function scanBundleIntegrity(rows: BundleIntegrityRow[]): BundleIntegrityWarning[] {
  const warnings: BundleIntegrityWarning[] = [];
  const byId = new Map(rows.map((r) => [r.id, r]));

  for (const row of rows) {
    if (row.status === "draft" && !row.sourceProjectId?.trim()) {
      warnings.push({
        code: "orphan_draft",
        message: "Draft has no sourceProjectId.",
        projectId: row.id,
      });
    }

    if (row.sourceProjectId?.trim()) {
      const source = byId.get(row.sourceProjectId);
      if (!source) {
        warnings.push({
          code: "missing_source",
          message: "Draft references a source project that is not in the scan set.",
          projectId: row.id,
          relatedProjectId: row.sourceProjectId,
        });
      } else {
        if (row.bundleKey?.trim() && source.bundleKey?.trim() && row.bundleKey !== source.bundleKey) {
          warnings.push({
            code: "bundle_key_mismatch",
            message: "Draft bundleKey differs from source.",
            projectId: row.id,
            relatedProjectId: source.id,
          });
        }
        const draftName = row.bundleName?.trim() ?? null;
        const sourceName = source.bundleName?.trim() ?? null;
        if (draftName && sourceName && draftName !== sourceName) {
          warnings.push({
            code: "bundle_name_mismatch",
            message: "Draft bundleName differs from source.",
            projectId: row.id,
            relatedProjectId: source.id,
          });
        }
      }
    }
  }

  const byGroup = new Map<string, BundleIntegrityRow[]>();
  for (const row of rows) {
    const key = resolveProjectBundleGroupKey({
      ownerId: row.ownerId,
      projectType: row.projectType,
      title: row.title,
      bundleName: row.bundleName,
      bundleKey: row.bundleKey,
    });
    const list = byGroup.get(key) ?? [];
    list.push(row);
    byGroup.set(key, list);
  }

  for (const [groupKey, members] of byGroup) {
    const names = new Set(
      members.map((m) => m.bundleName?.trim()).filter((n): n is string => Boolean(n))
    );
    if (names.size > 1) {
      for (const member of members) {
        warnings.push({
          code: "duplicate_bundle_name_conflict",
          message: `Bundle group has conflicting bundleName values (${groupKey}).`,
          projectId: member.id,
        });
      }
    }
  }

  return warnings;
}
