/**
 * Vision analysis run coordinator — prevents flicker, double-runs, and stale hierarchy flashes.
 */

import {
  buildEditorAnalysisIsolationScope,
  ensureEditorAnalysisIsolationScope,
  editorProjectIsolationCacheKey,
  reanalyzeEditorProjectFromCurrentImage,
  resolveEditorAssetId,
  resolveEditorProjectId,
} from "@/lib/editor-project-isolation";
import {
  normalizeEditorVisionScopeFromDocument,
  normalizeEditorVisionScopeId,
  normalizeEditorVisionScopeUrl,
  scopesAlignForVisionResult,
} from "@/lib/editor-vision-analysis-scope";
import { documentHasRichVisionAnalysis, countVisionHierarchyNodes, isWeakBackgroundOnlyAnalysis, chooseRicherVisionDocument } from "@/lib/editor-vision-v6-stability";
import {
  detectRecentDuplicateAssetStart,
  editorVisionAssetRunKey,
  logVisionAnalysisRunStart,
  recordVisionAssetRunStart,
  resetVisionAnalysisRunGuardForTests,
  setLastVisionRunGuardBlockReason,
  type VisionAnalysisRunTrigger,
} from "@/lib/editor-vision-analysis-run-guard";
import { getRunMeta, resetVisionRunMetaStoreForTests, setRunMeta } from "@/lib/editor-vision-analysis-run-store";
import { traceVisionPipeline, traceVisionStageTransition } from "@/lib/editor-vision-trace";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorVisionAnalysisStatus =
  | "idle"
  | "detecting"
  | "partial"
  | "finalizing"
  | "complete"
  | "failed";

export type EditorVisionAnalysisRunScope = {
  runId: string;
  analysisId: string;
  assetId: string;
  projectId: string;
  backgroundUrl: string;
  sessionId: string;
};

export type EditorVisionAnalysisPipelineStage =
  | "analysis_preparing"
  | "rtdetr"
  | "style_dna"
  | "provisional"
  | "vision_parts_api"
  | "truth_classifier"
  | "bootstrap_complete";

export type EditorVisionAnalysisRunCallbacks = {
  onStatusChange?: (meta: EditorVisionAnalysisRunMeta) => void;
  onStage?: (stage: EditorVisionAnalysisPipelineStage) => void;
  /** Progressive UI — provisional hierarchy before Vision Parts API completes. */
  onProgress?: (document: EditorCanvasDocument) => void;
};

export type EditorVisionAnalysisRunOptions = EditorVisionAnalysisRunCallbacks & {
  trigger?: VisionAnalysisRunTrigger;
  force?: boolean;
  /** Watchdog retry — bypass duplicate-start ignore without destructive reset. */
  retry?: boolean;
  /** When true, runner must not wipe canvas layers before bootstrap. */
  preserveUserEdits?: boolean;
};

export type { VisionAnalysisRunTrigger } from "@/lib/editor-vision-analysis-run-guard";

export type EditorVisionAnalysisRunMeta = {
  runId: string;
  analysisId: string;
  assetId: string;
  projectId: string;
  backgroundUrl: string;
  sessionId: string;
  status: EditorVisionAnalysisStatus;
  startedAt: string;
  completedAt?: string;
  pipelineCalls: number;
  duplicateRunCount: number;
  sourceOrder: EditorVisionAnalysisPipelineStage[];
  isPartial: boolean;
  lastStage?: EditorVisionAnalysisPipelineStage;
  errorMessage?: string;
  lastRejectReason?: string;
  /** Result served from in-memory cache (no network pipeline). */
  cachedResult?: boolean;
  /** Vision Parts API skipped — local detection only; user may deep-analyze. */
  needsDeepAnalysis?: boolean;
  /** Bootstrap safety / fallback diagnostics */
  visionPartsStartedAt?: string;
  visionPartsTimedOut?: boolean;
  bootstrapTimedOut?: boolean;
  fallbackUsed?: boolean;
  terminalStateReason?: string;
  provisionalCount?: number;
  finalCount?: number;
};

