/**
 * Vision analysis run trace + duplicate/overwrite guards.
 * Dev console logs every run start and document write affecting hierarchy richness.
 */

import {
  compareVisionDocumentRichness,
  countVisionHierarchyNodes,
  visionDocumentRichnessScore,
} from "@/lib/editor-vision-v6-stability";
import {
  isVisionPartsLossTracingStopped,
  traceVisionPartsLossStage,
} from "@/lib/editor-vision-parts-loss-trace";
import {
  normalizeEditorVisionScopeUrl,
  type EditorVisionAnalysisRunScopeFields,
} from "@/lib/editor-vision-analysis-scope";
import {
  resolveEditorAssetId,
  resolveEditorProjectId,
} from "@/lib/editor-project-isolation";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type VisionAnalysisRunTrigger =
  | "auto-start"
  | "auto-start-retry"
  | "image-visible"
  | "manual-reanalyze"
  | "hydrate"
  | "document-change"
  | "workspace-mount"
  | "instruction-workspace-mount"
  | "refresh-load"
  | "isolation-controls"
  | "deep-analyze"
  | "unknown";

export type VisionDocumentWriteSource =
  | "onDocumentChange"
  | "acceptance"
  | "onProgress"
  | "persist"
  | "hydrate"
  | "scope-stamp"
  | "vision-reset"
  | "reanalyze-reset"
  | "isolation-controls"
  | "unknown";

export type VisionAnalysisRunStartLog = {
  runId: string;
  analysisId: string;
  scopeKey: string;
  assetKey: string;
  trigger: VisionAnalysisRunTrigger;
  force: boolean;
  joinedExisting: boolean;
  duplicateWithinWindow: boolean;
  at: string;
};

export type VisionDocumentWriteLog = {
  source: VisionDocumentWriteSource;
  runId: string | null;
  hierarchyCountBefore: number;
  hierarchyCountAfter: number;
  richnessScoreBefore: number;
  richnessScoreAfter: number;
  keptPrevious: boolean;
  reason: string | null;
  at: string;
};

const DUPLICATE_WINDOW_MS = 5000;

const runStartLogs: VisionAnalysisRunStartLog[] = [];
const documentWriteLogs: VisionDocumentWriteLog[] = [];

export function editorVisionAssetRunKey(document: EditorCanvasDocument): string {
  return `${resolveEditorProjectId(document)}::${resolveEditorAssetId(document)}::${normalizeEditorVisionScopeUrl(document.backgroundUrl)}`;
}

export function editorVisionAnalysisScopeKey(
  scope: Pick<EditorVisionAnalysisRunScopeFields, "projectId" | "assetId" | "analysisId">
): string {
  return `${scope.projectId}::${scope.assetId}::${scope.analysisId}`;
}

export function editorVisionAssetRunKeyFromScope(
  scope: Pick<EditorVisionAnalysisRunScopeFields, "projectId" | "assetId" | "backgroundUrl">
): string {
  return `${scope.projectId}::${scope.assetId}::${normalizeEditorVisionScopeUrl(scope.backgroundUrl)}`;
}

export function logVisionAnalysisRunStart(input: {
  run: EditorVisionAnalysisRunScopeFields & { runId: string };
  trigger: VisionAnalysisRunTrigger;
  force: boolean;
  joinedExisting: boolean;
  duplicateWithinWindow: boolean;
}): VisionAnalysisRunStartLog {
  const scopeKey = editorVisionAnalysisScopeKey(input.run);
  const assetKey = editorVisionAssetRunKeyFromScope(input.run);
  const entry: VisionAnalysisRunStartLog = {
    runId: input.run.runId,
    analysisId: input.run.analysisId,
    scopeKey,
    assetKey,
    trigger: input.trigger,
    force: input.force,
    joinedExisting: input.joinedExisting,
    duplicateWithinWindow: input.duplicateWithinWindow,
    at: new Date().toISOString(),
  };
  runStartLogs.push(entry);
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    const label = input.joinedExisting ? "DUPLICATE_RUN_JOINED" : "VISION_RUN_START";
    // eslint-disable-next-line no-console
    console.info(`[editor-vision-run-guard] ${label}`, entry);
  }
  return entry;
}

export type GuardVisionDocumentWriteResult = {
  document: EditorCanvasDocument;
  keptPrevious: boolean;
  reason: string | null;
};

