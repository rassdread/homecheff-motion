/**
 * Single entrypoint for editor image vision analysis — auto-start and manual re-analyze
 * must both call startEditorImageAnalysis().
 */

import { documentNeedsDetectionBootstrap } from "@/lib/editor-detection-bootstrap";
import {
  loadEditorCanvasDocument,
  runEditorVisionAndObjectDetection,
} from "@/lib/editor-canvas-session";
import {
  markEditorOpenTiming,
  recordEditorOpenStage,
} from "@/lib/editor-open-timing";
import { resetEditorVisionDerivedState } from "@/lib/editor-analysis-reset";
import {
  ensureEditorAnalysisIsolationScope,
  reanalyzeEditorProjectFromCurrentImage,
} from "@/lib/editor-project-isolation";
import {
  buildEditorVisionRunMetaPreview,
  editorVisionAnalysisRunKey,
  isEditorVisionAnalysisInFlightForAsset,
  resolveVisionAnalysisAcceptance,
} from "@/lib/editor-vision-analysis-run";
import {
  guardVisionDocumentWrite,
  type VisionAnalysisRunTrigger,
  type VisionDocumentWriteSource,
} from "@/lib/editor-vision-analysis-run-guard";
import { documentHasRichVisionAnalysis } from "@/lib/editor-vision-v6-stability";
import type { EditorVisionAnalysisRunMeta } from "@/lib/editor-vision-analysis-run";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type StartEditorImageAnalysisInput = {
  document: EditorCanvasDocument;
  trigger: VisionAnalysisRunTrigger;
  force?: boolean;
  preserveUserEdits?: boolean;
  retry?: boolean;
  onDocumentChange?: (document: EditorCanvasDocument) => void;
  onStatusChange?: (meta: EditorVisionAnalysisRunMeta) => void;
  onProgress?: (document: EditorCanvasDocument) => void;
  onRunMetaPreview?: (meta: EditorVisionAnalysisRunMeta | null) => void;
  onAcceptStateChange?: (input: {
    acceptFailed: boolean;
    acceptedResult: boolean | null;
    rejectionReason: string | null;
  }) => void;
};

export type StartEditorImageAnalysisResult = {
  accepted: EditorCanvasDocument | null;
  preparedDocument: EditorCanvasDocument;
  scopeKey: string;
  analysisId: string | null;
  willExecute: boolean;
  blockedReason: string | null;
  joiningExisting: boolean;
};

export type EditorAnalysisEntrypointLog = {
  trigger: VisionAnalysisRunTrigger;
  force: boolean;
  preserveUserEdits: boolean;
  analysisId: string | null;
  scopeKey: string;
  willExecute: boolean;
  blockedReason: string | null;
  joiningExisting: boolean;
};

const autoStartCompletedKeys = new Set<string>();

export function buildEditorAnalysisBootstrapKey(document: EditorCanvasDocument): string {
  return `${document.sessionId}::${document.backgroundUrl}::${document.isolationScope?.analysisId ?? "pending"}`;
}

export function resetEditorAutoStartTrackingForTests(): void {
  autoStartCompletedKeys.clear();
}

export function markEditorAutoStartCompleted(bootstrapKey: string): void {
  autoStartCompletedKeys.add(bootstrapKey);
}

export function clearEditorAutoStartCompleted(bootstrapKey: string): void {
  autoStartCompletedKeys.delete(bootstrapKey);
}

export function isEditorAutoStartCompleted(bootstrapKey: string): boolean {
  return autoStartCompletedKeys.has(bootstrapKey);
}

