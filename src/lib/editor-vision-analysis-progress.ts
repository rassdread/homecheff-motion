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

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function monotonic(
  next: EditorVisionAnalysisProgressSnapshot,
  previousPercent?: number
): EditorVisionAnalysisProgressSnapshot {
  const floor = previousPercent ?? 0;
  if (next.percent >= floor) {
    return next;
  }
  return { ...next, percent: floor };
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

export function resolveEditorVisionAnalysisProgress(
  input: EditorVisionAnalysisProgressInput
): EditorVisionAnalysisProgressSnapshot {
  if (input.cachedResult) {
    return stageSnapshot("ready", 100, false);
  }

  const runMeta = input.runMeta;
  if (runMeta?.status === "complete") {
    return stageSnapshot("ready", 100, false);
  }
  if (runMeta?.status === "failed") {
    return stageSnapshot("ready", 100, false);
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

  return monotonic(snapshot, input.previousPercent);
}

export function createMonotonicProgressTracker(initial = 0) {
  let maxPercent = initial;
  return {
    resolve(input: Omit<EditorVisionAnalysisProgressInput, "previousPercent">) {
      const snapshot = resolveEditorVisionAnalysisProgress({
        ...input,
        previousPercent: maxPercent,
      });
      maxPercent = snapshot.percent;
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