export type EditorVisionAnalysisLifecycleDebug = {
  activeRunId: string | null;
  completedRunId: string | null;
  analysisId: string | null;
  assetId: string | null;
  projectId: string | null;
  backgroundUrl: string | null;
  analysisStatus: EditorVisionAnalysisStatus;
  stage: EditorVisionAnalysisPipelineStage | null;
  acceptedResult: boolean | null;
  rejectionReason: string | null;
  /** @deprecated use rejectionReason */
  rejectedResultReason: string | null;
  finalHierarchyCount: number;
  displayHierarchyCount: number;
  detectedCount: number;
  estimatedCount: number;
  creativeCount: number;
  visionPartsStartedAt: string | null;
  visionPartsTimedOut: boolean;
  bootstrapTimedOut: boolean;
  fallbackUsed: boolean;
  terminalStateReason: string | null;
  provisionalCount: number | null;
  finalCount: number | null;
  autoStartAttempted?: boolean;
  autoStartBlockedReason?: string | null;
  needsBootstrap?: boolean;
  hasRichVisionAnalysis?: boolean;
  hierarchyNodeCount?: number;
  isWeakBackgroundOnly?: boolean;
  manualForceAnalyze?: boolean;
  autoStartGuardBlockedReason?: string | null;
  autoStartRetryAttempted?: boolean;
  subscribedScopeKey?: string | null;
};

export type EditorVisionAnalysisResultEnvelope = {
  document: EditorCanvasDocument;
  run: EditorVisionAnalysisRunScope;
  meta: EditorVisionAnalysisRunMeta;
};

const SOURCE_ORDER: EditorVisionAnalysisPipelineStage[] = [
  "analysis_preparing",
  "rtdetr",
  "style_dna",
  "provisional",
  "vision_parts_api",
  "truth_classifier",
  "bootstrap_complete",
];

const inFlightByScopeKey = new Map<string, Promise<EditorVisionAnalysisResultEnvelope>>();
const inFlightByAssetKey = new Map<
  string,
  { scopeKey: string; promise: Promise<EditorVisionAnalysisResultEnvelope> }
>();
const scopeCallbacksByKey = new Map<string, Set<EditorVisionAnalysisRunCallbacks>>();
let duplicateRunCount = 0;

export function isEditorVisionAnalysisInFlightForAsset(
  document: EditorCanvasDocument
): boolean {
  return inFlightByAssetKey.has(editorVisionAssetRunKey(document));
}

function createRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildEditorVisionAnalysisRunScope(
  document: EditorCanvasDocument,
  analysisId?: string
): EditorVisionAnalysisRunScope {
  const resolvedAnalysisId =
    analysisId ??
    document.isolationScope?.analysisId ??
    buildEditorAnalysisIsolationScope(document).analysisId;
  const normalized = normalizeEditorVisionScopeFromDocument(document, resolvedAnalysisId);
  return {
    runId: createRunId(),
    analysisId: normalized.analysisId || resolvedAnalysisId,
    assetId: normalized.assetId,
    projectId: normalized.projectId,
    backgroundUrl: normalized.backgroundUrl,
    sessionId: normalized.sessionId,
  };
}

export function editorVisionAnalysisScopeKey(scope: Pick<EditorVisionAnalysisRunScope, "projectId" | "assetId" | "analysisId">): string {
  return `${scope.projectId}::${scope.assetId}::${scope.analysisId}`;
}

export function editorVisionAnalysisRunKey(document: EditorCanvasDocument): string {
  const analysisId = document.isolationScope?.analysisId?.trim();
  if (!analysisId) {
    return `${resolveEditorProjectId(document)}::${resolveEditorAssetId(document)}::pending`;
  }
  return editorVisionAnalysisScopeKey({
    projectId: resolveEditorProjectId(document),
    assetId: resolveEditorAssetId(document),
    analysisId,
  });
}

function initialRunMeta(run: EditorVisionAnalysisRunScope): EditorVisionAnalysisRunMeta {
  return {
    ...run,
    status: "detecting",
    startedAt: new Date().toISOString(),
    pipelineCalls: 0,
    duplicateRunCount: 0,
    sourceOrder: [],
    isPartial: false,
  };
}

