import { detachHcProjectFromEditorSessions } from "@/lib/editor-canvas-session";
import {
  enrichHcProjectMetadata,
  HC_PROJECT_WORKFLOW_STATUSES,
  readHcProjectWorkflowStatus,
  type HcProjectWorkflowStatus,
} from "@/lib/hc-project-lifecycle";
import { unlinkHcProjectFromLegacyRegistry } from "@/lib/homecheff-project-legacy-registry";
import {
  deleteHcProject,
  listHomeCheffProjectsFiltered,
  loadHomeCheffProject,
  persistHomeCheffProject,
} from "@/lib/homecheff-project-persist";
import { persistHcProjectWithSync } from "@/lib/homecheff-project-sync";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export const PRE_ARCHIVE_WORKFLOW_STATUS_KEY = "preArchiveWorkflowStatus";

export type HcProjectDeleteResult =
  | {
      ok: true;
      projectId: string;
      editorSessionsDetached: number;
      legacyLinksCleared: number;
    }
  | { ok: false; error: "not_found" };

export function hcProjectHasExportedResults(project: HomeCheffProjectPackage): boolean {
  if (readHcProjectWorkflowStatus(project) === "exported") {
    return true;
  }
  if (project.servicePayload.publish?.projectSnapshot) {
    return true;
  }
  if (typeof project.workflowState.exportedAt === "string") {
    return true;
  }
  return false;
}

function resolvePreArchiveWorkflowStatus(project: HomeCheffProjectPackage): HcProjectWorkflowStatus {
  const stored = project.metadata[PRE_ARCHIVE_WORKFLOW_STATUS_KEY];
  if (
    typeof stored === "string" &&
    HC_PROJECT_WORKFLOW_STATUSES.includes(stored as HcProjectWorkflowStatus) &&
    stored !== "archived"
  ) {
    return stored as HcProjectWorkflowStatus;
  }
  const current = readHcProjectWorkflowStatus(project);
  return current !== "archived" ? current : "in_progress";
}

export function archiveHcProjectRecord(
  projectId: string,
  options?: { syncToServer?: boolean }
): HomeCheffProjectPackage | null {
  const project = loadHomeCheffProject(projectId);
  if (!project) {
    return null;
  }
  const currentStatus = readHcProjectWorkflowStatus(project);
  const preArchiveStatus =
    currentStatus !== "archived"
      ? currentStatus
      : resolvePreArchiveWorkflowStatus(project);

  let next = enrichHcProjectMetadata(
    {
      ...project,
      isArchived: true,
      archivedAt: new Date().toISOString(),
      metadata: {
        ...project.metadata,
        [PRE_ARCHIVE_WORKFLOW_STATUS_KEY]: preArchiveStatus,
        workflowStatus: "archived",
      },
    },
    { workflowStatus: "archived" }
  );

  next = persistHcProjectWithSync(next, {
    syncToServer: options?.syncToServer ?? Boolean(project.ownerId),
  });
  persistHomeCheffProject(next);
  return next;
}

export function restoreHcProjectRecord(
  projectId: string,
  options?: { syncToServer?: boolean }
): HomeCheffProjectPackage | null {
  const project = loadHomeCheffProject(projectId);
  if (!project) {
    return null;
  }
  const restoredStatus = resolvePreArchiveWorkflowStatus(project);

  let next = enrichHcProjectMetadata(
    {
      ...project,
      isArchived: false,
      archivedAt: undefined,
      metadata: {
        ...project.metadata,
        workflowStatus: restoredStatus,
      },
    },
    { workflowStatus: restoredStatus }
  );

  next = persistHcProjectWithSync(next, {
    syncToServer: options?.syncToServer ?? Boolean(project.ownerId),
  });
  persistHomeCheffProject(next);
  return next;
}

export function permanentlyDeleteHcProjectRecord(projectId: string): HcProjectDeleteResult {
  const project = loadHomeCheffProject(projectId);
  if (!project) {
    return { ok: false, error: "not_found" };
  }

  const editorSessionsDetached = detachHcProjectFromEditorSessions(projectId);
  const legacyLinksCleared = unlinkHcProjectFromLegacyRegistry(projectId);
  deleteHcProject(projectId);

  return {
    ok: true,
    projectId,
    editorSessionsDetached,
    legacyLinksCleared,
  };
}

export function bulkArchiveHcProjectRecords(projectIds: string[]): number {
  let count = 0;
  for (const projectId of projectIds) {
    if (archiveHcProjectRecord(projectId)) {
      count += 1;
    }
  }
  return count;
}

export function bulkDeleteHcProjectRecords(projectIds: string[]): number {
  let count = 0;
  for (const projectId of projectIds) {
    if (permanentlyDeleteHcProjectRecord(projectId).ok) {
      count += 1;
    }
  }
  return count;
}

/** Active HC projects visible on the Projects hub (excludes archived). */
export function listActiveHcProjectsForHub(limit = 50): HomeCheffProjectPackage[] {
  return listHomeCheffProjectsFiltered("hc", limit);
}
