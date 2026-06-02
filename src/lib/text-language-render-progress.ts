/**
 * Step-by-step progress for text rerender and language export overlay pipelines.
 * Does not cover Vidu segment generation.
 */

import type { FinalExportStage } from "@/lib/export-timeout";
import type { LanguageExportPreparePhase } from "@/lib/language-export-prepare";
import type { LanguageExportRenderPhase } from "@/lib/language-export-render";

export type TextLanguageRenderPipeline = "text_rerender" | "language_export";

export type TextLanguageRenderStepId =
  | "saving_storyboard"
  | "loading_source_text"
  | "preparing_text_layers"
  | "translating"
  | "applying_text_protection"
  | "building_overlay"
  | "assembling_video"
  | "completed";

export type TextLanguageRenderStepStatus = "pending" | "active" | "completed" | "failed";

export type TextLanguageRenderStep = {
  id: TextLanguageRenderStepId;
  status: TextLanguageRenderStepStatus;
};

export type TextLanguageRenderProgressView = {
  pipeline: TextLanguageRenderPipeline;
  phase: "idle" | "running" | "completed" | "failed";
  percent: number | null;
  estimatedWaitSeconds: number | null;
  steps: TextLanguageRenderStep[];
  activeStepId: TextLanguageRenderStepId | null;
  failedStepId: TextLanguageRenderStepId | null;
  errorMessage: string | null;
};

export type TextRerenderLocalPhase = "idle" | "saving" | "polling" | "completed" | "failed";

export const TEXT_RERENDER_STEP_ORDER: TextLanguageRenderStepId[] = [
  "saving_storyboard",
  "preparing_text_layers",
  "building_overlay",
  "assembling_video",
  "completed",
];

export const LANGUAGE_EXPORT_STEP_ORDER: TextLanguageRenderStepId[] = [
  "loading_source_text",
  "translating",
  "applying_text_protection",
  "building_overlay",
  "assembling_video",
  "completed",
];

export const TEXT_LANGUAGE_RENDER_STEP_I18N: Record<TextLanguageRenderStepId, string> = {
  saving_storyboard: "instant.textLanguageProgress.steps.savingStoryboard",
  loading_source_text: "instant.textLanguageProgress.steps.loadingSourceText",
  preparing_text_layers: "instant.textLanguageProgress.steps.preparingTextLayers",
  translating: "instant.textLanguageProgress.steps.translating",
  applying_text_protection: "instant.textLanguageProgress.steps.applyingTextProtection",
  building_overlay: "instant.textLanguageProgress.steps.buildingOverlay",
  assembling_video: "instant.textLanguageProgress.steps.assemblingVideo",
  completed: "instant.textLanguageProgress.steps.completed",
};

const PREPARING_EXPORT_STAGES = new Set<FinalExportStage>([
  "download_segments",
  "normalize",
  "exposure_match",
  "concat",
  "worker_dispatch",
  "worker_wait",
]);

const OVERLAY_EXPORT_STAGES = new Set<FinalExportStage>(["overlay"]);
const ASSEMBLING_EXPORT_STAGES = new Set<FinalExportStage>(["upload", "finalize"]);

const LANGUAGE_RENDER_OVERLAY_MS = 45_000;
const TEXT_RERENDER_ESTIMATED_TOTAL_SEC = 90;
const LANGUAGE_EXPORT_ESTIMATED_TOTAL_SEC = 75;

function estimateRemainingWaitSeconds(
  order: TextLanguageRenderStepId[],
  activeIndex: number,
  totalEstimateSec: number
): number | null {
  if (activeIndex < 0 || order.length <= 1) {
    return null;
  }
  const remainingSteps = Math.max(1, order.length - 1 - activeIndex);
  const perStep = totalEstimateSec / Math.max(1, order.length - 1);
  return Math.max(5, Math.round(remainingSteps * perStep));
}

function idleSteps(order: TextLanguageRenderStepId[]): TextLanguageRenderStep[] {
  return order.map((id) => ({ id, status: "pending" }));
}

function buildRunningSteps(
  order: TextLanguageRenderStepId[],
  activeIndex: number
): TextLanguageRenderStep[] {
  return order.map((id, index) => {
    if (index < activeIndex) {
      return { id, status: "completed" };
    }
    if (index === activeIndex) {
      return { id, status: "active" };
    }
    return { id, status: "pending" };
  });
}

function buildFailedSteps(
  order: TextLanguageRenderStepId[],
  failedIndex: number
): TextLanguageRenderStep[] {
  return order.map((id, index) => {
    if (index < failedIndex) {
      return { id, status: "completed" };
    }
    if (index === failedIndex) {
      return { id, status: "failed" };
    }
    return { id, status: "pending" };
  });
}

function buildCompletedSteps(order: TextLanguageRenderStepId[]): TextLanguageRenderStep[] {
  return order.map((id) => ({ id, status: "completed" }));
}