function registerScopeCallbacks(key: string, callbacks?: EditorVisionAnalysisRunCallbacks): void {
  if (!callbacks) {
    return;
  }
  let set = scopeCallbacksByKey.get(key);
  if (!set) {
    set = new Set();
    scopeCallbacksByKey.set(key, set);
  }
  set.add(callbacks);
}

function unregisterScopeCallbacks(key: string, callbacks?: EditorVisionAnalysisRunCallbacks): void {
  if (!callbacks) {
    return;
  }
  scopeCallbacksByKey.get(key)?.delete(callbacks);
}

function notifyScopeCallbacks(key: string, meta: EditorVisionAnalysisRunMeta): void {
  const set = scopeCallbacksByKey.get(key);
  if (!set) {
    return;
  }
  for (const callbacks of set) {
    callbacks.onStatusChange?.(meta);
  }
}

function publishRunMeta(key: string, meta: EditorVisionAnalysisRunMeta): void {
  const previous = getRunMeta(key);
  setRunMeta(key, meta);
  traceVisionStageTransition(previous?.status ?? "none", meta.status, {
    runId: meta.runId,
    analysisId: meta.analysisId,
    analysisStatus: meta.status,
    pipelineStage: meta.lastStage,
    sessionId: meta.sessionId,
  });
  notifyScopeCallbacks(key, meta);
}

export function getEditorVisionAnalysisRunMeta(
  document: EditorCanvasDocument
): EditorVisionAnalysisRunMeta | null {
  const fromDoc = document.visionAnalysisRun;
  if (fromDoc) {
    return fromDoc;
  }
  return getRunMeta(editorVisionAnalysisRunKey(document));
}

export function isEditorVisionAnalysisInProgress(status: EditorVisionAnalysisStatus | undefined): boolean {
  return status === "detecting" || status === "partial" || status === "finalizing";
}

export function isEditorVisionAnalysisLoading(status: EditorVisionAnalysisStatus | undefined): boolean {
  return status === "detecting" || status === "finalizing";
}

export function isEditorVisionAnalysisTerminal(status: EditorVisionAnalysisStatus | undefined): boolean {
  return status === "complete" || status === "failed";
}

export function resolveEditorVisionAnalysisPending(input: {
  needsBootstrap: boolean;
  acceptFailed: boolean;
  runMeta?: EditorVisionAnalysisRunMeta | null;
  hasActiveStoreRun?: boolean;
  /** @deprecated use hasActiveStoreRun */
  inFlightRunMeta?: EditorVisionAnalysisRunMeta | null;
  pendingDisplayDocument?: EditorCanvasDocument | null;
  displayHierarchyLength: number;
}): boolean {
  const runMeta = input.runMeta;
  const hasActiveStoreRun =
    input.hasActiveStoreRun ??
    Boolean(
      input.inFlightRunMeta && isEditorVisionAnalysisInProgress(input.inFlightRunMeta.status)
    );
  if (isEditorVisionAnalysisTerminal(runMeta?.status)) {
    return false;
  }
  if (input.acceptFailed) {
    return false;
  }
  if (
    input.needsBootstrap &&
    !hasActiveStoreRun &&
    input.pendingDisplayDocument == null
  ) {
    return true;
  }
  if (runMeta?.status === "detecting" && input.displayHierarchyLength === 0) {
    return true;
  }
  return false;
}

export function isEditorVisionAnalysisCompleteForDocument(
  document: EditorCanvasDocument,
  meta?: EditorVisionAnalysisRunMeta | null
): boolean {
  const runMeta = meta ?? getEditorVisionAnalysisRunMeta(document);
  if (runMeta?.status === "complete" || document.visionAnalysisRun?.status === "complete") {
    const scope = runMeta ?? document.visionAnalysisRun!;
    return (
      scopesAlignForVisionResult(scope, document) &&
      (documentHasRichVisionAnalysis(document) ||
        countVisionHierarchyNodes(document.visionHierarchy) > 0 ||
        (document.objects?.filter((o) => o.layerType !== "background").length ?? 0) > 0)
    );
  }
  return documentHasRichVisionAnalysis(document) && Boolean(document.isolationScope?.analysisId);
}