export function shouldAttemptEditorAutoStart(input: {
  bootstrapKey: string;
  needsBootstrap: boolean;
  imageVisible: boolean;
  autoBootstrap: boolean;
  acceptFailed: boolean;
}): { attempt: boolean; blockedReason: string | null } {
  if (!input.autoBootstrap) {
    return { attempt: false, blockedReason: "autoBootstrap_disabled" };
  }
  if (!input.imageVisible) {
    return { attempt: false, blockedReason: "image_not_visible" };
  }
  if (input.acceptFailed) {
    return { attempt: false, blockedReason: "accept_failed" };
  }
  if (!input.needsBootstrap) {
    return { attempt: false, blockedReason: "needsBootstrap_false" };
  }
  if (autoStartCompletedKeys.has(input.bootstrapKey)) {
    return { attempt: false, blockedReason: "bootstrap_scope_already_run" };
  }
  return { attempt: true, blockedReason: null };
}

export function prepareDocumentForEditorImageAnalysis(
  document: EditorCanvasDocument,
  options: { force: boolean; preserveUserEdits: boolean }
): EditorCanvasDocument {
  if (options.force || !options.preserveUserEdits) {
    return reanalyzeEditorProjectFromCurrentImage(document);
  }

  let prepared = ensureEditorAnalysisIsolationScope(document);
  if (
    documentNeedsDetectionBootstrap(prepared) &&
    !documentHasRichVisionAnalysis(prepared)
  ) {
    prepared = resetEditorVisionDerivedState(prepared, { preserveInstructionWorkflow: true });
    prepared = ensureEditorAnalysisIsolationScope(prepared);
  }
  return prepared;
}

let lastEntrypointLogForTests: EditorAnalysisEntrypointLog | null = null;

export function getLastEditorAnalysisEntrypointLogForTests(): EditorAnalysisEntrypointLog | null {
  return lastEntrypointLogForTests;
}

export function resetEditorAnalysisEntrypointLogForTests(): void {
  lastEntrypointLogForTests = null;
}

function logAnalysisEntrypoint(log: EditorAnalysisEntrypointLog): void {
  lastEntrypointLogForTests = log;
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("[editor.analysis.entrypoint]", log);
  }
}

function guardedWrite(
  source: VisionDocumentWriteSource,
  current: EditorCanvasDocument,
  incoming: EditorCanvasDocument,
  onDocumentChange: StartEditorImageAnalysisInput["onDocumentChange"],
  options?: { runId?: string | null; force?: boolean }
): EditorCanvasDocument {
  const { document: next } = guardVisionDocumentWrite(source, current, incoming, options);
  onDocumentChange?.(next);
  return next;
}

