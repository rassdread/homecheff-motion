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
  resolveEditorVisionAnalysisDepth,
  resolveVisionAnalysisAcceptance,
  type EditorVisionAnalysisDepth,
} from "@/lib/editor-vision-analysis-run";
import {
  buildEditorVisionAnalysisCostLogFromDocument,
  buildPremiumAnalysisBillingLog,
  normalizeEditorVisionAnalysisTier,
  resolvePremiumVisionAnalysisGate,
  stampPremiumAnalysisBilling,
} from "@/lib/editor-vision-analysis-tier";
import {
  authorizePremiumVisionCreditsClient,
  capturePremiumVisionCreditsClient,
  refundPremiumVisionCreditsClient,
} from "@/lib/editor-premium-vision-credits-client";
import {
  PREMIUM_VISION_ANALYSIS_CREDITS,
  type PremiumVisionCreditSession,
} from "@/lib/editor-premium-vision-credits";
import {
  resolveEditorAssetId,
  resolveEditorProjectId,
} from "@/lib/editor-project-isolation";
import {
  guardVisionDocumentWrite,
  type VisionAnalysisRunTrigger,
  type VisionDocumentWriteSource,
} from "@/lib/editor-vision-analysis-run-guard";
import { isEditorAutoAnalysisEnabled } from "@/lib/editor-auto-analysis-flag";
import {
  analysisTierFromDocument,
  logEditorPremiumAnalysisFlow,
  mergedPartsCountFromDocument,
} from "@/lib/editor-premium-analysis-flow";
import {
  clearStickyVisionHierarchyForSession,
  documentHasCompletedFullVisionAnalysis,
  documentHasRichVisionAnalysis,
} from "@/lib/editor-vision-v6-stability";
import type { EditorVisionAnalysisRunMeta } from "@/lib/editor-vision-analysis-run";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type StartEditorImageAnalysisInput = {
  document: EditorCanvasDocument;
  trigger: VisionAnalysisRunTrigger;
  force?: boolean;
  preserveUserEdits?: boolean;
  retry?: boolean;
  /** basic = RT-DETR/local only; premium = Vision Parts API + Style DNA. */
  analysisDepth?: EditorVisionAnalysisDepth;
  isAdmin?: boolean;
  userId?: string | null;
  /** Available Studio credits — required for premium gate before provider calls. */
  creditsAvailable?: number;
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
  /** Set when premium analysis credits were captured — used for wizard refund compensation. */
  premiumCreditSession?: PremiumVisionCreditSession | null;
};

export type EditorAnalysisEntrypointLog = {
  trigger: VisionAnalysisRunTrigger;
  force: boolean;
  preserveUserEdits: boolean;
  analysisDepth: EditorVisionAnalysisDepth;
  analysisId: string | null;
  scopeKey: string;
  willExecute: boolean;
  blockedReason: string | null;
  joiningExisting: boolean;
};

const autoStartCompletedKeys = new Set<string>();
const autoStartInFlightKeys = new Set<string>();

async function refundPremiumCreditsIfNeeded(session: PremiumVisionCreditSession | null): Promise<void> {
  if (!session) {
    return;
  }
  await refundPremiumVisionCreditsClient(session);
}

async function capturePremiumCreditsIfNeeded(
  session: PremiumVisionCreditSession | null
): Promise<PremiumVisionCreditSession | null> {
  if (!session) {
    return null;
  }
  await capturePremiumVisionCreditsClient(session);
  return {
    ...session,
    creditsCharged: session.adminBypass ? 0 : session.reservation.requiredCredits,
    creditStatus: session.adminBypass ? "admin_free" : "charged",
  };
}

function stampPremiumBillingOnDocument(
  document: EditorCanvasDocument,
  session: PremiumVisionCreditSession
): EditorCanvasDocument {
  const billing = buildPremiumAnalysisBillingLog({
    creditsRequired: PREMIUM_VISION_ANALYSIS_CREDITS,
    creditsCharged: session.adminBypass ? 0 : session.reservation.requiredCredits,
    creditStatus: session.adminBypass ? "admin_free" : session.creditStatus,
    creditTransactionId: session.reservation.reservationId,
    status: "complete",
    startedAt: session.startedAt,
    completedAt: new Date().toISOString(),
  });
  return stampPremiumAnalysisBilling(document, billing);
}

