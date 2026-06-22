/**
 * Dev diagnostics for editor session hydration — upload → open → restore.
 */

import { loadEditorCanvasDocument } from "@/lib/editor-canvas-session";
import { resolveEditorProjectId } from "@/lib/editor-project-isolation";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorSessionHydrationFailureReason =
  | "missing_session_id"
  | "storage_not_ready"
  | "local_document_missing"
  | "override_session_mismatch"
  | "hc_project_hydrate_failed"
  | "server_restore_failed"
  | "explicit_restore_no_local";

export type EditorSessionHydrationDiagnostic = {
  sessionId: string | null;
  projectId: string | null;
  documentId: string | null;
  userId: string | null;
  ownerUserId: string | null;
  analysisTier: "basic" | "premium" | null;
  existsSession: boolean;
  existsDocument: boolean;
  existsOverride: boolean;
  storageReady: boolean;
  hydrationState: string;
  failureReason: EditorSessionHydrationFailureReason | null;
  at: string;
};

let lastDiagnostic: EditorSessionHydrationDiagnostic | null = null;

export function getLastEditorSessionHydrationDiagnostic(): EditorSessionHydrationDiagnostic | null {
  return lastDiagnostic;
}

export function resetEditorSessionHydrationDiagnosticForTests(): void {
  lastDiagnostic = null;
}

export function buildEditorSessionHydrationDiagnostic(input: {
  sessionId?: string | null;
  document?: EditorCanvasDocument | null;
  documentOverride?: EditorCanvasDocument | null;
  userId?: string | null;
  ownerUserId?: string | null;
  storageReady?: boolean;
  hydrationState?: string;
  failureReason?: EditorSessionHydrationFailureReason | null;
}): EditorSessionHydrationDiagnostic {
  const sessionId = input.sessionId?.trim() || null;
  const stored = sessionId && input.storageReady !== false ? loadEditorCanvasDocument(sessionId) : null;
  const resolved = input.document ?? input.documentOverride ?? stored;
  const diagnostic: EditorSessionHydrationDiagnostic = {
    sessionId,
    projectId: resolved ? resolveEditorProjectId(resolved) : null,
    documentId: resolved?.sessionId ?? sessionId,
    userId: input.userId ?? null,
    ownerUserId: input.ownerUserId ?? null,
    analysisTier: resolved?.visionV6Meta?.analysisTier ?? null,
    existsSession: Boolean(sessionId),
    existsDocument: Boolean(stored),
    existsOverride: input.documentOverride?.sessionId === sessionId,
    storageReady: input.storageReady !== false,
    hydrationState: input.hydrationState ?? "unknown",
    failureReason: input.failureReason ?? null,
    at: new Date().toISOString(),
  };
  lastDiagnostic = diagnostic;
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production" && input.failureReason) {
    // eslint-disable-next-line no-console
    console.warn("[editor.session.hydration]", diagnostic);
  }
  return diagnostic;
}
