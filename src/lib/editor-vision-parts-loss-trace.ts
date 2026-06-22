/**
 * Post–vision_parts_api pipeline trace — find where rich parts collapse to head-only.
 */

import { editorVisionAnalysisRunKey } from "@/lib/editor-vision-analysis-run";
import {
  collectVisionHierarchyLabels,
  countVisionHierarchyNodes,
  visionDocumentRichnessScore,
} from "@/lib/editor-vision-v6-stability";
import type { IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type {
  EditorCanvasDocument,
  EditorVisionHierarchyNode,
} from "@/types/homecheff-visual-editor";

export type VisionPartsLossStage =
  | "vision_parts_api_raw"
  | "vision_parts_merged_analysis"
  | "vision_parts_merged_document"
  | "vision_parts_after_style_dna"
  | "vision_parts_bootstrap_complete"
  | "vision_parts_guarded_pipeline_result"
  | "vision_parts_accepted"
  | "vision_parts_persisted"
  | "vision_parts_rendered";

export type VisionPartsLossMetrics = {
  partCount: number;
  nodeCount: number;
  faceCount: number;
  eyesCount: number;
  mouthCount: number;
  hairCount: number;
  clothingCount: number;
  accessoryCount: number;
  backgroundCount: number;
  richnessScore: number;
};

export type VisionPartsLossRow = {
  at: string;
  stage: VisionPartsLossStage;
  sessionId?: string;
  runId?: string | null;
  analysisId?: string | null;
  scopeKey?: string | null;
  trigger?: string | null;
  metrics: VisionPartsLossMetrics;
  regression: boolean;
  stopped: boolean;
  sampleLabels: string[];
};

const FACE_RE = /\b(face|gezicht)\b/i;
const EYES_RE = /\b(eyes?|ogen)\b/i;
const MOUTH_RE = /\b(mouth|mond|lips?|lippen)\b/i;
const HAIR_RE = /\b(hair|haar|beard|baard)\b/i;
const CLOTHING_RE = /\b(shirt|jacket|pants|kleding|clothing|broek|jas|outfit|dress)\b/i;
const ACCESSORY_RE =
  /\b(sunglasses|glasses|bril|necklace|ketting|hat|cap|accessoire|accessories|zonnebril|tie|das)\b/i;
const BACKGROUND_RE = /\b(background|achtergrond|scene|sky|lucht)\b/i;
const STRUCTURAL_HIERARCHY_RE = /^(character|personage|body|lichaam|background|scene|root)$/i;

const rows: VisionPartsLossRow[] = [];
let activeSessionId: string | null = null;
let tracingStopped = false;
let pipelineStarted = false;
let renderStageLogged = false;
let pipelineContext: {
  runId?: string | null;
  analysisId?: string | null;
  scopeKey?: string | null;
  trigger?: string | null;
} = {};

function shouldTrace(): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_EDITOR_VISION_PARTS_TRACE === "false") {
    return false;
  }
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_EDITOR_VISION_PARTS_TRACE === "true") {
    return true;
  }
  return typeof process !== "undefined" && process.env.NODE_ENV !== "production";
}

function partText(part: IllustrationPartSpec): string {
  return `${part.key} ${part.label} ${part.category ?? ""} ${part.group ?? ""}`.toLowerCase();
}

function countMatching(parts: IllustrationPartSpec[], re: RegExp): number {
  return parts.filter((part) => re.test(partText(part))).length;
}

function countMatchingLabels(labels: string[], re: RegExp): number {
  return labels.filter((label) => re.test(label.toLowerCase())).length;
}

function countPartLeavesInHierarchy(nodes: EditorVisionHierarchyNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.children?.length) {
      count += countPartLeavesInHierarchy(node.children);
    } else if (!STRUCTURAL_HIERARCHY_RE.test(node.label.trim())) {
      count += 1;
    }
  }
  return count;
}

export function computeVisionPartsLossMetrics(input: {
  parts?: IllustrationPartSpec[];
  document?: EditorCanvasDocument | null;
  hierarchy?: EditorVisionHierarchyNode[] | null;
}): VisionPartsLossMetrics {
  const parts = input.parts ?? [];
  const hierarchy = input.hierarchy ?? input.document?.visionHierarchy ?? [];
  const labels = collectVisionHierarchyLabels(hierarchy, 120);
  const hierarchyPartCount = countPartLeavesInHierarchy(hierarchy);
  const metaPartCount = input.document?.visionV6Meta?.visionPartCount ?? 0;

  const partCount =
    parts.length > 0
      ? parts.length
      : Math.max(metaPartCount, hierarchyPartCount) || labels.length;

  const fromParts = parts.length > 0;
  const labelCount = (re: RegExp) =>
    (fromParts ? countMatching(parts, re) : 0) + countMatchingLabels(labels, re);

  return {
    partCount,
    nodeCount: countVisionHierarchyNodes(hierarchy),
    faceCount: labelCount(FACE_RE),
    eyesCount: labelCount(EYES_RE),
    mouthCount: labelCount(MOUTH_RE),
    hairCount: labelCount(HAIR_RE),
    clothingCount: labelCount(CLOTHING_RE),
    accessoryCount: labelCount(ACCESSORY_RE),
    backgroundCount: labelCount(BACKGROUND_RE),
    richnessScore: input.document ? visionDocumentRichnessScore(input.document) : 0,
  };
}

function metricsRegressed(
  previous: VisionPartsLossMetrics,
  next: VisionPartsLossMetrics
): boolean {
  const nodeRegressed =
    previous.nodeCount > 0 && next.nodeCount > 0 && next.nodeCount < previous.nodeCount;
  return (
    next.eyesCount < previous.eyesCount ||
    next.mouthCount < previous.mouthCount ||
    next.clothingCount < previous.clothingCount ||
    next.accessoryCount < previous.accessoryCount ||
    nodeRegressed
  );
}