export function shouldShowFinalVisionHierarchy(
  document: EditorCanvasDocument,
  meta?: EditorVisionAnalysisRunMeta | null
): boolean {
  const runMeta = meta ?? getEditorVisionAnalysisRunMeta(document);
  if (isEditorVisionAnalysisLoading(runMeta?.status)) {
    return false;
  }
  if (runMeta?.status === "failed") {
    return false;
  }
  if (runMeta?.status === "partial") {
    return false;
  }
  if (runMeta?.status === "complete" || document.visionAnalysisRun?.status === "complete") {
    return true;
  }
  return documentHasRichVisionAnalysis(document);
}

export function shouldShowPartialVisionHierarchy(meta?: EditorVisionAnalysisRunMeta | null): boolean {
  return meta?.status === "partial" && meta.isPartial;
}

export function validateAnalysisResultScope(
  result: EditorVisionAnalysisRunScope,
  expected: EditorVisionAnalysisRunScope
): boolean {
  return (
    result.runId === expected.runId &&
    result.analysisId === expected.analysisId &&
    result.assetId === expected.assetId &&
    result.projectId === expected.projectId &&
    result.backgroundUrl === expected.backgroundUrl &&
    result.sessionId === expected.sessionId
  );
}

export function validateAnalysisResultAgainstDocument(
  result: EditorVisionAnalysisRunScope,
  document: EditorCanvasDocument
): boolean {
  const active = getRunMeta(editorVisionAnalysisScopeKey(result));
  if (active && active.runId !== result.runId) {
    return false;
  }
  return scopesAlignForVisionResult(result, document);
}

let lastRejectReason: string | null = null;

export function getLastVisionAnalysisRejectReasonForTests(): string | null {
  return lastRejectReason;
}

export function buildVisionAnalysisLifecycleDebug(
  document: EditorCanvasDocument,
  meta?: EditorVisionAnalysisRunMeta | null,
    options?: {
    acceptedResult?: boolean | null;
    displayHierarchyCount?: number;
    rejectionReason?: string | null;
    autoStartAttempted?: boolean;
    autoStartBlockedReason?: string | null;
    autoStartGuardBlockedReason?: string | null;
    autoStartRetryAttempted?: boolean;
    subscribedScopeKey?: string | null;
    needsBootstrap?: boolean;
    hasRichVisionAnalysis?: boolean;
    isWeakBackgroundOnly?: boolean;
    manualForceAnalyze?: boolean;
  }
): EditorVisionAnalysisLifecycleDebug {
  const runMeta = meta ?? getEditorVisionAnalysisRunMeta(document);
  const hierarchy = document.visionHierarchy ?? [];
  const rejectionReason =
    options?.rejectionReason ?? runMeta?.lastRejectReason ?? lastRejectReason;

  const detectedSection = hierarchy.find((n) => n.truthSection === "detected");
  const estimatedSection = hierarchy.find((n) => n.truthSection === "estimated");
  const creativeSection = hierarchy.find((n) => n.truthSection === "creative");

  const countSectionParts = (section?: (typeof hierarchy)[number]) => {
    if (!section) {
      return 0;
    }
    return section.children.reduce((sum, child) => sum + (child.children.length || 1), 0);
  };

  return {
    activeRunId:
      runMeta && !isEditorVisionAnalysisTerminal(runMeta.status) ? runMeta.runId : null,
    completedRunId:
      runMeta && isEditorVisionAnalysisTerminal(runMeta.status) ? runMeta.runId : null,
    analysisId: runMeta?.analysisId ?? document.isolationScope?.analysisId ?? null,
    assetId: runMeta?.assetId ?? resolveEditorAssetId(document),
    projectId: runMeta?.projectId ?? resolveEditorProjectId(document),
    backgroundUrl: normalizeEditorVisionScopeUrl(runMeta?.backgroundUrl ?? document.backgroundUrl),
    analysisStatus: runMeta?.status ?? "idle",
    stage: runMeta?.lastStage ?? null,
    acceptedResult: options?.acceptedResult ?? null,
    rejectionReason,
    rejectedResultReason: rejectionReason,
    finalHierarchyCount: countVisionHierarchyNodes(hierarchy),
    displayHierarchyCount: options?.displayHierarchyCount ?? countVisionHierarchyNodes(hierarchy),
    detectedCount: countSectionParts(detectedSection),
    estimatedCount: countSectionParts(estimatedSection),
    creativeCount: countSectionParts(creativeSection),
    visionPartsStartedAt: runMeta?.visionPartsStartedAt ?? null,
    visionPartsTimedOut: Boolean(runMeta?.visionPartsTimedOut),
    bootstrapTimedOut: Boolean(runMeta?.bootstrapTimedOut),
    fallbackUsed: Boolean(runMeta?.fallbackUsed),
    terminalStateReason: runMeta?.terminalStateReason ?? null,
    provisionalCount: runMeta?.provisionalCount ?? null,
    finalCount: runMeta?.finalCount ?? null,
    autoStartAttempted: options?.autoStartAttempted,
    autoStartBlockedReason: options?.autoStartBlockedReason ?? null,
    needsBootstrap: options?.needsBootstrap,
    hasRichVisionAnalysis:
      options?.hasRichVisionAnalysis ?? documentHasRichVisionAnalysis(document),
    hierarchyNodeCount: countVisionHierarchyNodes(hierarchy),
    isWeakBackgroundOnly:
      options?.isWeakBackgroundOnly ?? isWeakBackgroundOnlyAnalysis(document),
    manualForceAnalyze: options?.manualForceAnalyze,
    autoStartGuardBlockedReason: options?.autoStartGuardBlockedReason ?? null,
    autoStartRetryAttempted: options?.autoStartRetryAttempted,
    subscribedScopeKey: options?.subscribedScopeKey ?? null,
  };
}

