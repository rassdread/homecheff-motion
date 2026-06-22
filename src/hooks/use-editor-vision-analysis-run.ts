"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMounted } from "@/hooks/use-mounted";
import { useStudioWalletSummary } from "@/hooks/use-studio-wallet-summary";
import { documentNeedsDetectionBootstrap } from "@/lib/editor-detection-bootstrap";
import {
  buildVisionAnalysisLifecycleDebug,
  buildEditorVisionRunMetaPreview,
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
import { resolveVisionRunMetaForDisplay } from "@/lib/editor-vision-analysis-run-store";
import { getLastVisionRunGuardBlockReason } from "@/lib/editor-vision-analysis-run-guard";
import {
  buildEditorAutoStartStableKey,
  isEditorAutoStartCompleted,
  shouldAttemptEditorAutoStart,
  startEditorImageAnalysis,
  type StartEditorImageAnalysisInput,
} from "@/lib/start-editor-image-analysis";
import {
  normalizeEditorVisionAnalysisTier,
  resolveEditorVisionAnalysisTierFromInput,
  resolvePremiumVisionAnalysisGate,
  type EditorVisionAnalysisDepth,
} from "@/lib/editor-vision-analysis-tier";
import {
  logEditorPremiumAnalysisFlow,
  mergedPartsCountFromDocument,
} from "@/lib/editor-premium-analysis-flow";
import { shouldAutoStartWatchdogRetry } from "@/lib/editor-vision-auto-start-schedule";
import type { EditorVisionAnalysisRunMeta } from "@/lib/editor-vision-analysis-run";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type PremiumAnalysisUiStatus =
  | "idle"
  | "running"
  | "complete"
  | "complete_no_extra_parts"
  | "failed";

function documentsEquivalentForGuard(
  current: EditorCanvasDocument,
  next: EditorCanvasDocument
): boolean {
  return (
    current.sessionId === next.sessionId &&
    current.backgroundUrl === next.backgroundUrl &&
    current.isolationScope?.analysisId === next.isolationScope?.analysisId &&
    current.visionAnalysisRun?.runId === next.visionAnalysisRun?.runId &&
    current.visionAnalysisRun?.status === next.visionAnalysisRun?.status &&
    current.visionV6Meta?.analysisTier === next.visionV6Meta?.analysisTier &&
    (current.visionV6Meta?.mergedAnalysisParts?.length ?? 0) ===
      (next.visionV6Meta?.mergedAnalysisParts?.length ?? 0) &&
    (current.visionHierarchy?.length ?? 0) === (next.visionHierarchy?.length ?? 0) &&
    current.updatedAt === next.updatedAt
  );
}

type Options = {
  autoBootstrap?: boolean;
  imageVisible?: boolean;
  mountTrigger?: VisionAnalysisRunTrigger;
  isAdmin?: boolean;
  userId?: string | null;
};

const AUTO_START_WATCHDOG_MS = 3000;

function progressSnapshotEqual(
  a: EditorVisionAnalysisRunMeta | null | undefined,
  b: EditorVisionAnalysisRunMeta | null | undefined
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.runId === b.runId &&
    a.status === b.status &&
    a.lastStage === b.lastStage &&
    a.analysisId === b.analysisId &&
    a.isPartial === b.isPartial &&
    a.cachedResult === b.cachedResult
  );
}