function parseFinalExportStage(
  stage: FinalExportStage | string | null | undefined
): FinalExportStage | null {
  if (!stage?.trim()) {
    return null;
  }
  return stage.trim() as FinalExportStage;
}

export function deriveTextRerenderLocalPhase(input: {
  savingStoryboard?: boolean;
  isRebuildingFinalVideo?: boolean;
  rebuildFailed?: boolean;
  rebuildCompleted?: boolean;
}): TextRerenderLocalPhase {
  if (input.rebuildFailed) {
    return "failed";
  }
  if (input.rebuildCompleted) {
    return "completed";
  }
  if (input.savingStoryboard) {
    return "saving";
  }
  if (input.isRebuildingFinalVideo) {
    return "polling";
  }
  return "idle";
}

export function isTextRerenderProgressActive(input: {
  localPhase: TextRerenderLocalPhase;
  isRebuildingFinalVideo?: boolean;
}): boolean {
  return (
    input.localPhase === "saving" ||
    input.localPhase === "polling" ||
    Boolean(input.isRebuildingFinalVideo)
  );
}

function resolveTextRerenderActiveStepIndex(input: {
  localPhase: TextRerenderLocalPhase;
  progressPercent?: number | null;
  finalExportStage?: FinalExportStage | string | null;
}): number {
  if (input.localPhase === "saving") {
    return 0;
  }

  const stage = parseFinalExportStage(input.finalExportStage);
  if (stage) {
    if (PREPARING_EXPORT_STAGES.has(stage)) {
      return 1;
    }
    if (OVERLAY_EXPORT_STAGES.has(stage)) {
      return 2;
    }
    if (ASSEMBLING_EXPORT_STAGES.has(stage)) {
      return 3;
    }
  }

  const pct = input.progressPercent ?? 0;
  if (pct < 78) {
    return 1;
  }
  if (pct < 85) {
    return 2;
  }
  return 3;
}

function resolveTextRerenderFailedStepIndex(input: {
  localPhase: TextRerenderLocalPhase;
  progressPercent?: number | null;
  finalExportStage?: FinalExportStage | string | null;
}): number {
  if (input.localPhase === "saving") {
    return 0;
  }
  return resolveTextRerenderActiveStepIndex(input);
}

function resolveTextRerenderPercent(
  activeIndex: number,
  progressPercent?: number | null
): number | null {
  if (progressPercent != null && Number.isFinite(progressPercent)) {
    return Math.round(Math.max(8, Math.min(99, progressPercent)));
  }
  const fallbacks = [8, 35, 65, 88, 100];
  return fallbacks[activeIndex] ?? null;
}

export function resolveTextRerenderProgress(input: {
  localPhase: TextRerenderLocalPhase;
  progressPercent?: number | null;
  finalExportStage?: FinalExportStage | string | null;
  isRebuildingFinalVideo?: boolean;
  rebuildFailed?: boolean;
  errorMessage?: string | null;
}): TextLanguageRenderProgressView {
  const order = TEXT_RERENDER_STEP_ORDER;
  const errorMessage = input.errorMessage?.trim() || null;

  if (
    input.localPhase === "idle" &&
    !input.isRebuildingFinalVideo &&
    !input.rebuildFailed
  ) {
    return {
      pipeline: "text_rerender",
      phase: "idle",
      percent: null,
      estimatedWaitSeconds: null,
      steps: idleSteps(order),
      activeStepId: null,
      failedStepId: null,
      errorMessage: null,
    };
  }

  if (input.localPhase === "failed" || input.rebuildFailed) {
    const failedIndex = resolveTextRerenderFailedStepIndex(input);
    return {
      pipeline: "text_rerender",
      phase: "failed",
      percent: resolveTextRerenderPercent(failedIndex, input.progressPercent),
      estimatedWaitSeconds: null,
      steps: buildFailedSteps(order, failedIndex),
      activeStepId: order[failedIndex] ?? null,
      failedStepId: order[failedIndex] ?? null,
      errorMessage,
    };
  }

  if (input.localPhase === "completed" && !input.isRebuildingFinalVideo) {
    return {
      pipeline: "text_rerender",
      phase: "completed",
      percent: 100,
      estimatedWaitSeconds: 0,
      steps: buildCompletedSteps(order),
      activeStepId: null,
      failedStepId: null,
      errorMessage: null,
    };
  }

  const activeIndex = resolveTextRerenderActiveStepIndex(input);
  return {
    pipeline: "text_rerender",
    phase: "running",
    percent: resolveTextRerenderPercent(activeIndex, input.progressPercent),
    estimatedWaitSeconds: estimateRemainingWaitSeconds(
      order,
      activeIndex,
      TEXT_RERENDER_ESTIMATED_TOTAL_SEC
    ),
    steps: buildRunningSteps(order, activeIndex),
    activeStepId: order[activeIndex] ?? null,
    failedStepId: null,
    errorMessage: null,
  };
}