let staleRejectCount = 0;

export function getStaleAnalysisResultRejectCountForTests(): number {
  return staleRejectCount;
}

export function resetEditorVisionAnalysisRunStateForTests(): void {
  resetVisionRunMetaStoreForTests();
  resetVisionAnalysisRunGuardForTests();
  inFlightByScopeKey.clear();
  inFlightByAssetKey.clear();
  scopeCallbacksByKey.clear();
  staleRejectCount = 0;
  duplicateRunCount = 0;
  lastRejectReason = null;
}

export function logIgnoredStaleAnalysisResult(
  result: EditorVisionAnalysisRunScope,
  expected: EditorVisionAnalysisRunScope | EditorCanvasDocument,
  reason: string
): void {
  staleRejectCount += 1;
  lastRejectReason = reason;
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn("[editor-vision-analysis-run] Ignored stale analysis result", {
      reason,
      result,
      expected,
    });
  }
}

export function acceptAnalysisDocumentResult(
  result: EditorCanvasDocument,
  currentDocument: EditorCanvasDocument
): EditorCanvasDocument | null {
  if (!result.sessionId || result.sessionId !== currentDocument.sessionId) {
    logIgnoredStaleAnalysisResult(
      {
        runId: result.visionAnalysisRun?.runId ?? "unknown",
        analysisId: result.isolationScope?.analysisId ?? "",
        assetId: resolveEditorAssetId(result),
        projectId: resolveEditorProjectId(result),
        backgroundUrl: result.backgroundUrl,
        sessionId: result.sessionId,
      },
      currentDocument,
      "session_mismatch"
    );
    return null;
  }

  if (
    normalizeEditorVisionScopeUrl(result.backgroundUrl) !==
    normalizeEditorVisionScopeUrl(currentDocument.backgroundUrl)
  ) {
    logIgnoredStaleAnalysisResult(
      {
        runId: result.visionAnalysisRun?.runId ?? "unknown",
        analysisId: result.isolationScope?.analysisId ?? "",
        assetId: resolveEditorAssetId(result),
        projectId: resolveEditorProjectId(result),
        backgroundUrl: result.backgroundUrl,
        sessionId: result.sessionId,
      },
      currentDocument,
      "background_url_mismatch"
    );
    return null;
  }

  const envelope = result.visionAnalysisRun;
  const scope: EditorVisionAnalysisRunScope = envelope
    ? {
        runId: envelope.runId,
        analysisId: envelope.analysisId,
        assetId: envelope.assetId,
        projectId: envelope.projectId,
        backgroundUrl: envelope.backgroundUrl,
        sessionId: envelope.sessionId,
      }
    : {
        runId: "legacy",
        analysisId: result.isolationScope?.analysisId ?? "legacy",
        assetId: resolveEditorAssetId(result),
        projectId: resolveEditorProjectId(result),
        backgroundUrl: result.backgroundUrl,
        sessionId: result.sessionId,
      };

  const active = getRunMeta(editorVisionAnalysisScopeKey(scope));
  if (active && envelope && active.runId !== envelope.runId) {
    logIgnoredStaleAnalysisResult(scope, active, "active_run_id_mismatch");
    return null;
  }

  if (!scopesAlignForVisionResult(scope, currentDocument)) {
    logIgnoredStaleAnalysisResult(scope, currentDocument, "scope_mismatch");
    return null;
  }

  lastRejectReason = null;
  return result;
}