/** Never replace a richer hierarchy with a weaker incoming document (unless forced). */
export function guardVisionDocumentWrite(
  source: VisionDocumentWriteSource,
  current: EditorCanvasDocument,
  incoming: EditorCanvasDocument,
  options?: { runId?: string | null; force?: boolean }
): GuardVisionDocumentWriteResult {
  const hierarchyCountBefore = countVisionHierarchyNodes(current.visionHierarchy);
  const hierarchyCountAfter = countVisionHierarchyNodes(incoming.visionHierarchy);
  const richnessScoreBefore = visionDocumentRichnessScore(current);
  const richnessScoreAfter = visionDocumentRichnessScore(incoming);

  if (
    !options?.force &&
    (source === "acceptance" || source === "onProgress") &&
    incoming.visionV6Meta?.openAiPartsUsed &&
    !current.visionV6Meta?.openAiPartsUsed
  ) {
    const entry: VisionDocumentWriteLog = {
      source,
      runId: options?.runId ?? incoming.visionAnalysisRun?.runId ?? null,
      hierarchyCountBefore,
      hierarchyCountAfter,
      richnessScoreBefore,
      richnessScoreAfter,
      keptPrevious: false,
      reason: "openai_parts_upgrade",
      at: new Date().toISOString(),
    };
    documentWriteLogs.push(entry);
    logDocumentWrite(entry);
    return { document: incoming, keptPrevious: false, reason: null };
  }

  if (options?.force) {
    const entry: VisionDocumentWriteLog = {
      source,
      runId: options.runId ?? incoming.visionAnalysisRun?.runId ?? null,
      hierarchyCountBefore,
      hierarchyCountAfter,
      richnessScoreBefore,
      richnessScoreAfter,
      keptPrevious: false,
      reason: "force_write",
      at: new Date().toISOString(),
    };
    documentWriteLogs.push(entry);
    logDocumentWrite(entry);
    return { document: incoming, keptPrevious: false, reason: null };
  }

  const comparison = compareVisionDocumentRichness(current, incoming);
  const keptPrevious = comparison.keptPrevious;
  const reason = keptPrevious ? "weaker_duplicate_ignored" : null;
  const document = keptPrevious
    ? {
        ...current,
        visionAnalysisRun: incoming.visionAnalysisRun ?? current.visionAnalysisRun,
        updatedAt: incoming.updatedAt,
      }
    : incoming;

  const entry: VisionDocumentWriteLog = {
    source,
    runId: options?.runId ?? incoming.visionAnalysisRun?.runId ?? null,
    hierarchyCountBefore,
    hierarchyCountAfter: countVisionHierarchyNodes(document.visionHierarchy),
    richnessScoreBefore,
    richnessScoreAfter: visionDocumentRichnessScore(document),
    keptPrevious,
    reason,
    at: new Date().toISOString(),
  };
  documentWriteLogs.push(entry);
  logDocumentWrite(entry);

  if (keptPrevious && typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn("[editor-vision-run-guard] WEAKER_DUPLICATE_IGNORED", {
      source,
      runId: entry.runId,
      hierarchyCountBefore,
      hierarchyCountAfter,
      richnessScoreBefore,
      richnessScoreAfter,
    });
  }

  if (
    !isVisionPartsLossTracingStopped() &&
    (source === "acceptance" || source === "onProgress" || source === "onDocumentChange")
  ) {
    traceVisionPartsLossStage(
      source === "acceptance" ? "vision_parts_accepted" : "vision_parts_guarded_pipeline_result",
      {
        sessionId: document.sessionId,
        runId: entry.runId,
        document,
      }
    );
  }

  return { document, keptPrevious, reason };
}

function logDocumentWrite(entry: VisionDocumentWriteLog): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("[editor-vision-run-guard] DOCUMENT_WRITE", entry);
  }
}

type RecentAssetStart = {
  startedAt: number;
  analysisId: string;
  runId: string;
  scopeKey: string;
};

const recentStartsByAssetKey = new Map<string, RecentAssetStart>();

export function recordVisionAssetRunStart(
  assetKey: string,
  run: EditorVisionAnalysisRunScopeFields & { runId: string },
  scopeKey: string
): RecentAssetStart {
  const entry: RecentAssetStart = {
    startedAt: Date.now(),
    analysisId: run.analysisId,
    runId: run.runId,
    scopeKey,
  };
  recentStartsByAssetKey.set(assetKey, entry);
  return entry;
}

export function detectRecentDuplicateAssetStart(
  assetKey: string,
  run: EditorVisionAnalysisRunScopeFields
): { duplicate: boolean; sameAnalysisId: boolean; recent: RecentAssetStart | null } {
  const recent = recentStartsByAssetKey.get(assetKey) ?? null;
  if (!recent) {
    return { duplicate: false, sameAnalysisId: false, recent: null };
  }
  const withinWindow = Date.now() - recent.startedAt < DUPLICATE_WINDOW_MS;
  if (!withinWindow) {
    return { duplicate: false, sameAnalysisId: false, recent };
  }
  const sameAnalysisId = recent.analysisId === run.analysisId;
  return { duplicate: true, sameAnalysisId, recent };
}

export function getVisionAnalysisRunStartLogsForTests(): VisionAnalysisRunStartLog[] {
  return [...runStartLogs];
}

export function getVisionDocumentWriteLogsForTests(): VisionDocumentWriteLog[] {
  return [...documentWriteLogs];
}

let lastRunGuardBlockReason: string | null = null;

export function getLastVisionRunGuardBlockReason(): string | null {
  return lastRunGuardBlockReason;
}

export function setLastVisionRunGuardBlockReason(reason: string | null): void {
  lastRunGuardBlockReason = reason;
}

export function resetVisionAnalysisRunGuardForTests(): void {
  runStartLogs.length = 0;
  documentWriteLogs.length = 0;
  recentStartsByAssetKey.clear();
  lastRunGuardBlockReason = null;
}

export function getDuplicateWindowMsForTests(): number {
  return DUPLICATE_WINDOW_MS;
}
