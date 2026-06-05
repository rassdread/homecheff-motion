/**
 * Motion UX — multi-step render pipeline progress (planning + live status mapping).
 */

import type { FinalExportStage } from "@/lib/export-timeout";
import { usesPosterBaseComposite, normalizeTextRenderMode } from "@/lib/hybrid-motion-overlay";
import { parseInstantMode } from "@/lib/instant-premium-mode-types";
import type {
  InstantPremiumProgressStage,
  InstantPremiumStatusResponse,
} from "@/types/animation-api";

export type MotionRenderPipelineStepId =
  | "load_concept"
  | "analyze_storyboard"
  | "prepare_texts"
  | "build_overlays"
  | "process_voice"
  | "prepare_segments"
  | "render_segments"
  | "merge_video"
  | "process_audio"
  | "add_subtitles"
  | "quality_check"
  | "save_video";

export type MotionRenderPipelineStepStatus = "pending" | "active" | "completed" | "failed";

export type MotionRenderPipelineStep = {
  id: MotionRenderPipelineStepId;
  status: MotionRenderPipelineStepStatus;
};

export type MotionRenderPipelineContext = {
  instantMode: "story" | "transition";
  hasStudioImport: boolean;
  voiceEnabled: boolean;
  subtitlesEnabled: boolean;
  hasTextOverlays: boolean;
  hasStoryOverlay: boolean;
};

export type MotionRenderPipelineProgress = {
  phase: "idle" | "running" | "completed" | "failed";
  percent: number;
  activeStepId: MotionRenderPipelineStepId | null;
  failedStepId: MotionRenderPipelineStepId | null;
  steps: MotionRenderPipelineStep[];
  estimatedRemainingSeconds: number | null;
  showRenderingMessage: boolean;
};

export const MOTION_RENDER_PIPELINE_STEP_I18N: Record<MotionRenderPipelineStepId, string> = {
  load_concept: "instant.renderPipeline.steps.loadConcept",
  analyze_storyboard: "instant.renderPipeline.steps.analyzeStoryboard",
  prepare_texts: "instant.renderPipeline.steps.prepareTexts",
  build_overlays: "instant.renderPipeline.steps.buildOverlays",
  process_voice: "instant.renderPipeline.steps.processVoice",
  prepare_segments: "instant.renderPipeline.steps.prepareSegments",
  render_segments: "instant.renderPipeline.steps.renderSegments",
  merge_video: "instant.renderPipeline.steps.mergeVideo",
  process_audio: "instant.renderPipeline.steps.processAudio",
  add_subtitles: "instant.renderPipeline.steps.addSubtitles",
  quality_check: "instant.renderPipeline.steps.qualityCheck",
  save_video: "instant.renderPipeline.steps.saveVideo",
};

const OVERLAY_EXPORT_STAGES = new Set<FinalExportStage>(["overlay"]);
const PREPARE_EXPORT_STAGES = new Set<FinalExportStage>([
  "download_segments",
  "normalize",
  "exposure_match",
  "worker_dispatch",
  "worker_wait",
]);
const MERGE_EXPORT_STAGES = new Set<FinalExportStage>(["concat"]);
const SAVE_EXPORT_STAGES = new Set<FinalExportStage>(["upload", "finalize"]);

export function buildMotionRenderPipelineContext(params: {
  instantMode?: string | null;
  hasStudioImport?: boolean;
  voiceEnabled?: boolean;
  subtitlesEnabled?: boolean;
  lockedTextLayerCount?: number;
  instantTextRenderMode?: string | null;
  usesStoryOverlay?: boolean;
}): MotionRenderPipelineContext {
  const instantMode = parseInstantMode(params.instantMode) === "story" ? "story" : "transition";
  const hasStoryOverlay = Boolean(params.usesStoryOverlay) || instantMode === "story";
  const renderMode =
    params.instantTextRenderMode != null && String(params.instantTextRenderMode).trim() !== ""
      ? normalizeTextRenderMode(params.instantTextRenderMode)
      : null;
  const posterMode = renderMode ? usesPosterBaseComposite(renderMode) : false;
  return {
    instantMode,
    hasStudioImport: Boolean(params.hasStudioImport),
    voiceEnabled: Boolean(params.voiceEnabled),
    subtitlesEnabled: Boolean(params.subtitlesEnabled),
    hasTextOverlays:
      posterMode ||
      (params.lockedTextLayerCount ?? 0) > 0 ||
      hasStoryOverlay,
    hasStoryOverlay,
  };
}

