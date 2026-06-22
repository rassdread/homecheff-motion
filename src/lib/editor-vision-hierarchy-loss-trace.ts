/**
 * Vision hierarchy regression trace — log every count transition to find first drop.
 */

import { countVisionHierarchyNodes } from "@/lib/editor-vision-v6-stability";
import type {
  EditorCanvasDocument,
  EditorVisionHierarchyNode,
} from "@/types/homecheff-visual-editor";

export type VisionHierarchyRegressionSource =
  | "provisional"
  | "vision_parts"
  | "style_dna_merge"
  | "acceptance"
  | "onDocumentChange"
  | "persisted_document"
  | "render";

export type VisionHierarchyRegressionRow = {
  at: string;
  source: VisionHierarchyRegressionSource;
  hierarchyNodes: number;
  displayHierarchyNodes: number;
  sessionId?: string;
};

const rows: VisionHierarchyRegressionRow[] = [];
let activeSessionId: string | null = null;

function shouldLog(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV !== "production";
}

function formatTraceTime(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function resetVisionHierarchyRegressionTrace(sessionId?: string): void {
  rows.length = 0;
  activeSessionId = sessionId ?? null;
  if (shouldLog() && sessionId) {
    // eslint-disable-next-line no-console
    console.debug(`[vision.hierarchy.regression] RUN_START sessionId=${sessionId}`);
  }
}

/** @deprecated alias — bootstrap still calls this name */
export const resetVisionHierarchyLossTrace = resetVisionHierarchyRegressionTrace;

export function getVisionHierarchyRegressionTraceRows(): VisionHierarchyRegressionRow[] {
  return [...rows];
}

function previousHierarchyCount(): number | null {
  if (rows.length === 0) {
    return null;
  }
  return rows[rows.length - 1]!.hierarchyNodes;
}

function logRegressionRow(row: VisionHierarchyRegressionRow, priorCount: number | null): void {
  if (!shouldLog()) {
    return;
  }
  const regression =
    priorCount != null && row.hierarchyNodes < priorCount
      ? ` ⚠ REGRESSION (${priorCount} → ${row.hierarchyNodes})`
      : "";
  // eslint-disable-next-line no-console
  console.debug(
    `[vision.hierarchy.regression] ${formatTraceTime(row.at)} ${row.source} hierarchyNodes=${row.hierarchyNodes} displayHierarchyNodes=${row.displayHierarchyNodes}${regression}`
  );
}

export function printVisionHierarchyRegressionTable(): void {
  if (!shouldLog() || rows.length === 0) {
    return;
  }
  // eslint-disable-next-line no-console
  console.table(
    rows.map((row) => ({
      time: formatTraceTime(row.at),
      source: row.source,
      hierarchyNodes: row.hierarchyNodes,
      displayHierarchyNodes: row.displayHierarchyNodes,
      sessionId: row.sessionId ?? "",
    }))
  );
}

export function traceVisionHierarchyRegression(
  source: VisionHierarchyRegressionSource,
  input: {
    document: EditorCanvasDocument;
    displayHierarchy?: EditorVisionHierarchyNode[];
  }
): void {
  if (activeSessionId && activeSessionId !== input.document.sessionId) {
    resetVisionHierarchyRegressionTrace(input.document.sessionId);
  } else if (!activeSessionId) {
    activeSessionId = input.document.sessionId;
  }

  const hierarchyNodes = countVisionHierarchyNodes(input.document.visionHierarchy);
  const displayHierarchyNodes =
    input.displayHierarchy != null
      ? countVisionHierarchyNodes(input.displayHierarchy)
      : hierarchyNodes;

  const priorCount = previousHierarchyCount();

  const row: VisionHierarchyRegressionRow = {
    at: new Date().toISOString(),
    source,
    hierarchyNodes,
    displayHierarchyNodes,
    sessionId: input.document.sessionId,
  };
  rows.push(row);
  logRegressionRow(row, priorCount);

  if (source === "render" || (priorCount != null && hierarchyNodes < priorCount)) {
    printVisionHierarchyRegressionTable();
  }
}

/** @deprecated use traceVisionHierarchyRegression("onDocumentChange", …) */
export function traceOnDocumentChangeStage(document: EditorCanvasDocument): void {
  traceVisionHierarchyRegression("onDocumentChange", { document });
}

/** @deprecated use traceVisionHierarchyRegression("render", …) */
export function traceBeforeHierarchyPanelRenderStage(input: {
  document: EditorCanvasDocument;
  displayHierarchy: EditorVisionHierarchyNode[];
  meaningful?: boolean;
}): void {
  void input.meaningful;
  traceVisionHierarchyRegression("render", {
    document: input.document,
    displayHierarchy: input.displayHierarchy,
  });
}

/** @deprecated use traceVisionHierarchyRegression("acceptance", …) */
export function traceVisionAnalysisAcceptanceStage(input: {
  document: EditorCanvasDocument;
  displayHierarchy?: EditorVisionHierarchyNode[];
  accepted?: boolean;
  rejectionReason?: string | null;
  visionHierarchyCount?: number;
}): void {
  void input.accepted;
  void input.rejectionReason;
  void input.visionHierarchyCount;
  traceVisionHierarchyRegression("acceptance", {
    document: input.document,
    displayHierarchy: input.displayHierarchy,
  });
}
/** @deprecated */
export function traceMergeStyleDnaRefinementStage(input: {
  before: EditorCanvasDocument;
  after: EditorCanvasDocument;
}): void {
  void input.before;
  traceVisionHierarchyRegression("style_dna_merge", { document: input.after });
}
/** @deprecated */
export function traceVisionPartsApiStage(_input: {
  sessionId: string;
  partsLength: number;
  source: "api" | "local_fallback" | "skipped";
}): void {}

/** @deprecated */
export function traceBuildSemanticLayersStage(_semanticLayersLength: number): void {}

/** @deprecated */
export function traceSplitTruthSectionsStage(_input: {
  detectedCount: number;
  estimatedCount: number;
  creativeCount: number;
}): void {}

/** @deprecated */
export function traceBuildTruthHierarchyStage(_input: {
  rootCount: number;
  totalNodes: number;
}): void {}

/** @deprecated */
export function traceApplyIllustrationPartAnalysisStage(_document: EditorCanvasDocument): void {}

/** @deprecated */
export function traceSanitizeIsolationStage(_input: {
  before: EditorCanvasDocument;
  after: EditorCanvasDocument;
}): void {}