export function buildEditorAnalysisBootstrapKey(document: EditorCanvasDocument): string {
  return `${document.sessionId}::${document.backgroundUrl}::${document.isolationScope?.analysisId ?? "pending"}`;
}

/** Stable per-image key — analysisId changes during scope stamp must not re-trigger auto-start. */
export function buildEditorAutoStartStableKey(document: EditorCanvasDocument): string {
  return `${document.sessionId}::${document.backgroundUrl?.trim() ?? ""}`;
}

export function resetEditorAutoStartTrackingForTests(): void {
  autoStartCompletedKeys.clear();
  autoStartInFlightKeys.clear();
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
  stableKey: string;
  needsBootstrap: boolean;
  imageVisible: boolean;
  autoBootstrap: boolean;
  acceptFailed: boolean;
  mounted?: boolean;
}): { attempt: boolean; blockedReason: string | null } {
  if (input.mounted === false) {
    return { attempt: false, blockedReason: "not_mounted" };
  }
  if (!isEditorAutoAnalysisEnabled()) {
    return { attempt: false, blockedReason: "auto_analysis_disabled" };
  }
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
  if (autoStartInFlightKeys.has(input.stableKey)) {
    return { attempt: false, blockedReason: "auto_start_in_flight" };
  }
  if (autoStartCompletedKeys.has(input.stableKey)) {
    return { attempt: false, blockedReason: "bootstrap_scope_already_run" };
  }
  return { attempt: true, blockedReason: null };
}

export function isEditorAutoStartInFlight(stableKey: string): boolean {
  return autoStartInFlightKeys.has(stableKey);
}

export function markEditorAutoStartInFlight(stableKey: string): void {
  autoStartInFlightKeys.add(stableKey);
}