export function buildMotionRenderPipelineStepOrder(
  context: MotionRenderPipelineContext
): MotionRenderPipelineStepId[] {
  const steps: MotionRenderPipelineStepId[] = ["load_concept"];
  if (context.hasStudioImport) {
    steps.push("analyze_storyboard");
  }
  if (context.hasTextOverlays || context.hasStoryOverlay) {
    steps.push("prepare_texts", "build_overlays");
  }
  if (context.voiceEnabled) {
    steps.push("process_voice");
  }
  steps.push("prepare_segments", "render_segments", "merge_video");
  if (context.voiceEnabled) {
    steps.push("process_audio");
  }
  if (context.subtitlesEnabled) {
    steps.push("add_subtitles");
  }
  steps.push("quality_check", "save_video");
  return steps;
}

function mapFailedStageToPipelineStep(
  stage: InstantPremiumProgressStage | undefined,
  context: MotionRenderPipelineContext
): MotionRenderPipelineStepId {
  if (stage === "segment_rendering" || stage === "foreground_segmentation") {
    return "render_segments";
  }
  if (stage === "merge_clips") {
    return "merge_video";
  }
  if (stage === "poster_compositing" || stage === "export_video") {
    return context.hasTextOverlays ? "build_overlays" : "merge_video";
  }
  if (stage === "upload_storage" || stage === "finalize") {
    return "save_video";
  }
  return "merge_video";
}

function resolveActiveStepIndex(params: {
  snapshot: InstantPremiumStatusResponse;
  context: MotionRenderPipelineContext;
  order: MotionRenderPipelineStepId[];
}): number {
  const { snapshot, context, order } = params;
  const pct = snapshot.progressPercent ?? 0;
  const stage = snapshot.currentStage;
  const phase = snapshot.phase;
  const exportStage = snapshot.finalExportStage ?? snapshot.repairAdminDetail?.finalExportStage ?? null;

  if (snapshot.status === "completed" || stage === "completed") {
    return order.length - 1;
  }

  const idx = (id: MotionRenderPipelineStepId) => {
    const i = order.indexOf(id);
    return i >= 0 ? i : 0;
  };

  if (exportStage) {
    if (OVERLAY_EXPORT_STAGES.has(exportStage as FinalExportStage)) {
      return idx("build_overlays");
    }
    if (PREPARE_EXPORT_STAGES.has(exportStage as FinalExportStage)) {
      return idx("prepare_segments");
    }
    if (MERGE_EXPORT_STAGES.has(exportStage as FinalExportStage)) {
      return idx("merge_video");
    }
    if (SAVE_EXPORT_STAGES.has(exportStage as FinalExportStage)) {
      return pct >= 96 ? idx("quality_check") : idx("save_video");
    }
  }

  if (phase === "generating_clips" || stage === "segment_rendering" || stage === "foreground_segmentation") {
    if ((snapshot.queuedWithoutJobCount ?? 0) > 0 || pct < 8) {
      return idx("prepare_segments");
    }
    if (context.hasStudioImport && pct < 12) {
      return idx("analyze_storyboard");
    }
    if (context.voiceEnabled && pct < 15 && context.hasStudioImport) {
      return idx("process_voice");
    }
    if ((context.hasTextOverlays || context.hasStoryOverlay) && pct < 18) {
      return idx(context.hasTextOverlays ? "prepare_texts" : "load_concept");
    }
    return idx("render_segments");
  }

  if (stage === "poster_compositing" || (stage === "export_video" && pct < 82)) {
    return idx(context.hasTextOverlays ? "build_overlays" : "merge_video");
  }

  if (stage === "merge_clips" || phase === "merging_clips" || snapshot.status === "finalizing") {
    if (pct >= 99) {
      return idx("save_video");
    }
    if (pct >= 96) {
      return idx("quality_check");
    }
    if (context.subtitlesEnabled && pct >= 92) {
      return idx("add_subtitles");
    }
    if (context.voiceEnabled && pct >= 85) {
      return idx("process_audio");
    }
    if (context.hasTextOverlays && pct >= 72 && pct < 82) {
      return idx("build_overlays");
    }
    return idx("merge_video");
  }

  if (phase === "uploading_final" || stage === "upload_storage" || stage === "finalize" || pct >= 85) {
    if (pct >= 97) {
      return idx("save_video");
    }
    if (pct >= 94 && order.includes("quality_check")) {
      return idx("quality_check");
    }
    if (pct >= 90 && order.includes("add_subtitles") && context.subtitlesEnabled) {
      return idx("add_subtitles");
    }
    if (pct >= 82 && order.includes("process_audio") && context.voiceEnabled) {
      return idx("process_audio");
    }
    return idx("save_video");
  }

  if (snapshot.status === "queued") {
    return idx("load_concept");
  }

  return idx("render_segments");
}