export type VisionAnalysisAcceptanceResult = {
  accepted: EditorCanvasDocument | null;
  rejectionReason: string | null;
  lenient: boolean;
};

/** Try strict accept, stored-document accept, then lenient complete-scope accept. */
export function prepareEditorVisionAnalysisRun(
  document: EditorCanvasDocument,
  options?: { force?: boolean }
): EditorCanvasDocument {
  if (options?.force) {
    return reanalyzeEditorProjectFromCurrentImage(document);
  }
  return ensureEditorAnalysisIsolationScope(document);
}

export function resolveVisionAnalysisAcceptance(
  result: EditorCanvasDocument,
  sourceDocument: EditorCanvasDocument,
  storedDocument?: EditorCanvasDocument | null,
  richerBaseline?: EditorCanvasDocument | null
): VisionAnalysisAcceptanceResult {
  const baseline = richerBaseline ?? storedDocument ?? null;
  const mergedResult =
    baseline && baseline !== result
      ? chooseRicherVisionDocument(baseline, result)
      : result;
  const strict = acceptAnalysisDocumentResult(mergedResult, sourceDocument);
  if (strict) {
    return { accepted: strict, rejectionReason: null, lenient: false };
  }
  if (storedDocument) {
    const fromStore = acceptAnalysisDocumentResult(mergedResult, storedDocument);
    if (fromStore) {
      return { accepted: fromStore, rejectionReason: null, lenient: false };
    }
  }
  if (
    mergedResult.visionAnalysisRun?.status === "complete" &&
    scopesAlignForVisionResult(
      {
        analysisId: mergedResult.visionAnalysisRun.analysisId,
        assetId: mergedResult.visionAnalysisRun.assetId,
        projectId: mergedResult.visionAnalysisRun.projectId,
        backgroundUrl: mergedResult.visionAnalysisRun.backgroundUrl,
        sessionId: mergedResult.visionAnalysisRun.sessionId,
      },
      sourceDocument
    )
  ) {
    lastRejectReason = null;
    return { accepted: mergedResult, rejectionReason: null, lenient: true };
  }
  return {
    accepted: null,
    rejectionReason: lastRejectReason,
    lenient: false,
  };
}

export function buildEditorVisionRunMetaPreview(
  document: EditorCanvasDocument
): EditorVisionAnalysisRunMeta | null {
  const analysisId = document.isolationScope?.analysisId?.trim();
  if (!analysisId) {
    return null;
  }
  const existing = document.visionAnalysisRun;
  return {
    runId: existing?.runId ?? `preview-${Date.now()}`,
    analysisId,
    assetId: resolveEditorAssetId(document),
    projectId: resolveEditorProjectId(document),
    backgroundUrl: document.backgroundUrl,
    sessionId: document.sessionId,
    status: "detecting",
    startedAt: existing?.startedAt ?? new Date().toISOString(),
    pipelineCalls: existing?.pipelineCalls ?? 0,
    duplicateRunCount: existing?.duplicateRunCount ?? 0,
    sourceOrder: existing?.sourceOrder?.length ? existing.sourceOrder : ["analysis_preparing"],
    isPartial: false,
    lastStage: "analysis_preparing",
  };
}

