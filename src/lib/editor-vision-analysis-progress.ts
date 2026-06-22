/**
 * Vision analysis progress — monotonic stage + percentage for the parts panel UX.
 */

import type { EditorOpenStage } from "@/lib/editor-open-timing";
import type {
  EditorVisionAnalysisPipelineStage,
  EditorVisionAnalysisRunMeta,
} from "@/lib/editor-vision-analysis-run";
import { VISION_PARTS_API_TIMEOUT_MS } from "@/lib/editor-vision-v6-client";

export type EditorVisionProgressStage =
  | "photo_loading"
  | "editor_opening"
  | "analysis_preparing"
  | "local_detection"
  | "parts_recognition"
  | "accessories_details"
  | "finalizing_result"
  | "ready";

export type EditorVisionAnalysisProgressSnapshot = {
  percent: number;
  stage: EditorVisionProgressStage;
  labelKey: string;
  showProgress: boolean;
};

export type EditorVisionAnalysisProgressInput = {
  openStage: EditorOpenStage;
  runMeta?: EditorVisionAnalysisRunMeta | null;
  cachedResult?: boolean;
  /** Elapsed ms since vision_parts_api started — drives 55→88 animation. */
  visionPartsElapsedMs?: number;
  previousPercent?: number;
  previousSnapshot?: EditorVisionAnalysisProgressSnapshot | null;
  /** Manual premium re-run — ignore stale "complete" from prior basic analysis. */
  premiumAnalysisActive?: boolean;
};

const PROGRESS_LABEL_KEYS: Record<EditorVisionProgressStage, string> = {
  photo_loading: "editor.open.stage.photoLoading",
  editor_opening: "editor.open.stage.editorOpening",
  analysis_preparing: "editor.open.stage.analysisPreparing",
  local_detection: "editor.open.stage.localDetection",
  parts_recognition: "editor.open.stage.partsRecognition",
  accessories_details: "editor.open.stage.accessoriesDetails",
  finalizing_result: "editor.open.stage.finalizingResult",
  ready: "editor.open.stage.ready",
};

const OPEN_STAGE_PERCENT: Record<EditorOpenStage, number> = {
  photo_loading: 5,
  editor_opening: 15,
  analysis_preparing: 28,
  provisional_detection: 55,
  deep_analysis: 82,
  ready: 100,
};

const OPEN_STAGE_MAP: Record<EditorOpenStage, EditorVisionProgressStage> = {
  photo_loading: "photo_loading",
  editor_opening: "editor_opening",
  analysis_preparing: "analysis_preparing",
  provisional_detection: "parts_recognition",
  deep_analysis: "accessories_details",
  ready: "ready",
};

const VISION_PARTS_PROGRESS_MIN = 55;
const VISION_PARTS_PROGRESS_MAX = 88;

function stageSnapshot(
  stage: EditorVisionProgressStage,
  percent: number,
  showProgress: boolean
): EditorVisionAnalysisProgressSnapshot {
  return {
    stage,
    percent: clampPercent(percent),
    labelKey: PROGRESS_LABEL_KEYS[stage],
    showProgress,
  };
}

/** Fixed first-render snapshot — server and client must match before mount. */
export const EDITOR_VISION_HYDRATION_SAFE_PROGRESS: EditorVisionAnalysisProgressSnapshot =
  stageSnapshot("photo_loading", 5, false);

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const VISION_PROGRESS_STAGE_RANK: Record<EditorVisionProgressStage, number> = {
  photo_loading: 0,
  editor_opening: 1,
  analysis_preparing: 2,
  local_detection: 3,
  parts_recognition: 4,
  accessories_details: 5,
  finalizing_result: 6,
  ready: 7,
};

function stageRank(stage: EditorVisionProgressStage): number {
  return VISION_PROGRESS_STAGE_RANK[stage] ?? 0;
}

function monotonic(
  next: EditorVisionAnalysisProgressSnapshot,
  previousPercent?: number,
  previousSnapshot?: EditorVisionAnalysisProgressSnapshot | null
): EditorVisionAnalysisProgressSnapshot {
  const floor = previousPercent ?? 0;
  if (next.percent >= floor) {
    return next;
  }
  const merged: EditorVisionAnalysisProgressSnapshot = { ...next, percent: floor };
  if (previousSnapshot && floor > next.percent) {
    const keepPreviousStage = stageRank(previousSnapshot.stage) > stageRank(next.stage);
    if (keepPreviousStage) {
      merged.stage = previousSnapshot.stage;
      merged.labelKey = previousSnapshot.labelKey;
    }
    if (previousSnapshot.showProgress) {
      merged.showProgress = true;
    }
  }
  return merged;
}

function visionPartsAnimatedPercent(elapsedMs: number): number {
  const ratio = Math.min(1, Math.max(0, elapsedMs / VISION_PARTS_API_TIMEOUT_MS));
  return (
    VISION_PARTS_PROGRESS_MIN +
    ratio * (VISION_PARTS_PROGRESS_MAX - VISION_PARTS_PROGRESS_MIN)
  );
}

