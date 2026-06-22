/**
 * Upload → editor open pipeline trace (dev diagnostics).
 */

import type { EditorWizardPersistResult } from "@/lib/editor-upload-persist";
import type { EditorCanvasSaveResult } from "@/lib/editor-canvas-session";

export type EditorUploadFlowTrace = {
  uploadStarted: boolean;
  uploadCompleted: boolean;
  uploadedUrl: string | null;
  referenceCreated: boolean;
  roleAnalysisCompleted: boolean;
  bootstrapCompleted: boolean;
  documentCreated: boolean;
  documentSaved: boolean;
  sessionCreated: boolean;
  editorOpened: boolean;
  failureStep: string | null;
  failureMessage: string | null;
  failureSource: string | null;
  at: string;
};

let lastTrace: EditorUploadFlowTrace | null = null;

export function getLastEditorUploadFlowTrace(): EditorUploadFlowTrace | null {
  return lastTrace;
}

export function resetEditorUploadFlowTraceForTests(): void {
  lastTrace = null;
}

export function isEditorUploadDevDiagnosticsEnabled(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV !== "production";
}

export function formatEditorUploadFailureUiMessage(input: {
  failureStep: string;
  failureMessage: string;
  productionMessage: string;
}): string {
  if (!isEditorUploadDevDiagnosticsEnabled()) {
    return input.productionMessage;
  }
  return `Upload mislukt bij stap: ${input.failureStep}\nReden: ${input.failureMessage}`;
}

export type EditorUploadFailedLogInput = {
  failureStep: string | null;
  failureSource: string | null;
  failureMessage: string | null;
  saveResult?: EditorCanvasSaveResult | EditorWizardPersistResult | null;
  sessionId?: string | null;
  uploadedUrl?: string | null;
  persisted?: boolean;
  storageWarning?: EditorCanvasSaveResult["storageWarning"];
  localStorageAvailable?: boolean;
  documentSizeKb?: number;
};

export function logEditorUploadFailed(input: EditorUploadFailedLogInput): void {
  if (typeof console === "undefined") {
    return;
  }
  console.error("[editor.upload.failed]", {
    failureStep: input.failureStep,
    failureSource: input.failureSource,
    failureMessage: input.failureMessage,
    saveResult: input.saveResult ?? null,
    sessionId: input.sessionId ?? null,
    uploadedUrl: input.uploadedUrl ?? null,
    persisted: input.persisted ?? null,
    storageWarning: input.storageWarning ?? null,
    localStorageAvailable: input.localStorageAvailable ?? null,
    documentSizeKb: input.documentSizeKb ?? null,
  });
}

export function traceEditorUploadFlow(
  patch: Partial<EditorUploadFlowTrace> & {
    failureStep?: string | null;
    failureMessage?: string | null;
    failureSource?: string | null;
  }
): EditorUploadFlowTrace {
  const next: EditorUploadFlowTrace = {
    uploadStarted: lastTrace?.uploadStarted ?? false,
    uploadCompleted: lastTrace?.uploadCompleted ?? false,
    uploadedUrl: lastTrace?.uploadedUrl ?? null,
    referenceCreated: lastTrace?.referenceCreated ?? false,
    roleAnalysisCompleted: lastTrace?.roleAnalysisCompleted ?? false,
    bootstrapCompleted: lastTrace?.bootstrapCompleted ?? false,
    documentCreated: lastTrace?.documentCreated ?? false,
    documentSaved: lastTrace?.documentSaved ?? false,
    sessionCreated: lastTrace?.sessionCreated ?? false,
    editorOpened: lastTrace?.editorOpened ?? false,
    failureStep: lastTrace?.failureStep ?? null,
    failureMessage: lastTrace?.failureMessage ?? null,
    failureSource: lastTrace?.failureSource ?? null,
    at: new Date().toISOString(),
    ...patch,
  };
  lastTrace = next;
  if (isEditorUploadDevDiagnosticsEnabled() && (patch.failureStep || patch.editorOpened)) {
    // eslint-disable-next-line no-console
    console.info("[editor.upload.flow]", next);
  }
  return next;
}

export function traceEditorUploadFailure(input: {
  step: string;
  source: string;
  error: unknown;
  log?: Omit<EditorUploadFailedLogInput, "failureStep" | "failureSource" | "failureMessage">;
}): EditorUploadFlowTrace {
  const message =
    input.error instanceof Error
      ? input.error.message
      : typeof input.error === "string"
        ? input.error
        : "unknown_error";
  logEditorUploadFailed({
    failureStep: input.step,
    failureSource: input.source,
    failureMessage: message,
    ...input.log,
  });
  return traceEditorUploadFlow({
    failureStep: input.step,
    failureSource: input.source,
    failureMessage: message,
  });
}