export function runMetaIncludesRtdetr(meta?: EditorVisionAnalysisRunMeta | null): boolean {
  return Boolean(meta?.sourceOrder?.includes("rtdetr") || meta?.lastStage === "rtdetr");
}

function stampVisionAnalysisRun(
  document: EditorCanvasDocument,
  meta: EditorVisionAnalysisRunMeta
): EditorCanvasDocument {
  return {
    ...document,
    visionAnalysisRun: meta,
  };
}

export function reportAnalysisPipelineStage(
  key: string,
  stage: EditorVisionAnalysisPipelineStage
): void {
  const current = getRunMeta(key);
  if (!current) {
    return;
  }
  const sourceOrder = current.sourceOrder.includes(stage)
    ? current.sourceOrder
    : [...current.sourceOrder, stage];
  const nextStatus: EditorVisionAnalysisStatus =
    stage === "truth_classifier" || stage === "bootstrap_complete"
      ? "finalizing"
      : stage === "vision_parts_api" || stage === "provisional"
        ? "partial"
        : "detecting";
  const meta: EditorVisionAnalysisRunMeta = {
    ...current,
    status: nextStatus,
    pipelineCalls: current.pipelineCalls + 1,
    sourceOrder,
    lastStage: stage,
    isPartial:
      nextStatus === "partial" || nextStatus === "finalizing" || current.isPartial,
    completedAt: current.completedAt,
  };
  publishRunMeta(key, meta);
}

export async function executeEditorVisionAnalysisRun(
  document: EditorCanvasDocument,
  runner: (
    run: EditorVisionAnalysisRunScope,
    reportStage: (stage: EditorVisionAnalysisPipelineStage) => void
  ) => Promise<EditorCanvasDocument>,
  options?: EditorVisionAnalysisRunOptions
): Promise<EditorCanvasDocument> {
  const force = Boolean(options?.force);
  const retry = Boolean(options?.retry);
  const trigger = options?.trigger ?? "unknown";
  const run = buildEditorVisionAnalysisRunScope(
    document,
    document.isolationScope?.analysisId
  );
  const key = editorVisionAnalysisScopeKey(run);
  const assetKey = editorVisionAssetRunKey(document);
  const recentDup = detectRecentDuplicateAssetStart(assetKey, run);

  const joinExistingRun = async (
    slot: { scopeKey: string; promise: Promise<EditorVisionAnalysisResultEnvelope> },
    joinedExisting: boolean
  ): Promise<EditorCanvasDocument> => {
    duplicateRunCount += 1;
    logVisionAnalysisRunStart({
      run,
      trigger,
      force,
      joinedExisting,
      duplicateWithinWindow: recentDup.duplicate,
    });
    registerScopeCallbacks(slot.scopeKey, options);
    const current = getRunMeta(slot.scopeKey);
    if (current) {
      options?.onStatusChange?.(current);
      publishRunMeta(slot.scopeKey, {
        ...current,
        duplicateRunCount: current.duplicateRunCount + 1,
      });
    }
    try {
      const envelope = await slot.promise;
      return envelope.document;
    } finally {
      unregisterScopeCallbacks(slot.scopeKey, options);
    }
  };

  if (!force) {
    const assetSlot = inFlightByAssetKey.get(assetKey);
    if (assetSlot) {
      return joinExistingRun(assetSlot, true);
    }

    if (
      !force &&
      !retry &&
      recentDup.duplicate &&
      !recentDup.sameAnalysisId &&
      documentHasRichVisionAnalysis(document)
    ) {
      const blockReason = "duplicate_start_ignored_rich_within_window";
      setLastVisionRunGuardBlockReason(blockReason);
      logVisionAnalysisRunStart({
        run,
        trigger,
        force,
        joinedExisting: true,
        duplicateWithinWindow: true,
      });
      if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn("[editor-vision-run-guard] DUPLICATE_START_IGNORED", {
          assetKey,
          recentAnalysisId: recentDup.recent?.analysisId,
          incomingAnalysisId: run.analysisId,
          trigger,
          reason: blockReason,
        });
      }
      duplicateRunCount += 1;
      return document;
    }
    setLastVisionRunGuardBlockReason(null);
  } else {
    inFlightByAssetKey.delete(assetKey);
  }

  registerScopeCallbacks(key, options);
  const currentBeforeStart = getRunMeta(key);
  if (currentBeforeStart) {
    options?.onStatusChange?.(currentBeforeStart);
  }

  const existing = inFlightByScopeKey.get(key);
  if (existing && !force) {
    return joinExistingRun({ scopeKey: key, promise: existing }, true);
  }

  logVisionAnalysisRunStart({
    run,
    trigger,
    force,
    joinedExisting: false,
    duplicateWithinWindow: recentDup.duplicate,
  });
  recordVisionAssetRunStart(assetKey, run, key);

  publishRunMeta(key, initialRunMeta(run));
  reportAnalysisPipelineStage(key, "analysis_preparing");

  const promise = (async (): Promise<EditorVisionAnalysisResultEnvelope> => {
    try {
      const reportStage = (stage: EditorVisionAnalysisPipelineStage) => {
        reportAnalysisPipelineStage(key, stage);
      };
      const raw = await runner(run, reportStage);
      if (!getRunMeta(key)?.sourceOrder.includes("bootstrap_complete")) {
        reportStage("bootstrap_complete");
      }

      const currentMeta = getRunMeta(key)!;
      const completedMeta: EditorVisionAnalysisRunMeta = {
        ...currentMeta,
        status: "complete",
        completedAt: new Date().toISOString(),
        isPartial: false,
        sourceOrder: currentMeta.sourceOrder.length
          ? currentMeta.sourceOrder
          : [...SOURCE_ORDER],
      };
      publishRunMeta(key, completedMeta);

      return {
        document: stampVisionAnalysisRun(raw, completedMeta),
        run,
        meta: completedMeta,
      };
    } catch (error) {
      const currentMeta = getRunMeta(key);
      const failedMeta: EditorVisionAnalysisRunMeta = {
        ...(currentMeta ?? initialRunMeta(run)),
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : "Analysis failed",
      };
      publishRunMeta(key, failedMeta);
      throw error;
    } finally {
      inFlightByScopeKey.delete(key);
      const assetSlot = inFlightByAssetKey.get(assetKey);
      if (assetSlot?.scopeKey === key) {
        inFlightByAssetKey.delete(assetKey);
      }
      unregisterScopeCallbacks(key, options);
    }
  })();

  inFlightByScopeKey.set(key, promise);
  inFlightByAssetKey.set(assetKey, { scopeKey: key, promise });
  const envelope = await promise;
  return envelope.document;
}