export function clearEditorAutoStartInFlight(stableKey: string): void {
  autoStartInFlightKeys.delete(stableKey);
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
    !documentHasCompletedFullVisionAnalysis(prepared)
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
  const analysisDepth = resolveEditorVisionAnalysisDepth({
    analysisDepth: input.analysisDepth,
    trigger: input.trigger,
  });
  const analysisTier = normalizeEditorVisionAnalysisTier(analysisDepth);
  const isPremiumRun = analysisTier === "premium";
  const analysisTierBefore = analysisTierFromDocument(input.document);
  const joiningExisting =
    !force && !retry && isEditorVisionAnalysisInFlightForAsset(input.document);

  let blockedReason: string | null = null;
  if (!input.document.backgroundUrl?.trim()) {
    blockedReason = "missing_background_url";
  }

  let gateAllowed: boolean | undefined;
  if (isPremiumRun) {
    logEditorPremiumAnalysisFlow({
      step: "entrypoint",
      analysisDepth,
      analysisTierBefore,
      trigger: input.trigger,
      sessionId: input.document.sessionId,
      analysisId: input.document.isolationScope?.analysisId ?? null,
      loadingState: "running",
    });
  }

  if (!blockedReason && isPremiumRun) {
    const gate = resolvePremiumVisionAnalysisGate({
      isAdmin: input.isAdmin,
      creditsAvailable: input.creditsAvailable,
    });
    gateAllowed = gate.allowed;
    logEditorPremiumAnalysisFlow({
      step: "gate",
      analysisDepth,
      gateAllowed,
      analysisTierBefore,
      trigger: input.trigger,
      sessionId: input.document.sessionId,
      failureMessage: gate.allowed ? null : gate.reason,
    });
    if (!gate.allowed) {
      blockedReason = "insufficient_credits";
    }
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
    analysisDepth,
    analysisId,
    scopeKey,
    willExecute,
    blockedReason,
    joiningExisting,
  });

  if (!willExecute) {
    if (isPremiumRun) {
      logEditorPremiumAnalysisFlow({
        step: "blocked",
        analysisDepth,
        gateAllowed,
        analysisTierBefore,
        trigger: input.trigger,
        sessionId: input.document.sessionId,
        loadingState: "failed",
        failureMessage: blockedReason,
      });
    }
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

  const stableKey = buildEditorAutoStartStableKey(prepared);
  const isAutoTrigger =
    !force &&
    !retry &&
    (input.trigger === "auto-start" ||
      input.trigger === "auto-start-retry" ||
      input.trigger === "workspace-mount" ||
      input.trigger === "instruction-workspace-mount" ||
      input.trigger === "image-visible");

  if (force) {
    clearEditorAutoStartCompleted(stableKey);
    clearEditorAutoStartInFlight(stableKey);
    if (isPremiumRun) {
      clearStickyVisionHierarchyForSession(prepared.sessionId);
    }
  }

  if (isPremiumRun) {
    logEditorPremiumAnalysisFlow({
      step: "prepared",
      analysisDepth,
      gateAllowed,
      analysisTierBefore,
      analysisTierAfter: analysisTierFromDocument(prepared),
      trigger: input.trigger,
      sessionId: prepared.sessionId,
      analysisId,
      loadingState: "running",
    });
  }

  if (isAutoTrigger && autoStartInFlightKeys.has(stableKey)) {
    return {
      accepted: null,
      preparedDocument: prepared,
      scopeKey,
      analysisId,
      willExecute: false,
      blockedReason: "auto_start_in_flight",
      joiningExisting: true,
    };
  }

  if (isAutoTrigger) {
    markEditorAutoStartInFlight(stableKey);
  }

  if (prepared !== input.document) {
    const scopeAlreadyStamped =
      !force &&
      prepared.isolationScope?.analysisId != null &&
      prepared.isolationScope.analysisId === input.document.isolationScope?.analysisId;
    guardedWrite(
      force ? "reanalyze-reset" : scopeAlreadyStamped ? "vision-reset" : "scope-stamp",
      input.document,
      prepared,
      input.onDocumentChange,
      { force }
    );
  }

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
  let premiumCreditSession: PremiumVisionCreditSession | null = null;

  if (isPremiumRun) {
    const auth = await authorizePremiumVisionCreditsClient({
      projectId: resolveEditorProjectId(prepared),
      sessionId: prepared.sessionId,
      analysisId,
      analysisRunId: prepared.visionAnalysisRun?.runId ?? null,
      assetId: resolveEditorAssetId(prepared),
    });
    if (!auth.ok) {
      logEditorPremiumAnalysisFlow({
        step: "blocked",
        analysisDepth,
        gateAllowed: false,
        analysisTierBefore,
        trigger: input.trigger,
        sessionId: prepared.sessionId,
        loadingState: "failed",
        failureMessage: auth.code,
      });
      clearEditorAutoStartInFlight(stableKey);
      return {
        accepted: null,
        preparedDocument: prepared,
        scopeKey,
        analysisId,
        willExecute: false,
        blockedReason:
          auth.code === "insufficient_credits" ? "insufficient_credits" : "premium_analysis_gated",
        joiningExisting,
      };
    }
    premiumCreditSession = auth.session;
  }

  try {
    const result = await runEditorVisionAndObjectDetection(prepared, {
      trigger: input.trigger,
      force,
      retry,
      preserveUserEdits,
      analysisDepth,
      onStatusChange: (meta) => {
        input.onStatusChange?.(meta);
        if (isPremiumRun) {
          if (meta.lastStage === "style_dna") {
            logEditorPremiumAnalysisFlow({
              step: "style_dna_completed",
              analysisDepth,
              styleDnaStarted: true,
              styleDnaCompleted: true,
              sessionId: prepared.sessionId,
              analysisId,
              runId: meta.runId,
              loadingState: "running",
            });
          }
          if (meta.lastStage === "vision_parts_api") {
            logEditorPremiumAnalysisFlow({
              step: "vision_parts_started",
              analysisDepth,
              visionPartsStarted: true,
              sessionId: prepared.sessionId,
              analysisId,
              runId: meta.runId,
              loadingState: "running",
            });
          }
        }
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

    if (isPremiumRun) {
      logEditorPremiumAnalysisFlow({
        step: "pipeline_result",
        analysisDepth,
        styleDnaStarted: true,
        visionPartsStarted: Boolean(guardedResult.visionV6Meta?.openAiPartsUsed),
        partsCount: guardedResult.visionV6Meta?.visionPartCount ?? 0,
        mergedAnalysisPartsCount: mergedPartsCountFromDocument(guardedResult),
        analysisTierAfter: analysisTierFromDocument(guardedResult),
        sessionId: prepared.sessionId,
        analysisId,
        runId: guardedResult.visionAnalysisRun?.runId ?? null,
        loadingState: "running",
      });
    }

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
      const premiumTierSaved =
        !isPremiumRun || finalAccepted.visionV6Meta?.analysisTier === "premium";
      if (isPremiumRun && !premiumTierSaved) {
        logEditorPremiumAnalysisFlow({
          step: "failed",
          analysisDepth,
          analysisTierBefore,
          analysisTierAfter: analysisTierFromDocument(finalAccepted),
          mergedAnalysisPartsCount: mergedPartsCountFromDocument(finalAccepted),
          savePersisted: Boolean(stored?.visionV6Meta?.analysisTier === "premium"),
          loadingState: "failed",
          failureMessage: "premium_tier_not_stamped",
          sessionId: prepared.sessionId,
          analysisId,
          runId: finalAccepted.visionAnalysisRun?.runId ?? null,
        });
        clearEditorAutoStartCompleted(stableKey);
        clearEditorAutoStartInFlight(stableKey);
        input.onAcceptStateChange?.({
          acceptFailed: true,
          acceptedResult: false,
          rejectionReason: "premium_tier_not_stamped",
        });
        input.onRunMetaPreview?.(null);
        await refundPremiumCreditsIfNeeded(premiumCreditSession);
        return {
          accepted: null,
          preparedDocument: prepared,
          scopeKey,
          analysisId,
          willExecute: true,
          blockedReason: "premium_tier_not_stamped",
          joiningExisting,
        };
      }

      markEditorOpenTiming("finalReadyAt");
      recordEditorOpenStage("ready");
      let committedDocument = finalAccepted;
      if (isPremiumRun && premiumCreditSession) {
        const captured = await capturePremiumCreditsIfNeeded(premiumCreditSession);
        if (captured) {
          committedDocument = stampPremiumBillingOnDocument(finalAccepted, captured);
        }
      }
      guardedWrite("onDocumentChange", prepared, committedDocument, input.onDocumentChange, {
        runId: committedDocument.visionAnalysisRun?.runId,
        force,
      });
      buildEditorVisionAnalysisCostLogFromDocument({
        document: committedDocument,
        tier: analysisTier,
        trigger: input.trigger,
        userId: input.userId,
        runId: committedDocument.visionAnalysisRun?.runId,
        isAdminTest: Boolean(input.isAdmin && isPremiumRun),
      });
      markEditorAutoStartCompleted(stableKey);
      clearEditorAutoStartInFlight(stableKey);
      input.onAcceptStateChange?.({
        acceptFailed: false,
        acceptedResult: true,
        rejectionReason: lenient ? "lenient_scope_accept" : null,
      });
      input.onRunMetaPreview?.(null);
      if (isPremiumRun) {
        logEditorPremiumAnalysisFlow({
          step: "complete",
          analysisDepth,
          gateAllowed,
          styleDnaCompleted: true,
          visionPartsCompleted: Boolean(committedDocument.visionV6Meta?.openAiPartsUsed),
          partsCount: committedDocument.visionV6Meta?.visionPartCount ?? 0,
          mergedAnalysisPartsCount: mergedPartsCountFromDocument(committedDocument),
          analysisTierBefore,
          analysisTierAfter: analysisTierFromDocument(committedDocument),
          savePersisted: stored?.visionV6Meta?.analysisTier === "premium",
          uiDocumentUpdated: true,
          loadingState: "done",
          sessionId: prepared.sessionId,
          analysisId,
          runId: committedDocument.visionAnalysisRun?.runId ?? null,
        });
      }
      return {
        accepted: committedDocument,
        preparedDocument: prepared,
        scopeKey,
        analysisId,
        willExecute: true,
        blockedReason: null,
        joiningExisting,
        premiumCreditSession:
          isPremiumRun && premiumCreditSession?.creditStatus === "charged"
            ? premiumCreditSession
            : null,
      };
    }

    if (!finalAccepted) {
      const richEnoughToForce =
        documentHasRichVisionAnalysis(guardedResult) ||
        (Boolean(guardedResult.visionV6Meta?.openAiPartsUsed) &&
          ((guardedResult.visionV6Meta?.mergedAnalysisParts?.length ?? 0) >= 2 ||
            (guardedResult.visionV6Meta?.visionPartCount ?? 0) >= 4));
      if (richEnoughToForce) {
        let forced = guardVisionDocumentWrite("acceptance", pendingBaseline, guardedResult, {
          runId: guardedResult.visionAnalysisRun?.runId,
          force: true,
        }).document;
        guardedWrite("onDocumentChange", pendingBaseline, forced, input.onDocumentChange, {
          runId: forced.visionAnalysisRun?.runId,
          force: true,
        });
        buildEditorVisionAnalysisCostLogFromDocument({
          document: forced,
          tier: analysisTier,
          trigger: input.trigger,
          userId: input.userId,
          runId: forced.visionAnalysisRun?.runId,
          isAdminTest: Boolean(input.isAdmin && analysisTier === "premium"),
        });
        markEditorAutoStartCompleted(stableKey);
        clearEditorAutoStartInFlight(stableKey);
        input.onAcceptStateChange?.({
          acceptFailed: false,
          acceptedResult: true,
          rejectionReason: rejectionReason
            ? `force_rich_commit:${rejectionReason}`
            : "force_rich_commit",
        });
        input.onRunMetaPreview?.(null);
        if (isPremiumRun && premiumCreditSession) {
          const captured = await capturePremiumCreditsIfNeeded(premiumCreditSession);
          if (captured) {
            forced = stampPremiumBillingOnDocument(forced, captured);
            premiumCreditSession = captured;
          }
        }
        return {
          accepted: forced,
          preparedDocument: prepared,
          scopeKey,
          analysisId,
          willExecute: true,
          blockedReason: null,
          joiningExisting,
          premiumCreditSession:
            isPremiumRun && premiumCreditSession?.creditStatus === "charged"
              ? premiumCreditSession
              : null,
        };
      }
    }

    clearEditorAutoStartCompleted(stableKey);
    clearEditorAutoStartInFlight(stableKey);
    input.onAcceptStateChange?.({
      acceptFailed: true,
      acceptedResult: false,
      rejectionReason,
    });
    if (isPremiumRun) {
      logEditorPremiumAnalysisFlow({
        step: "failed",
        analysisDepth,
        gateAllowed,
        analysisTierBefore,
        analysisTierAfter: analysisTierFromDocument(guardedResult),
        mergedAnalysisPartsCount: mergedPartsCountFromDocument(guardedResult),
        loadingState: "failed",
        failureMessage: rejectionReason ?? "acceptance_rejected",
        sessionId: prepared.sessionId,
        analysisId,
        runId: guardedResult.visionAnalysisRun?.runId ?? null,
      });
    }
    await refundPremiumCreditsIfNeeded(premiumCreditSession);
    return {
      accepted: null,
      preparedDocument: prepared,
      scopeKey,
      analysisId,
      willExecute: true,
      blockedReason: rejectionReason,
      joiningExisting,
    };
  } catch (error) {
    clearEditorAutoStartInFlight(stableKey);
    const failureMessage = error instanceof Error ? error.message : "analysis_failed";
    input.onAcceptStateChange?.({
      acceptFailed: true,
      acceptedResult: false,
      rejectionReason: "analysis_failed",
    });
    if (isPremiumRun) {
      logEditorPremiumAnalysisFlow({
        step: "failed",
        analysisDepth,
        gateAllowed,
        analysisTierBefore,
        loadingState: "failed",
        failureMessage,
        sessionId: prepared.sessionId,
        analysisId,
      });
    }
    await refundPremiumCreditsIfNeeded(premiumCreditSession);
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
