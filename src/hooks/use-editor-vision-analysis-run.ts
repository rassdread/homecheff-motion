"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { documentNeedsDetectionBootstrap } from "@/lib/editor-detection-bootstrap";
import {
  buildVisionAnalysisLifecycleDebug,
  editorVisionAnalysisRunKey,
  isEditorVisionAnalysisInProgress,
  isEditorVisionAnalysisTerminal,
  resolveEditorVisionAnalysisPending,
  runMetaIncludesRtdetr,
  type EditorVisionAnalysisLifecycleDebug,
  type VisionAnalysisRunTrigger,
} from "@/lib/editor-vision-analysis-run";
import {
  documentHasRichVisionAnalysis,
  isMeaningfulVisionHierarchy,
  isWeakBackgroundOnlyAnalysis,
  resolveDisplayVisionHierarchy,
} from "@/lib/editor-vision-v6-stability";
import { useEditorVisionAnalysisProgress } from "@/hooks/use-editor-vision-analysis-progress";
import { useVisionRunMeta } from "@/hooks/use-vision-run-meta";
import { getLastVisionRunGuardBlockReason } from "@/lib/editor-vision-analysis-run-guard";
import {
  buildEditorAnalysisBootstrapKey,
  isEditorAutoStartCompleted,
  shouldAttemptEditorAutoStart,
  startEditorImageAnalysis,
  type StartEditorImageAnalysisInput,
} from "@/lib/start-editor-image-analysis";
import { shouldAutoStartWatchdogRetry } from "@/lib/editor-vision-auto-start-schedule";
import type { EditorVisionAnalysisRunMeta } from "@/lib/editor-vision-analysis-run";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Options = {
  autoBootstrap?: boolean;
  imageVisible?: boolean;
  mountTrigger?: VisionAnalysisRunTrigger;
};

const AUTO_START_WATCHDOG_MS = 3000;