export function getInFlightAnalysisRunCountForTests(): number {
  return inFlightByScopeKey.size;
}

export function getInFlightAssetRunCountForTests(): number {
  return inFlightByAssetKey.size;
}

export function getDuplicateRunCountForTests(): number {
  return duplicateRunCount;
}

export function readCachedAnalysisMatchesCurrentRun(
  document: EditorCanvasDocument,
  cached: EditorCanvasDocument
): boolean {
  const cacheKey = editorProjectIsolationCacheKey(document);
  const cachedKey = editorProjectIsolationCacheKey(cached);
  if (cacheKey !== cachedKey) {
    return false;
  }

  if (
    normalizeEditorVisionScopeUrl(cached.backgroundUrl) !==
    normalizeEditorVisionScopeUrl(document.backgroundUrl)
  ) {
    return false;
  }

  const cachedRun = cached.visionAnalysisRun;
  const currentAnalysisId =
    normalizeEditorVisionScopeFromDocument(document).analysisId ||
    normalizeEditorVisionScopeFromDocument(cached).analysisId;

  if (!cachedRun) {
    return (
      !currentAnalysisId ||
      normalizeEditorVisionScopeId(cached.isolationScope?.analysisId) === currentAnalysisId
    );
  }

  return (
    normalizeEditorVisionScopeId(cachedRun.analysisId) === currentAnalysisId &&
    normalizeEditorVisionScopeUrl(cachedRun.backgroundUrl) ===
      normalizeEditorVisionScopeUrl(document.backgroundUrl) &&
    normalizeEditorVisionScopeId(cachedRun.assetId) ===
      normalizeEditorVisionScopeFromDocument(document).assetId &&
    cachedRun.status === "complete"
  );
}