export async function startEditorImageAnalysis(
  input: StartEditorImageAnalysisInput
): Promise<StartEditorImageAnalysisResult> {
  const force = Boolean(input.force);
  const preserveUserEdits = input.preserveUserEdits ?? !force;
  const retry = Boolean(input.retry);
  const joiningExisting =
    !force && !retry && isEditorVisionAnalysisInFlightForAsset(input.document);

  let blockedReason: string | null = null;
  if (!input.document.backgroundUrl?.trim()) {
    blockedReason = "missing_background_url";
  }

  const prepared = prepareDocumentForEditorImageAnalysis(input.document, {
    force,
    preserveUserEdits,
  });
  const scopeKey = editorVisionAnalysisRunKey(prepared);
  const analysisId = prepared.isolationScope?.analysisId ?? null;
  const willExecute = blockedReason == null;

  logAnalysisEntrypoint({
    trigger: input.trigger,
    force,
    preserveUserEdits,
    analysisId,
    scopeKey,
    willExecute,
    blockedReason,
    joiningExisting,
  });

  if (!willExecute) {
    return {
      accepted: null,
      preparedDocument: prepared,
      scopeKey,
      analysisId,
      willExecute: false,
      blockedReason,
      joiningExisting,
    };
  }

  if (force) {
    clearEditorAutoStartCompleted(buildEditorAnalysisBootstrapKey(prepared));
  }

  if (prepared !== input.document) {
    guardedWrite(
      force ? "reanalyze-reset" : "scope-stamp",
      input.document,
      prepared,
      input.onDocumentChange,
      { force }
    );
  }

  const bootstrapKey = buildEditorAnalysisBootstrapKey(prepared);

  if (!joiningExisting) {
    input.onAcceptStateChange?.({
      acceptFailed: false,
      acceptedResult: null,
      rejectionReason: null,
    });
    input.onRunMetaPreview?.(buildEditorVisionRunMetaPreview(prepared));
  }

  markEditorOpenTiming("analysisStartedAt");
  recordEditorOpenStage("analysis_preparing");

  let latestProvisional: EditorCanvasDocument | null = null;

  try {
    const result = await runEditorVisionAndObjectDetection(prepared, {
      trigger: input.trigger,
      force,
      retry,
      preserveUserEdits,
      onStatusChange: (meta) => {
        input.onStatusChange?.(meta);
        if (meta.lastStage === "provisional" || meta.status === "partial") {
          markEditorOpenTiming("provisionalReadyAt");
          recordEditorOpenStage("provisional_detection");
        }
        if (meta.status === "finalizing" || meta.lastStage === "truth_classifier") {
          recordEditorOpenStage("deep_analysis");
        }
      },
      onProgress: (partial) => {
        if (partial.visionAnalysisRun?.status === "partial") {
          markEditorOpenTiming("provisionalReadyAt");
          recordEditorOpenStage("provisional_detection");
        }
        const baseline = latestProvisional ?? prepared;
        const { document: guarded } = guardVisionDocumentWrite("onProgress", baseline, partial, {
          runId: partial.visionAnalysisRun?.runId,
        });
        latestProvisional = guarded;
        input.onProgress?.(guarded);
      },
    });

    const pendingBaseline = latestProvisional ?? prepared;
    const { document: guardedResult } = guardVisionDocumentWrite(
      "acceptance",
      pendingBaseline,
      result,
      { runId: result.visionAnalysisRun?.runId, force }
    );
    input.onProgress?.(guardedResult);

    const stored = loadEditorCanvasDocument(prepared.sessionId);
    const { accepted, rejectionReason, lenient } = resolveVisionAnalysisAcceptance(
      result,
      prepared,
      stored,
      latestProvisional
    );

    const finalAccepted = accepted
      ? guardVisionDocumentWrite("acceptance", pendingBaseline, accepted, {
          runId: accepted.visionAnalysisRun?.runId,
          force,
        }).document
      : null;

    if (finalAccepted) {
      markEditorOpenTiming("finalReadyAt");
      recordEditorOpenStage("ready");
      guardedWrite("onDocumentChange", prepared, finalAccepted, input.onDocumentChange, {
        runId: finalAccepted.visionAnalysisRun?.runId,
        force,
      });
      markEditorAutoStartCompleted(bootstrapKey);
      input.onAcceptStateChange?.({
        acceptFailed: false,
        acceptedResult: true,
        rejectionReason: lenient ? "lenient_scope_accept" : null,
      });
      input.onRunMetaPreview?.(null);
      return {
        accepted: finalAccepted,
        preparedDocument: prepared,
        scopeKey,
        analysisId,
        willExecute: true,
        blockedReason: null,
        joiningExisting,
      };
    }

    markEditorAutoStartCompleted(bootstrapKey);
    input.onAcceptStateChange?.({
      acceptFailed: true,
      acceptedResult: false,
      rejectionReason,
    });
    return {
      accepted: null,
      preparedDocument: prepared,
      scopeKey,
      analysisId,
      willExecute: true,
      blockedReason: rejectionReason,
      joiningExisting,
    };
  } catch {
    input.onAcceptStateChange?.({
      acceptFailed: true,
      acceptedResult: false,
      rejectionReason: "analysis_failed",
    });
    return {
      accepted: null,
      preparedDocument: prepared,
      scopeKey,
      analysisId,
      willExecute: true,
      blockedReason: "analysis_failed",
      joiningExisting,
    };
  }
}