export function useEditorVisionAnalysisRun(
  document: EditorCanvasDocument,
  onDocumentChange: (document: EditorCanvasDocument) => void,
  options: Options = {}
) {
  const { autoBootstrap = true, imageVisible = false, mountTrigger = "workspace-mount" } = options;
  const [pendingDisplayDocument, setPendingDisplayDocument] = useState<EditorCanvasDocument | null>(
    null
  );
  const [localRunMeta, setLocalRunMeta] = useState<EditorVisionAnalysisRunMeta | null>(null);
  const [acceptFailed, setAcceptFailed] = useState(false);
  const [acceptedResult, setAcceptedResult] = useState<boolean | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [manualForceAnalyze, setManualForceAnalyze] = useState(false);
  const [autoStartAttempted, setAutoStartAttempted] = useState(false);
  const [autoStartRetryAttempted, setAutoStartRetryAttempted] = useState(false);
  const autoStartRetryUsedRef = useRef(false);
  const runMetaRef = useRef<EditorVisionAnalysisRunMeta | null>(null);
  const autoStartAttemptedRef = useRef(false);
  const documentRef = useRef(document);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  const scopeKey = useMemo(
    () => editorVisionAnalysisRunKey(document),
    [document.isolationScope?.analysisId, document.sessionId, document.sourceAssetId, document.backgroundUrl]
  );
  const storeRunMeta = useVisionRunMeta(scopeKey);

  const runMeta =
    localRunMeta ??
    storeRunMeta ??
    document.visionAnalysisRun ??
    pendingDisplayDocument?.visionAnalysisRun ??
    null;

  useEffect(() => {
    runMetaRef.current = runMeta;
    autoStartAttemptedRef.current = autoStartAttempted;
  }, [runMeta, autoStartAttempted]);

  const displayDocument = pendingDisplayDocument ?? document;

  const displayHierarchy = useMemo(
    () => resolveDisplayVisionHierarchy(displayDocument, runMeta),
    [displayDocument, runMeta]
  );

  const hasRichVisionAnalysis = documentHasRichVisionAnalysis(document);
  const isWeakBackgroundOnly = isWeakBackgroundOnlyAnalysis(document);
  const needsBootstrap =
    documentNeedsDetectionBootstrap(document) &&
    !(isEditorVisionAnalysisTerminal(runMeta?.status) && hasRichVisionAnalysis) &&
    !acceptFailed;

  const bootstrapKey = buildEditorAnalysisBootstrapKey(document);
  const autoStartBlockedReason = useMemo(() => {
    const attempt = shouldAttemptEditorAutoStart({
      bootstrapKey,
      needsBootstrap,
      imageVisible,
      autoBootstrap,
      acceptFailed,
    });
    return attempt.blockedReason;
  }, [
    bootstrapKey,
    needsBootstrap,
    imageVisible,
    autoBootstrap,
    acceptFailed,
    autoStartAttempted,
  ]);

  const autoStartGuardBlockedReason = getLastVisionRunGuardBlockReason();

  const lifecycleDebug = useMemo<EditorVisionAnalysisLifecycleDebug>(
    () =>
      buildVisionAnalysisLifecycleDebug(displayDocument, runMeta, {
        acceptedResult,
        displayHierarchyCount: displayHierarchy.length,
        rejectionReason,
        autoStartAttempted,
        autoStartBlockedReason,
        autoStartGuardBlockedReason,
        autoStartRetryAttempted,
        subscribedScopeKey: scopeKey,
        needsBootstrap,
        hasRichVisionAnalysis,
        isWeakBackgroundOnly,
        manualForceAnalyze,
      }),
    [
      displayDocument,
      runMeta,
      acceptedResult,
      displayHierarchy.length,
      rejectionReason,
      autoStartAttempted,
      autoStartBlockedReason,
      autoStartGuardBlockedReason,
      autoStartRetryAttempted,
      scopeKey,
      needsBootstrap,
      hasRichVisionAnalysis,
      isWeakBackgroundOnly,
      manualForceAnalyze,
    ]
  );

  const hasRichHierarchy = isMeaningfulVisionHierarchy(displayHierarchy, displayDocument.visionV6Meta);

  const hasActiveStoreRun = Boolean(
    (storeRunMeta ?? localRunMeta) &&
      isEditorVisionAnalysisInProgress((storeRunMeta ?? localRunMeta)!.status)
  );

  const analysisInProgress =
    runMeta?.status === "detecting" ||
    runMeta?.status === "partial" ||
    runMeta?.status === "finalizing";

  const isPartialResult =
    Boolean(runMeta?.isPartial) &&
    (runMeta?.status === "partial" || runMeta?.status === "finalizing");

  const analysisPending = resolveEditorVisionAnalysisPending({
    needsBootstrap,
    acceptFailed,
    runMeta,
    hasActiveStoreRun,
    pendingDisplayDocument,
    displayHierarchyLength: displayHierarchy.length,
  });

  const analysisComplete =
    runMeta?.status === "complete" ||
    document.visionAnalysisRun?.status === "complete" ||
    (!needsBootstrap && hasRichVisionAnalysis);

  const showEmptyState =
    !analysisPending &&
    (analysisComplete || acceptFailed || runMeta?.status === "failed") &&
    displayHierarchy.length === 0;

  const analysisProgress = useEditorVisionAnalysisProgress({
    runMeta,
    cachedResult: Boolean(runMeta?.cachedResult),
    analysisPending,
    analysisInProgress,
    sessionId: document.sessionId,
  });

  const buildCallbacks = useCallback(
    (): Pick<
      StartEditorImageAnalysisInput,
      "onDocumentChange" | "onStatusChange" | "onProgress" | "onRunMetaPreview" | "onAcceptStateChange"
    > => ({
      onDocumentChange,
      onStatusChange: (meta) => setLocalRunMeta(meta),
      onProgress: (partial) => setPendingDisplayDocument(partial),
      onRunMetaPreview: (meta) => setLocalRunMeta(meta),
      onAcceptStateChange: ({ acceptFailed: failed, acceptedResult: accepted, rejectionReason: reason }) => {
        setAcceptFailed(failed);
        setAcceptedResult(accepted);
        setRejectionReason(reason);
      },
    }),
    [onDocumentChange]
  );

  const startAnalysis = useCallback(
    async (
      sourceDocument?: EditorCanvasDocument,
      runOptions?: {
        force?: boolean;
        trigger?: VisionAnalysisRunTrigger;
        preserveUserEdits?: boolean;
        retry?: boolean;
      }
    ) => {
      const doc = sourceDocument ?? documentRef.current;
      const force = Boolean(runOptions?.force);
      const preserveUserEdits = runOptions?.preserveUserEdits ?? !force;
      const trigger: VisionAnalysisRunTrigger =
        runOptions?.trigger ?? (force ? "manual-reanalyze" : "auto-start");

      if (!force && !runOptions?.retry) {
        setAutoStartAttempted(true);
      }

      if (force) {
        setManualForceAnalyze(true);
      }

      try {
        const result = await startEditorImageAnalysis({
          document: doc,
          trigger,
          force,
          preserveUserEdits,
          retry: runOptions?.retry,
          ...buildCallbacks(),
        });

        if (result.accepted) {
          setPendingDisplayDocument(null);
          setLocalRunMeta(null);
        }

        return result.accepted;
      } finally {
        if (force) {
          setManualForceAnalyze(false);
        }
      }
    },
    [buildCallbacks]
  );

  useEffect(() => {
    if (!document.backgroundUrl?.trim()) {
      return;
    }
    const attempt = shouldAttemptEditorAutoStart({
      bootstrapKey: buildEditorAnalysisBootstrapKey(document),
      needsBootstrap,
      imageVisible,
      autoBootstrap,
      acceptFailed,
    });
    if (!attempt.attempt) {
      return;
    }
    queueMicrotask(() => {
      void startAnalysis(undefined, {
        trigger: mountTrigger,
        force: false,
        preserveUserEdits: true,
      });
    });
  }, [
    autoBootstrap,
    imageVisible,
    document.sessionId,
    document.backgroundUrl,
    document.isolationScope?.analysisId,
    needsBootstrap,
    acceptFailed,
    startAnalysis,
    mountTrigger,
  ]);

  useEffect(() => {
    if (!autoBootstrap || !imageVisible) {
      return;
    }
    const key = buildEditorAnalysisBootstrapKey(document);
    const timer = window.setTimeout(() => {
      const meta = runMetaRef.current;
      if (
        !shouldAutoStartWatchdogRetry({
          autoStartAttempted: autoStartAttemptedRef.current,
          autoStartRetryUsed: autoStartRetryUsedRef.current,
          bootstrapCompletedKey: isEditorAutoStartCompleted(key) ? key : null,
          bootstrapKey: key,
          runHasRtdetr: runMetaIncludesRtdetr(meta),
          runStatus: meta?.status,
        })
      ) {
        return;
      }
      autoStartRetryUsedRef.current = true;
      setAutoStartRetryAttempted(true);
      void startAnalysis(undefined, {
        trigger: "auto-start-retry",
        force: false,
        preserveUserEdits: true,
        retry: true,
      });
    }, AUTO_START_WATCHDOG_MS);
    return () => window.clearTimeout(timer);
  }, [
    autoBootstrap,
    imageVisible,
    document.sessionId,
    document.backgroundUrl,
    document.isolationScope?.analysisId,
    autoStartAttempted,
    startAnalysis,
  ]);

  return {
    runMeta,
    displayHierarchy,
    displayDocument,
    hasRichHierarchy,
    analysisPending,
    analysisInProgress,
    analysisComplete,
    isPartialResult,
    showEmptyState,
    acceptFailed,
    lifecycleDebug,
    runAnalysis: startAnalysis,
    startEditorImageAnalysis: startAnalysis,
    cachedResult: Boolean(runMeta?.cachedResult),
    needsDeepAnalysis: Boolean(runMeta?.needsDeepAnalysis),
    analysisProgress,
    needsBootstrap,
    hasRichVisionAnalysis,
    isWeakBackgroundOnly,
  };
}
