/**
 * Editor project restore — local-first, analysis-aware, idle background sync.
 */

import { fetchEditorProject } from "@/lib/editor-project-client";
import { loadEditorCanvasDocument } from "@/lib/editor-canvas-session";
import {
  resolveEditorDocumentOrigin,
  resolveHcProjectOrigin,
  type EditorProjectOrigin,
} from "@/lib/editor-project-origin";
import { fetchHcProjectFromServer, loadHcProjectResolved } from "@/lib/homecheff-project-sync";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import type { EditorVisionAnalysisStatus } from "@/lib/editor-vision-analysis-run";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type ProjectRestoreAudit = {
  sessionId: string | null;
  hcProjectId: string | null;
  projectOrigin: EditorProjectOrigin;
  localExists: boolean;
  serverExists: boolean | null;
  restoreAttempted: boolean;
  restoreBlockedReason: string | null;
  analysisStatus: EditorVisionAnalysisStatus | "idle";
  at: string;
};

let lastRestoreAudit: ProjectRestoreAudit | null = null;

export function getProjectRestoreAudit(): ProjectRestoreAudit | null {
  return lastRestoreAudit;
}

export function resetProjectRestoreAuditForTests(): void {
  lastRestoreAudit = null;
}

function recordRestoreAudit(audit: Omit<ProjectRestoreAudit, "at">): ProjectRestoreAudit {
  const row: ProjectRestoreAudit = { ...audit, at: new Date().toISOString() };
  lastRestoreAudit = row;
  return row;
}

export function isAnalysisBlockingRestore(status?: EditorVisionAnalysisStatus | null): boolean {
  return status === "detecting" || status === "partial" || status === "finalizing";
}

export const EDITOR_SERVER_RESTORE_QUERY = "restoreServer";

export function isExplicitServerRestoreRequested(
  searchParams?: { get: (key: string) => string | null } | null
): boolean {
  const value = searchParams?.get(EDITOR_SERVER_RESTORE_QUERY)?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "server";
}

export function resolveEditorSessionRestoreOrigin(input: {
  sessionId: string;
  document?: EditorCanvasDocument | null;
  userRequestedRestore?: boolean;
  originHint?: EditorProjectOrigin;
}): EditorProjectOrigin {
  const local = input.document ?? loadEditorCanvasDocument(input.sessionId);
  if (local) {
    return resolveEditorDocumentOrigin(local);
  }
  if (input.originHint) {
    return input.originHint;
  }
  if (input.userRequestedRestore) {
    return "server";
  }
  return "local";
}

/** Skip GET /api/editor/projects/:sessionId for local-first editor sessions. */
export function shouldSkipEditorSessionServerRestore(input: {
  sessionId: string;
  document?: EditorCanvasDocument | null;
  origin?: EditorProjectOrigin;
  userRequestedRestore?: boolean;
  analysisStatus?: EditorVisionAnalysisStatus | null;
}): { skip: boolean; reason: string } {
  const local = input.document ?? loadEditorCanvasDocument(input.sessionId);
  const localExists = Boolean(local);
  const origin =
    input.origin ??
    (local ? resolveEditorDocumentOrigin(local) : input.userRequestedRestore ? "server" : "local");
  const analysisStatus = input.analysisStatus ?? local?.visionAnalysisRun?.status ?? "idle";

  if (isAnalysisBlockingRestore(analysisStatus)) {
    return { skip: true, reason: "analysis_in_progress" };
  }
  if (localExists && origin === "local") {
    return { skip: true, reason: "local_document_exists" };
  }
  if (localExists && !input.userRequestedRestore) {
    return { skip: true, reason: "local_copy_present" };
  }
  if (origin === "local" && !input.userRequestedRestore) {
    return { skip: true, reason: localExists ? "local_document_exists" : "local_first_session" };
  }
  if (input.userRequestedRestore && (origin === "server" || origin === "synced")) {
    return { skip: false, reason: "user_requested" };
  }
  if (!localExists && (origin === "server" || origin === "synced")) {
    return { skip: false, reason: "missing_local_server_origin" };
  }
  return { skip: true, reason: "local_first" };
}