export function isLanguageExportProgressActive(input: {
  preparePhase: LanguageExportPreparePhase;
  renderPhase: LanguageExportRenderPhase;
}): boolean {
  return (
    input.preparePhase === "loading_layers" ||
    input.preparePhase === "translating" ||
    input.renderPhase === "starting" ||
    input.renderPhase === "rendering"
  );
}

function resolveLanguageExportActiveStepIndex(input: {
  preparePhase: LanguageExportPreparePhase;
  renderPhase: LanguageExportRenderPhase;
  usesStoryOverlay?: boolean;
  renderStartedAtMs?: number | null;
  nowMs?: number;
}): number {
  if (input.preparePhase === "loading_layers") {
    return 0;
  }
  if (input.preparePhase === "translating") {
    return 1;
  }

  if (input.renderPhase === "starting") {
    return input.usesStoryOverlay ? 3 : 2;
  }

  if (input.renderPhase === "rendering") {
    if (input.usesStoryOverlay) {
      const startedAt = input.renderStartedAtMs;
      const now = input.nowMs ?? Date.now();
      if (startedAt != null && now - startedAt >= LANGUAGE_RENDER_OVERLAY_MS) {
        return 4;
      }
      return 3;
    }

    const startedAt = input.renderStartedAtMs;
    const now = input.nowMs ?? Date.now();
    if (startedAt == null) {
      return 2;
    }
    const elapsed = now - startedAt;
    if (elapsed < 8_000) {
      return 2;
    }
    if (elapsed < LANGUAGE_RENDER_OVERLAY_MS) {
      return 3;
    }
    return 4;
  }

  return 0;
}

function resolveLanguageExportFailedStepIndex(input: {
  preparePhase: LanguageExportPreparePhase;
  renderPhase: LanguageExportRenderPhase;
  usesStoryOverlay?: boolean;
  renderStartedAtMs?: number | null;
  nowMs?: number;
}): number {
  if (input.preparePhase === "failed") {
    return input.renderPhase === "idle" ? 0 : 1;
  }
  if (input.renderPhase === "failed") {
    return resolveLanguageExportActiveStepIndex(input);
  }
  return 0;
}

function resolveLanguageExportPercent(
  activeIndex: number,
  phase: TextLanguageRenderProgressView["phase"]
): number | null {
  if (phase === "completed") {
    return 100;
  }
  const fallbacks = [12, 28, 42, 62, 86, 100];
  return fallbacks[activeIndex] ?? null;
}

export function resolveLanguageExportProgress(input: {
  preparePhase: LanguageExportPreparePhase;
  renderPhase: LanguageExportRenderPhase;
  usesStoryOverlay?: boolean;
  renderStartedAtMs?: number | null;
  nowMs?: number;
  errorMessage?: string | null;
}): TextLanguageRenderProgressView {
  const order = LANGUAGE_EXPORT_STEP_ORDER;
  const errorMessage = input.errorMessage?.trim() || null;

  if (
    input.preparePhase === "idle" &&
    input.renderPhase === "idle" &&
    !errorMessage
  ) {
    return {
      pipeline: "language_export",
      phase: "idle",
      percent: null,
      estimatedWaitSeconds: null,
      steps: idleSteps(order),
      activeStepId: null,
      failedStepId: null,
      errorMessage: null,
    };
  }

  if (input.preparePhase === "failed" || input.renderPhase === "failed") {
    const failedIndex = resolveLanguageExportFailedStepIndex(input);
    return {
      pipeline: "language_export",
      phase: "failed",
      percent: resolveLanguageExportPercent(failedIndex, "failed"),
      estimatedWaitSeconds: null,
      steps: buildFailedSteps(order, failedIndex),
      activeStepId: order[failedIndex] ?? null,
      failedStepId: order[failedIndex] ?? null,
      errorMessage,
    };
  }

  if (input.renderPhase === "completed") {
    return {
      pipeline: "language_export",
      phase: "completed",
      percent: 100,
      estimatedWaitSeconds: 0,
      steps: buildCompletedSteps(order),
      activeStepId: null,
      failedStepId: null,
      errorMessage: null,
    };
  }

  const activeIndex = resolveLanguageExportActiveStepIndex(input);
  return {
    pipeline: "language_export",
    phase: "running",
    percent: resolveLanguageExportPercent(activeIndex, "running"),
    estimatedWaitSeconds: estimateRemainingWaitSeconds(
      order,
      activeIndex,
      LANGUAGE_EXPORT_ESTIMATED_TOTAL_SEC
    ),
    steps: buildRunningSteps(order, activeIndex),
    activeStepId: order[activeIndex] ?? null,
    failedStepId: null,
    errorMessage: null,
  };
}