function mapPipelineStage(
  lastStage: EditorVisionAnalysisPipelineStage | undefined,
  status: EditorVisionAnalysisRunMeta["status"],
  visionPartsElapsedMs?: number
): EditorVisionAnalysisProgressSnapshot {
  if (lastStage === "analysis_preparing") {
    return stageSnapshot("analysis_preparing", 32, true);
  }
  if (lastStage === "vision_parts_api") {
    const animated = visionPartsAnimatedPercent(visionPartsElapsedMs ?? 0);
    return stageSnapshot("parts_recognition", animated, true);
  }
  if (lastStage === "truth_classifier" || status === "finalizing") {
    return stageSnapshot("accessories_details", 82, true);
  }
  if (lastStage === "provisional" || status === "partial") {
    return stageSnapshot("parts_recognition", 52, true);
  }
  if (lastStage === "rtdetr") {
    return stageSnapshot("local_detection", 40, true);
  }
  if (lastStage === "style_dna") {
    return stageSnapshot("accessories_details", 48, true);
  }
  if (lastStage === "bootstrap_complete") {
    return stageSnapshot("finalizing_result", 95, true);
  }
  if (status === "detecting") {
    return stageSnapshot("local_detection", 38, true);
  }
  return stageSnapshot("analysis_preparing", 30, true);
}

export function bumpProgressAfterRtdetrTiming(input: {
  snapshot: EditorVisionAnalysisProgressSnapshot;
  rtdetrRecorded: boolean;
  analysisPending: boolean;
  analysisInProgress: boolean;
  runMeta?: EditorVisionAnalysisRunMeta | null;
}): EditorVisionAnalysisProgressSnapshot {
  const { snapshot, rtdetrRecorded, analysisPending, analysisInProgress, runMeta } = input;
  const staleLabel =
    snapshot.stage === "photo_loading" ||
    snapshot.stage === "editor_opening" ||
    snapshot.labelKey === PROGRESS_LABEL_KEYS.analysis_preparing;
  const staleMeta =
    !runMeta ||
    runMeta.lastStage === "analysis_preparing" ||
    runMeta.status === "detecting";
  if (
    rtdetrRecorded &&
    (analysisPending || analysisInProgress) &&
    staleMeta &&
    (snapshot.percent < 40 || (snapshot.percent >= 40 && staleLabel))
  ) {
    return {
      ...snapshot,
      percent: Math.max(snapshot.percent, 40),
      stage: "local_detection",
      labelKey: PROGRESS_LABEL_KEYS.local_detection,
      showProgress: true,
    };
  }
  return snapshot;
}

export function bumpProgressAfterVisionPartsTiming(input: {
  snapshot: EditorVisionAnalysisProgressSnapshot;
  visionPartsRecorded: boolean;
  analysisPending: boolean;
  analysisInProgress: boolean;
  runMeta?: EditorVisionAnalysisRunMeta | null;
  visionPartsElapsedMs?: number;
}): EditorVisionAnalysisProgressSnapshot {
  const { snapshot, visionPartsRecorded, analysisPending, analysisInProgress, runMeta, visionPartsElapsedMs } =
    input;
  if (!visionPartsRecorded || !(analysisPending || analysisInProgress)) {
    return snapshot;
  }
  const staleMeta =
    !runMeta ||
    runMeta.lastStage === "analysis_preparing" ||
    runMeta.lastStage === "rtdetr" ||
    runMeta.status === "detecting";
  const staleLabel =
    snapshot.stage === "photo_loading" ||
    snapshot.stage === "editor_opening" ||
    snapshot.stage === "local_detection";
  if (!staleMeta && !staleLabel) {
    return snapshot;
  }
  const animated = visionPartsAnimatedPercent(visionPartsElapsedMs ?? 0);
  return {
    ...snapshot,
    percent: Math.max(snapshot.percent, animated, 55),
    stage: "parts_recognition",
    labelKey: PROGRESS_LABEL_KEYS.parts_recognition,
    showProgress: true,
  };
}

export function resolveEditorVisionAnalysisProgress(
  input: EditorVisionAnalysisProgressInput
): EditorVisionAnalysisProgressSnapshot {
  if (input.cachedResult && !input.premiumAnalysisActive) {
    return stageSnapshot("ready", 100, false);
  }

  const runMeta = input.runMeta;
  const staleCompleteDuringPremium =
    Boolean(input.premiumAnalysisActive) && runMeta?.status === "complete";

  if (runMeta?.status === "complete" && !input.premiumAnalysisActive) {
    return stageSnapshot("ready", 100, false);
  }
  if (runMeta?.status === "failed" && !input.premiumAnalysisActive) {
    return stageSnapshot("ready", 100, false);
  }
  if (staleCompleteDuringPremium) {
    return stageSnapshot("accessories_details", 82, true);
  }

  let snapshot: EditorVisionAnalysisProgressSnapshot;
  if (runMeta && runMeta.status !== "idle") {
    snapshot = mapPipelineStage(runMeta.lastStage, runMeta.status, input.visionPartsElapsedMs);
  } else {
    const openStage = input.openStage;
    snapshot = stageSnapshot(
      OPEN_STAGE_MAP[openStage],
      OPEN_STAGE_PERCENT[openStage],
      openStage !== "ready"
    );
  }

  return monotonic(snapshot, input.previousPercent, input.previousSnapshot);
}

export function createMonotonicProgressTracker(initial = 0) {
  let maxPercent = initial;
  let lastSnapshot: EditorVisionAnalysisProgressSnapshot | null = null;
  return {
    resolve(input: Omit<EditorVisionAnalysisProgressInput, "previousPercent" | "previousSnapshot">) {
      const snapshot = resolveEditorVisionAnalysisProgress({
        ...input,
        previousPercent: maxPercent,
        previousSnapshot: lastSnapshot,
      });
      maxPercent = snapshot.percent;
      lastSnapshot = snapshot;
      return snapshot;
    },
    reset(next = 0) {
      maxPercent = next;
    },
    get maxPercent() {
      return maxPercent;
    },
  };
}

export function isVisionPartsApiStage(meta?: EditorVisionAnalysisRunMeta | null): boolean {
  return meta?.lastStage === "vision_parts_api" && meta.status !== "complete" && meta.status !== "failed";
}