export function canRestoreFromServer(input: {
  origin: EditorProjectOrigin;
  localExists: boolean;
  userRequestedRestore?: boolean;
  analysisStatus?: EditorVisionAnalysisStatus | null;
}): { allowed: boolean; reason: string } {
  if (isAnalysisBlockingRestore(input.analysisStatus ?? undefined)) {
    return { allowed: false, reason: "analysis_in_progress" };
  }
  if (input.origin === "local") {
    return {
      allowed: false,
      reason: input.localExists ? "local_document_exists" : "local_first_session",
    };
  }
  if (input.localExists && !input.userRequestedRestore) {
    return { allowed: false, reason: "local_copy_present" };
  }
  if (input.userRequestedRestore && (input.origin === "server" || input.origin === "synced")) {
    return { allowed: true, reason: "user_requested" };
  }
  if (!input.localExists && (input.origin === "server" || input.origin === "synced")) {
    return { allowed: true, reason: "missing_local_server_origin" };
  }
  return { allowed: false, reason: "local_first" };
}

export function recordEditorSessionRestoreSkipped(input: {
  sessionId: string;
  document?: EditorCanvasDocument | null;
  reason: string;
  analysisStatus?: EditorVisionAnalysisStatus | "idle";
}): ProjectRestoreAudit {
  const local = input.document ?? loadEditorCanvasDocument(input.sessionId);
  return recordRestoreAudit({
    sessionId: input.sessionId,
    hcProjectId: local?.instructionStudioState?.hcProjectId ?? null,
    projectOrigin: local ? resolveEditorDocumentOrigin(local) : "local",
    localExists: Boolean(local),
    serverExists: null,
    restoreAttempted: false,
    restoreBlockedReason: input.reason,
    analysisStatus: input.analysisStatus ?? local?.visionAnalysisRun?.status ?? "idle",
  });
}

export function scheduleIdleTask(task: () => void, timeoutMs = 4000): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  let cancelled = false;
  const run = () => {
    if (cancelled) {
      return;
    }
    task();
  };
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: timeoutMs });
    return () => {
      cancelled = true;
      window.cancelIdleCallback(id);
    };
  }
  const timer = window.setTimeout(run, Math.min(timeoutMs, 1500));
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}

export async function restoreEditorSessionFromServerIfAllowed(input: {
  sessionId: string;
  document: EditorCanvasDocument | null;
  analysisStatus?: EditorVisionAnalysisStatus | null;
  userRequestedRestore?: boolean;
  originHint?: EditorProjectOrigin;
}): Promise<{
  project: EditorCanvasDocument | null;
  audit: ProjectRestoreAudit;
}> {
  const local = input.document ?? loadEditorCanvasDocument(input.sessionId);
  const localExists = Boolean(local);
  const origin = resolveEditorSessionRestoreOrigin({
    sessionId: input.sessionId,
    document: local,
    userRequestedRestore: input.userRequestedRestore,
    originHint: input.originHint,
  });
  const analysisStatus = input.analysisStatus ?? local?.visionAnalysisRun?.status ?? "idle";

  const skip = shouldSkipEditorSessionServerRestore({
    sessionId: input.sessionId,
    document: local,
    origin,
    userRequestedRestore: input.userRequestedRestore,
    analysisStatus,
  });

  if (skip.skip) {
    const audit = recordRestoreAudit({
      sessionId: input.sessionId,
      hcProjectId: local?.instructionStudioState?.hcProjectId ?? null,
      projectOrigin: origin,
      localExists,
      serverExists: null,
      restoreAttempted: false,
      restoreBlockedReason: skip.reason,
      analysisStatus,
    });
    return { project: local, audit };
  }

  recordRestoreAudit({
    sessionId: input.sessionId,
    hcProjectId: local?.instructionStudioState?.hcProjectId ?? null,
    projectOrigin: origin,
    localExists,
    serverExists: null,
    restoreAttempted: true,
    restoreBlockedReason: null,
    analysisStatus,
  });

  const result = await fetchEditorProject(input.sessionId);
  const audit = recordRestoreAudit({
    sessionId: input.sessionId,
    hcProjectId: local?.instructionStudioState?.hcProjectId ?? null,
    projectOrigin: origin,
    localExists,
    serverExists: result.ok && Boolean(result.project),
    restoreAttempted: true,
    restoreBlockedReason: result.ok ? null : result.error ?? "server_not_found",
    analysisStatus,
  });

  return { project: result.ok ? result.project : local, audit };
}