function formatMetrics(metrics: VisionPartsLossMetrics): string {
  return [
    `partCount=${metrics.partCount}`,
    `nodeCount=${metrics.nodeCount}`,
    `faceCount=${metrics.faceCount}`,
    `eyesCount=${metrics.eyesCount}`,
    `mouthCount=${metrics.mouthCount}`,
    `hairCount=${metrics.hairCount}`,
    `clothingCount=${metrics.clothingCount}`,
    `accessoryCount=${metrics.accessoryCount}`,
    `backgroundCount=${metrics.backgroundCount}`,
    `richnessScore=${metrics.richnessScore}`,
  ].join(" ");
}

export function resetVisionPartsLossTrace(sessionId?: string): void {
  rows.length = 0;
  activeSessionId = sessionId ?? null;
  tracingStopped = false;
  pipelineStarted = false;
  renderStageLogged = false;
  pipelineContext = {};
}

export function isVisionPartsLossTracingStopped(): boolean {
  return tracingStopped;
}

export function getVisionPartsLossTraceRows(): VisionPartsLossRow[] {
  return [...rows];
}

export function markVisionPartsPipelineStarted(
  sessionId: string,
  context?: {
    runId?: string | null;
    analysisId?: string | null;
    scopeKey?: string | null;
    trigger?: string | null;
  }
): void {
  if (!shouldTrace()) {
    return;
  }
  if (activeSessionId && activeSessionId !== sessionId) {
    resetVisionPartsLossTrace(sessionId);
  }
  activeSessionId = sessionId;
  pipelineStarted = true;
  pipelineContext = {
    runId: context?.runId ?? null,
    analysisId: context?.analysisId ?? null,
    scopeKey: context?.scopeKey ?? null,
    trigger: context?.trigger ?? null,
  };
}

export function traceVisionPartsLossStage(
  stage: VisionPartsLossStage,
  input: {
    sessionId?: string;
    runId?: string | null;
    analysisId?: string | null;
    scopeKey?: string | null;
    trigger?: string | null;
    parts?: IllustrationPartSpec[];
    document?: EditorCanvasDocument | null;
    hierarchy?: EditorVisionHierarchyNode[] | null;
    sampleLabels?: string[];
  }
): VisionPartsLossRow | null {
  if (!shouldTrace() || tracingStopped) {
    return null;
  }
  if (stage === "vision_parts_rendered" && renderStageLogged) {
    return null;
  }
  if (!pipelineStarted && stage !== "vision_parts_api_raw") {
    return null;
  }

  const sessionId = input.sessionId ?? input.document?.sessionId ?? activeSessionId ?? undefined;
  if (sessionId && activeSessionId && activeSessionId !== sessionId) {
    resetVisionPartsLossTrace(sessionId);
    pipelineStarted = true;
  } else if (sessionId && !activeSessionId) {
    activeSessionId = sessionId;
    pipelineStarted = true;
  }

  const document = input.document ?? null;
  const metrics = computeVisionPartsLossMetrics({
    parts: input.parts,
    document,
    hierarchy: input.hierarchy,
  });

  const labels =
    input.sampleLabels ??
    (input.parts?.length
      ? input.parts.map((part) => part.label)
      : collectVisionHierarchyLabels(input.hierarchy ?? document?.visionHierarchy, 12));

  const previous = rows.length > 0 ? rows[rows.length - 1]!.metrics : null;
  const regression = previous != null ? metricsRegressed(previous, metrics) : false;

  const runId =
    input.runId ?? document?.visionAnalysisRun?.runId ?? pipelineContext.runId ?? null;
  const analysisId =
    input.analysisId ??
    document?.isolationScope?.analysisId ??
    document?.visionAnalysisRun?.analysisId ??
    pipelineContext.analysisId ??
    null;
  const scopeKey =
    input.scopeKey ??
    (document ? editorVisionAnalysisRunKey(document) : null) ??
    pipelineContext.scopeKey ??
    null;
  const trigger = input.trigger ?? pipelineContext.trigger ?? null;

  const row: VisionPartsLossRow = {
    at: new Date().toISOString(),
    stage,
    sessionId,
    runId,
    analysisId,
    scopeKey,
    trigger,
    metrics,
    regression,
    stopped: false,
    sampleLabels: labels,
  };
  rows.push(row);

  if (stage === "vision_parts_rendered") {
    renderStageLogged = true;
  }

  const logFn = regression ? console.warn : console.info;
  logFn(
    `[vision.parts.loss] ${stage} trigger=${trigger ?? "—"} analysisId=${analysisId ?? "—"} ` +
      `scopeKey=${scopeKey ?? "—"} runId=${runId ?? "—"} ${formatMetrics(metrics)} ` +
      `labels=[${labels.join(", ")}]` +
      (regression && previous ? ` ⚠ REGRESSION from ${formatMetrics(previous)}` : "")
  );

  if (regression) {
    tracingStopped = true;
    row.stopped = true;
    printVisionPartsLossTable();
    logFn(`[vision.parts.loss] TRACE_STOPPED at ${stage} — fewer parts than previous step`);
  }

  return row;
}

export function printVisionPartsLossTable(): void {
  if (!shouldTrace() || rows.length === 0) {
    return;
  }
  // eslint-disable-next-line no-console
  console.table(
    rows.map((row) => ({
      time: row.at.slice(11, 19),
      stage: row.stage,
      trigger: row.trigger ?? "",
      analysisId: row.analysisId ?? "",
      ...row.metrics,
      regression: row.regression ? "⚠" : "",
      labels: row.sampleLabels.slice(0, 8).join(", "),
    }))
  );
}
