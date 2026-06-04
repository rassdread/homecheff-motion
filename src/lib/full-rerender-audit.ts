export type FullRerenderTransitionArchive = {
  order: number;
  outputVideoUrl: string | null;
  providerJobId: string | null;
};

import type { FullRerenderImageChangeAudit } from "@/lib/full-rerender-editor-types";
import type { StudioIntelligenceStatus, StudioRenderAuditMetadata } from "@/types/studio-project-persistence";

export type FullRerenderSource = "quick" | "editor";

export type FullRerenderAuditEntry = {
  rebuildType: "full_rerender";
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  /** How the user started the rerender (quick = no editor, editor = after adjustments). */
  rerenderSource?: FullRerenderSource;
  imageChanges?: FullRerenderImageChangeAudit;
  studioIntelligenceStatus?: StudioIntelligenceStatus;
  studioAudit?: StudioRenderAuditMetadata;
  versionNote?: string | null;
  previousFinalVideoUrl?: string | null;
  previousCleanFinalVideoUrl?: string | null;
  previousTransitions?: FullRerenderTransitionArchive[];
  newProviderJobsCreated: true;
  message?: string;
};

export function readFullRerenderAudit(auditJson: unknown): FullRerenderAuditEntry | null {
  if (!auditJson || typeof auditJson !== "object" || Array.isArray(auditJson)) {
    return null;
  }
  const raw = (auditJson as { fullRerender?: unknown }).fullRerender;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as FullRerenderAuditEntry;
  if (row.rebuildType !== "full_rerender" || row.newProviderJobsCreated !== true) {
    return null;
  }
  if (row.status !== "running" && row.status !== "completed" && row.status !== "failed") {
    return null;
  }
  if (typeof row.startedAt !== "string") {
    return null;
  }
  return row;
}

export function isFullRerenderInProgress(auditJson: unknown): boolean {
  return readFullRerenderAudit(auditJson)?.status === "running";
}

export function mergeFullRerenderAudit(
  existing: unknown,
  entry: FullRerenderAuditEntry
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return {
    ...base,
    fullRerender: entry,
    lastFullRerender: entry,
  };
}

export function clearRunningFullRerenderAudit(
  existing: unknown,
  patch: Partial<FullRerenderAuditEntry> & Pick<FullRerenderAuditEntry, "status">
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const prior = readFullRerenderAudit(existing);
  const completedAt = patch.completedAt ?? new Date().toISOString();
  const lastFullRerender: FullRerenderAuditEntry = {
    rebuildType: "full_rerender",
    newProviderJobsCreated: true,
    startedAt: prior?.startedAt ?? completedAt,
    ...prior,
    ...patch,
    completedAt,
  };
  return {
    ...base,
    fullRerender: patch.status === "running" ? lastFullRerender : null,
    lastFullRerender,
  };
}

export function markFullRerenderAuditFailed(
  existing: unknown,
  message?: string
): Record<string, unknown> | null {
  if (!isFullRerenderInProgress(existing)) {
    return null;
  }
  return clearRunningFullRerenderAudit(existing, {
    status: "failed",
    completedAt: new Date().toISOString(),
    message: message?.trim() || "Full rerender failed.",
  });
}