export async function restoreHcProjectFromServerIfAllowed(input: {
  hcProjectId: string;
  analysisStatus?: EditorVisionAnalysisStatus | null;
  userRequestedRestore?: boolean;
}): Promise<{ project: HomeCheffProjectPackage | null; audit: ProjectRestoreAudit }> {
  const local = loadHomeCheffProject(input.hcProjectId);
  const localExists = Boolean(local);
  const origin = resolveHcProjectOrigin(local);
  const analysisStatus = input.analysisStatus ?? "idle";

  const gate = canRestoreFromServer({
    origin,
    localExists,
    userRequestedRestore: input.userRequestedRestore,
    analysisStatus,
  });

  if (!gate.allowed) {
    const audit = recordRestoreAudit({
      sessionId: local?.servicePayload.editor?.sessionId ?? null,
      hcProjectId: input.hcProjectId,
      projectOrigin: origin,
      localExists,
      serverExists: null,
      restoreAttempted: false,
      restoreBlockedReason: gate.reason,
      analysisStatus,
    });
    return { project: local, audit };
  }

  const remote = await fetchHcProjectFromServer(input.hcProjectId);
  const audit = recordRestoreAudit({
    sessionId: remote?.servicePayload.editor?.sessionId ?? local?.servicePayload.editor?.sessionId ?? null,
    hcProjectId: input.hcProjectId,
    projectOrigin: origin,
    localExists,
    serverExists: Boolean(remote),
    restoreAttempted: true,
    restoreBlockedReason: remote ? null : "server_not_found",
    analysisStatus,
  });

  return { project: remote ?? local, audit };
}

/** Background merge — only when idle + analysis complete + restore allowed. */
export function scheduleIdleProjectRestore(input: {
  sessionId?: string;
  hcProjectId?: string;
  document: EditorCanvasDocument | null;
  syncUser?: boolean;
  userRequestedRestore?: boolean;
}): () => void {
  if (!input.syncUser) {
    recordRestoreAudit({
      sessionId: input.sessionId ?? input.document?.sessionId ?? null,
      hcProjectId: input.hcProjectId ?? input.document?.instructionStudioState?.hcProjectId ?? null,
      projectOrigin: input.document ? resolveEditorDocumentOrigin(input.document) : "local",
      localExists: Boolean(input.document ?? (input.sessionId && loadEditorCanvasDocument(input.sessionId))),
      serverExists: null,
      restoreAttempted: false,
      restoreBlockedReason: "guest_user",
      analysisStatus: input.document?.visionAnalysisRun?.status ?? "idle",
    });
    return () => undefined;
  }

  return scheduleIdleTask(() => {
    void (async () => {
      const doc = input.document ?? (input.sessionId ? loadEditorCanvasDocument(input.sessionId) : null);
      const analysisStatus = doc?.visionAnalysisRun?.status ?? "idle";
      if (isAnalysisBlockingRestore(analysisStatus)) {
        recordRestoreAudit({
          sessionId: input.sessionId ?? doc?.sessionId ?? null,
          hcProjectId: input.hcProjectId ?? doc?.instructionStudioState?.hcProjectId ?? null,
          projectOrigin: doc ? resolveEditorDocumentOrigin(doc) : "local",
          localExists: Boolean(doc),
          serverExists: null,
          restoreAttempted: false,
          restoreBlockedReason: "analysis_in_progress_idle_deferred",
          analysisStatus,
        });
        return;
      }

      if (input.sessionId && !doc && input.userRequestedRestore) {
        await restoreEditorSessionFromServerIfAllowed({
          sessionId: input.sessionId,
          document: null,
          analysisStatus,
          userRequestedRestore: true,
          originHint: "server",
        });
      }

      const hcId = input.hcProjectId ?? doc?.instructionStudioState?.hcProjectId;
      if (hcId) {
        await loadHcProjectResolved(hcId, {
          syncFromServer: true,
          userRequestedRestore: input.userRequestedRestore,
          analysisStatus,
        });
      }
    })();
  });
}