export function useEditorVisionAnalysisRun(
  document: EditorCanvasDocument,
  onDocumentChange: (document: EditorCanvasDocument) => void,
  options: Options = {}
) {
  const { autoBootstrap = true, imageVisible = false, mountTrigger = "workspace-mount", isAdmin = false, userId = null } = options;
  const mounted = useMounted();
  const wallet = useStudioWalletSummary(Boolean(userId));
  const [pendingDisplayDocument, setPendingDisplayDocument] = useState<EditorCanvasDocument | null>(
    null
  );
  const [localRunMeta, setLocalRunMeta] = useState<EditorVisionAnalysisRunMeta | null>(null);
  const [acceptFailed, setAcceptFailed] = useState(false);
  const [acceptedResult, setAcceptedResult] = useState<boolean | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [manualForceAnalyze, setManualForceAnalyze] = useState(false);
  const [premiumAnalysisActive, setPremiumAnalysisActive] = useState(false);
  const [premiumAnalysisStatus, setPremiumAnalysisStatus] = useState<PremiumAnalysisUiStatus>("idle");
  const [premiumFailureReason, setPremiumFailureReason] = useState<string | null>(null);
  const premiumPartsBaselineRef = useRef(0);
  const [autoStartAttempted, setAutoStartAttempted] = useState(false);
  const [autoStartRetryAttempted, setAutoStartRetryAttempted] = useState(false);
  const autoStartRetryUsedRef = useRef(false);
  const runMetaRef = useRef<EditorVisionAnalysisRunMeta | null>(null);
  const autoStartAttemptedRef = useRef(false);
  const autoStartInitiatedKeyRef = useRef<string | null>(null);
  const autoStartAssetKeyRef = useRef<string | null>(null);
  const documentRef = useRef(document);
  const onDocumentChangeRef = useRef(onDocumentChange);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    onDocumentChangeRef.current = onDocumentChange;
  }, [onDocumentChange]);

  useEffect(() => {
    const assetKey = `${document.sessionId}::${document.backgroundUrl?.trim() ?? ""}`;
    if (autoStartAssetKeyRef.current === assetKey) {
      return;
    }
    autoStartAssetKeyRef.current = assetKey;
    autoStartInitiatedKeyRef.current = null;
    autoStartRetryUsedRef.current = false;
    setAutoStartAttempted(false);
    setAutoStartRetryAttempted(false);
  }, [document.sessionId, document.backgroundUrl]);

  const scopeKey = useMemo(
    () => editorVisionAnalysisRunKey(document),
    [document.isolationScope?.analysisId, document.sessionId, document.sourceAssetId, document.backgroundUrl]
  );
  const storeRunMetaSnapshot = useVisionRunMeta(scopeKey);
  const storeRunMeta = useMemo(
    () =>
      resolveVisionRunMetaForDisplay({
        scopeKey,
        documentRunMeta: storeRunMetaSnapshot ?? document.visionAnalysisRun,
      }),
    [scopeKey, storeRunMetaSnapshot, document.visionAnalysisRun]
  );

  const runMeta =
    localRunMeta ??
    storeRunMeta ??
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

  const autoStartStableKey = buildEditorAutoStartStableKey(document);
  const autoStartBlockedReason = useMemo(() => {
    const attempt = shouldAttemptEditorAutoStart({
      stableKey: autoStartStableKey,
      needsBootstrap,
      imageVisible,
      autoBootstrap,
      acceptFailed,
      mounted,
    });
    return attempt.blockedReason;
  }, [
    autoStartStableKey,
    needsBootstrap,
    imageVisible,
    autoBootstrap,
    acceptFailed,
    mounted,
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

  const analysisTier =
    document.visionV6Meta?.analysisTier ??
    (document.visionV6Meta?.openAiPartsUsed ? "premium" : "basic");

  const analysisInProgress =
    manualForceAnalyze ||
    premiumAnalysisActive ||
    runMeta?.status === "detecting" ||
    runMeta?.status === "partial" ||
    runMeta?.status === "finalizing";

  const isPartialResult =
    analysisTier !== "premium" &&
    premiumAnalysisStatus !== "complete" &&
    premiumAnalysisStatus !== "complete_no_extra_parts" &&
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

  const premiumGate = useMemo(
    () =>
      resolvePremiumVisionAnalysisGate({
        isAdmin,
        creditsAvailable: wallet.availableCredits,
      }),
    [isAdmin, wallet.availableCredits]
  );

  const showPremiumAnalyzeCta =
    analysisTier === "basic" &&
    analysisComplete &&
    !analysisInProgress &&
    !analysisPending;

  const showEmptyState =
    !analysisPending &&
    (analysisComplete || acceptFailed || runMeta?.status === "failed") &&
    displayHierarchy.length === 0;

  const analysisProgress = useEditorVisionAnalysisProgress({
    runMeta,
    cachedResult: Boolean(runMeta?.cachedResult),
    analysisPending,
    analysisInProgress,
    premiumAnalysisActive,
    sessionId: document.sessionId,
    mounted,
  });

  const guardedOnDocumentChange = useCallback((next: EditorCanvasDocument) => {
    const current = documentRef.current;
    if (documentsEquivalentForGuard(current, next)) {
      return;
    }
    onDocumentChangeRef.current(next);
  }, []);

  const buildCallbacks = useCallback(
    (): Pick<
      StartEditorImageAnalysisInput,
      "onDocumentChange" | "onStatusChange" | "onProgress" | "onRunMetaPreview" | "onAcceptStateChange"
    > => ({
      onDocumentChange: guardedOnDocumentChange,
      onStatusChange: (meta) => {
        setLocalRunMeta((previous) => (progressSnapshotEqual(previous, meta) ? previous : meta));
      },
      onProgress: (partial) => {
        setPendingDisplayDocument((previous) => {
          const prevMerged = previous?.visionV6Meta?.mergedAnalysisParts?.length ?? 0;
          const nextMerged = partial.visionV6Meta?.mergedAnalysisParts?.length ?? 0;
          const prevTier = previous?.visionV6Meta?.analysisTier;
          const nextTier = partial.visionV6Meta?.analysisTier;
          if (
            previous &&
            previous.visionAnalysisRun?.runId === partial.visionAnalysisRun?.runId &&
            previous.visionHierarchy?.length === partial.visionHierarchy?.length &&
            prevMerged === nextMerged &&
            prevTier === nextTier &&
            previous.updatedAt === partial.updatedAt
          ) {
            return previous;
          }
          return partial;
        });
      },
      onRunMetaPreview: (meta) => {
        setLocalRunMeta((previous) =>
          progressSnapshotEqual(previous, meta) ? previous : meta ?? null
        );
      },
      onAcceptStateChange: ({ acceptFailed: failed, acceptedResult: accepted, rejectionReason: reason }) => {
        setAcceptFailed(failed);
        setAcceptedResult(accepted);
        setRejectionReason(reason);
      },
    }),
    [guardedOnDocumentChange]
  );

  const startAnalysis = useCallback(
    async (
      sourceDocument?: EditorCanvasDocument,
      runOptions?: {
        force?: boolean;
        trigger?: VisionAnalysisRunTrigger;
        preserveUserEdits?: boolean;
        retry?: boolean;
        analysisDepth?: EditorVisionAnalysisDepth;
      }
    ) => {
      const doc = sourceDocument ?? documentRef.current;
      const force = Boolean(runOptions?.force);
      const preserveUserEdits = runOptions?.preserveUserEdits ?? !force;
      const trigger: VisionAnalysisRunTrigger =
        runOptions?.trigger ?? (force ? "manual-reanalyze" : "auto-start");
      const analysisDepth =
        runOptions?.analysisDepth ??
        resolveEditorVisionAnalysisTierFromInput({ trigger });

      const isPremiumRun =
        normalizeEditorVisionAnalysisTier(analysisDepth) === "premium" ||
        trigger === "deep-analyze";

      if (!force && !runOptions?.retry) {
        setAutoStartAttempted(true);
      }

      if (force || isPremiumRun) {
        setManualForceAnalyze(true);
      }

      if (isPremiumRun) {
        premiumPartsBaselineRef.current = mergedPartsCountFromDocument(doc);
        setPremiumAnalysisActive(true);
        setPremiumAnalysisStatus("running");
        setPremiumFailureReason(null);
        setAcceptFailed(false);
        setLocalRunMeta(buildEditorVisionRunMetaPreview(doc));
        logEditorPremiumAnalysisFlow({
          step: "button_handler",
          analysisDepth: isPremiumRun ? "premium" : analysisDepth,
          analysisTierBefore: doc.visionV6Meta?.analysisTier ?? null,
          trigger,
          sessionId: doc.sessionId,
          loadingState: "running",
        });
      }

      try {
        const result = await startEditorImageAnalysis({
          document: doc,
          trigger,
          force,
          preserveUserEdits,
          retry: runOptions?.retry,
          analysisDepth,
          isAdmin,
          userId,
          creditsAvailable: wallet.availableCredits,
          ...buildCallbacks(),
        });

        if (isPremiumRun) {
          if (!result.willExecute) {
            setPremiumAnalysisStatus("failed");
            setPremiumFailureReason(result.blockedReason ?? "premium_blocked");
          } else if (result.accepted?.visionV6Meta?.analysisTier === "premium") {
            const afterCount = mergedPartsCountFromDocument(result.accepted);
            const gainedParts = afterCount > premiumPartsBaselineRef.current;
            setPremiumAnalysisStatus(gainedParts ? "complete" : "complete_no_extra_parts");
            setPremiumFailureReason(null);
            void wallet.refresh();
          } else if (result.accepted) {
            setPremiumAnalysisStatus("failed");
            setPremiumFailureReason("premium_tier_not_stamped");
          } else {
            setPremiumAnalysisStatus("failed");
            setPremiumFailureReason(result.blockedReason ?? "premium_analysis_failed");
          }
          logEditorPremiumAnalysisFlow({
            step: result.accepted ? "ui_refresh" : "failed",
            analysisDepth: "premium",
            analysisTierAfter: result.accepted?.visionV6Meta?.analysisTier ?? null,
            mergedAnalysisPartsCount: mergedPartsCountFromDocument(result.accepted),
            uiDocumentUpdated: Boolean(result.accepted),
            loadingState: result.accepted ? "done" : "failed",
            failureMessage: result.blockedReason,
            sessionId: doc.sessionId,
          });
        }

        if (result.accepted) {
          setPendingDisplayDocument(null);
          setLocalRunMeta(null);
        }

        return result.accepted;
      } finally {
        if (force || isPremiumRun) {
          setManualForceAnalyze(false);
        }
        if (isPremiumRun) {
          setPremiumAnalysisActive(false);
        }
      }
    },
    [buildCallbacks, isAdmin, userId, wallet.availableCredits, wallet.refresh]
  );

  const runPremiumAnalysis = useCallback(
    (sourceDocument?: EditorCanvasDocument) =>
      startAnalysis(sourceDocument, {
        force: true,
        trigger: "deep-analyze",
        analysisDepth: "premium",
        preserveUserEdits: false,
      }),
    [startAnalysis]
  );

  useEffect(() => {
    if (!mounted || !autoBootstrap || !imageVisible || !document.backgroundUrl?.trim()) {
      return;
    }
    const stableKey = buildEditorAutoStartStableKey(document);
    if (autoStartInitiatedKeyRef.current === stableKey) {
      return;
    }
    const attempt = shouldAttemptEditorAutoStart({
      stableKey,
      needsBootstrap,
      imageVisible,
      autoBootstrap,
      acceptFailed,
      mounted,
    });
    if (!attempt.attempt) {
      return;
    }
    autoStartInitiatedKeyRef.current = stableKey;
    queueMicrotask(() => {
      void startAnalysis(undefined, {
        trigger: mountTrigger,
        force: false,
        preserveUserEdits: true,
        analysisDepth: "basic",
      });
    });
  }, [
    mounted,
    autoBootstrap,
    imageVisible,
    document.sessionId,
    document.backgroundUrl,
    needsBootstrap,
    acceptFailed,
    startAnalysis,
    mountTrigger,
  ]);

  useEffect(() => {
    if (!mounted || !autoBootstrap || !imageVisible) {
      return;
    }
    const stableKey = buildEditorAutoStartStableKey(document);
    const timer = window.setTimeout(() => {
      const meta = runMetaRef.current;
      if (
        !shouldAutoStartWatchdogRetry({
          autoStartAttempted: autoStartAttemptedRef.current,
          autoStartRetryUsed: autoStartRetryUsedRef.current,
          bootstrapCompletedKey: isEditorAutoStartCompleted(stableKey) ? stableKey : null,
          bootstrapKey: stableKey,
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
    mounted,
    autoBootstrap,
    imageVisible,
    document.sessionId,
    document.backgroundUrl,
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
    needsDeepAnalysis: Boolean(
      runMeta?.needsDeepAnalysis || document.visionV6Meta?.analysisTier === "basic"
    ),
    analysisTier,
    showPremiumAnalyzeCta,
    premiumGate,
    analysisProgress,
    needsBootstrap,
    hasRichVisionAnalysis,
    isWeakBackgroundOnly,
    premiumAnalysisStatus,
    premiumFailureReason,
    runPremiumAnalysis,
  };
}