function buildStepStatuses(
  order: MotionRenderPipelineStepId[],
  activeIndex: number,
  failedIndex: number | null
): MotionRenderPipelineStep[] {
  return order.map((id, index) => {
    if (failedIndex != null) {
      if (index < failedIndex) {
        return { id, status: "completed" };
      }
      if (index === failedIndex) {
        return { id, status: "failed" };
      }
      return { id, status: "pending" };
    }
    if (index < activeIndex) {
      return { id, status: "completed" };
    }
    if (index === activeIndex) {
      return { id, status: "active" };
    }
    return { id, status: "pending" };
  });
}

function estimateRemainingSeconds(params: {
  snapshot: InstantPremiumStatusResponse;
  activeStepId: MotionRenderPipelineStepId | null;
}): number | null {
  if (params.activeStepId !== "render_segments") {
    return null;
  }
  const segments = params.snapshot.segments ?? [];
  if (segments.length === 0) {
    return null;
  }
  const completed = segments.filter((s) => s.status === "completed").length;
  if (completed <= 0 || completed >= segments.length) {
    return null;
  }
  const remaining = segments.length - completed;
  const secondsPerSegment = 45;
  return Math.max(30, remaining * secondsPerSegment);
}

export function resolveMotionRenderPipelineProgress(params: {
  snapshot: InstantPremiumStatusResponse | null;
  context?: MotionRenderPipelineContext | null;
}): MotionRenderPipelineProgress {
  if (!params.snapshot) {
    return {
      phase: "idle",
      percent: 0,
      activeStepId: null,
      failedStepId: null,
      steps: [],
      estimatedRemainingSeconds: null,
      showRenderingMessage: false,
    };
  }

  const context =
    params.context ??
    buildMotionRenderPipelineContext({
      instantMode: params.snapshot.renderPipelineContext?.instantMode,
      hasStudioImport: params.snapshot.renderPipelineContext?.hasStudioImport,
      voiceEnabled: params.snapshot.renderPipelineContext?.voiceEnabled,
      subtitlesEnabled: params.snapshot.renderPipelineContext?.subtitlesEnabled,
      lockedTextLayerCount: params.snapshot.lockedTextLayerCount,
      instantTextRenderMode: params.snapshot.instantTextRenderMode,
      usesStoryOverlay: params.snapshot.renderPipelineContext?.hasStoryOverlay,
    });

  const order = buildMotionRenderPipelineStepOrder(context);
  const isFailed =
    params.snapshot.status === "failed" ||
    params.snapshot.currentStage === "failed" ||
    Boolean(params.snapshot.exportFailureReason || params.snapshot.finalRebuildFailed);
  const isCompleted =
    params.snapshot.status === "completed" || params.snapshot.currentStage === "completed";

  if (isCompleted) {
    const steps = order.map((id) => ({ id, status: "completed" as const }));
    return {
      phase: "completed",
      percent: 100,
      activeStepId: "save_video",
      failedStepId: null,
      steps,
      estimatedRemainingSeconds: null,
      showRenderingMessage: false,
    };
  }

  if (isFailed) {
    const failedStepId = mapFailedStageToPipelineStep(
      params.snapshot.failedAtStage ?? params.snapshot.currentStage,
      context
    );
    const failedIndex = order.indexOf(failedStepId);
    return {
      phase: "failed",
      percent: params.snapshot.progressPercent ?? 0,
      activeStepId: null,
      failedStepId,
      steps: buildStepStatuses(order, 0, failedIndex >= 0 ? failedIndex : order.length - 1),
      estimatedRemainingSeconds: null,
      showRenderingMessage: false,
    };
  }

  const isRunning =
    params.snapshot.status === "running" ||
    params.snapshot.status === "finalizing" ||
    params.snapshot.status === "queued" ||
    params.snapshot.isRebuildingFinalVideo ||
    params.snapshot.isRestoringFinalVideo;

  if (!isRunning) {
    return {
      phase: "idle",
      percent: params.snapshot.progressPercent ?? 0,
      activeStepId: null,
      failedStepId: null,
      steps: order.map((id) => ({ id, status: "pending" as const })),
      estimatedRemainingSeconds: null,
      showRenderingMessage: false,
    };
  }

  const activeIndex = resolveActiveStepIndex({
    snapshot: params.snapshot,
    context,
    order,
  });
  const activeStepId = order[activeIndex] ?? order[0] ?? null;

  return {
    phase: "running",
    percent: params.snapshot.progressPercent ?? 0,
    activeStepId,
    failedStepId: null,
    steps: buildStepStatuses(order, activeIndex, null),
    estimatedRemainingSeconds: estimateRemainingSeconds({
      snapshot: params.snapshot,
      activeStepId,
    }),
    showRenderingMessage: true,
  };
}

export function isMotionRenderPipelineActive(progress: MotionRenderPipelineProgress): boolean {
  return progress.phase === "running";
}
