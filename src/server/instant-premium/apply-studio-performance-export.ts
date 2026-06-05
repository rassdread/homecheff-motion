/**
 * Studio V34.5 — post-merge character performance overlay (non-fatal on failure).
 */

import path from "node:path";
import { buildMotionPerformanceFramePlan } from "@/lib/build-motion-performance-frame-plan";
import {
  buildMotionStudioPerformanceExportMetadata,
  mergeMotionPerformanceExportIntoHandoffStorage,
  readMotionPerformanceExportFromHandoffJson,
  resolveMotionHandoffForPerformance,
  shouldApplyStudioPerformanceOverlay,
} from "@/lib/motion-performance-export";
import { burnStudioPerformanceOverlay } from "@/lib/studio-performance-ffmpeg";
import { sanitizeMotionHandoffForStorage } from "@/lib/studio-motion-handoff-storage";
import { sanitizeOverlayError } from "@/lib/video-ffmpeg-capability";
import { prisma } from "@/lib/prisma";
import { probeVideoSegment } from "@/server/instant-premium/segment-transition";
import type { MotionStudioPerformanceExportJson } from "@/types/motion-character-performance-export";

export type StudioPerformanceExportApplyResult = {
  outputVideoPath: string;
  performanceApplied: boolean;
  warning: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function persistPerformanceResult(params: {
  projectId: string;
  studioHandoffJson: unknown;
  exportMeta: MotionStudioPerformanceExportJson;
  performanceApplied: boolean;
  error: string | null;
}): Promise<void> {
  const base = isPlainObject(params.studioHandoffJson) ? params.studioHandoffJson : {};
  const nextMeta: MotionStudioPerformanceExportJson = {
    ...params.exportMeta,
    performanceApplied: params.performanceApplied,
    lastOverlay: {
      applied: params.performanceApplied,
      at: new Date().toISOString(),
      error: params.error,
      overlayMode: "debug_indicator",
    },
  };
  const next = mergeMotionPerformanceExportIntoHandoffStorage(
    sanitizeMotionHandoffForStorage(base as Record<string, unknown>),
    nextMeta
  );
  await prisma.animationProject.update({
    where: { id: params.projectId },
    data: { studioHandoffJson: next as object },
  });
}

export async function applyStudioCharacterPerformanceExportToMergedVideo(params: {
  projectId: string;
  mergedVideoPath: string;
  workDir: string;
  studioHandoffJson: unknown;
  width?: number;
  height?: number;
}): Promise<StudioPerformanceExportApplyResult> {
  const probed = await probeVideoSegment(params.mergedVideoPath);
  const videoDurationSec = probed?.durationSec ?? 8;
  const width = params.width ?? probed?.width ?? 1080;
  const height = params.height ?? probed?.height ?? 1920;

  if (!shouldApplyStudioPerformanceOverlay({ studioHandoffJson: params.studioHandoffJson, videoDurationSeconds: videoDurationSec })) {
    return {
      outputVideoPath: params.mergedVideoPath,
      performanceApplied: false,
      warning: null,
    };
  }

  const handoff = resolveMotionHandoffForPerformance(params.studioHandoffJson);
  const plan = buildMotionPerformanceFramePlan({
    handoff,
    videoDurationSeconds: videoDurationSec,
  });

  const exportMeta =
    buildMotionStudioPerformanceExportMetadata({
      handoff,
      videoDurationSeconds: videoDurationSec,
      performanceApplied: false,
    }) ??
    readMotionPerformanceExportFromHandoffJson(params.studioHandoffJson);

  if (!exportMeta || plan.frames.length === 0) {
    return {
      outputVideoPath: params.mergedVideoPath,
      performanceApplied: false,
      warning: null,
    };
  }

  const withPerfPath = path.join(params.workDir, "final-with-studio-performance.mp4");
  const burn = await burnStudioPerformanceOverlay({
    inputVideoPath: params.mergedVideoPath,
    outputVideoPath: withPerfPath,
    frames: plan.frames,
    width,
    height,
    workDir: params.workDir,
  });

  if (!burn.ok) {
    const warning = sanitizeOverlayError(
      `Video rendered, but character performance overlay failed: ${burn.message}`
    );
    await persistPerformanceResult({
      projectId: params.projectId,
      studioHandoffJson: params.studioHandoffJson,
      exportMeta: { ...exportMeta, warnings: [...exportMeta.warnings, { code: "overlay_failed", message: burn.message }] },
      performanceApplied: false,
      error: warning,
    });
    return {
      outputVideoPath: params.mergedVideoPath,
      performanceApplied: false,
      warning,
    };
  }

  const appliedMeta: MotionStudioPerformanceExportJson = {
    ...exportMeta,
    performanceApplied: true,
    frameSampleCount: plan.frames.length,
    warnings: plan.warnings,
  };

  await persistPerformanceResult({
    projectId: params.projectId,
    studioHandoffJson: params.studioHandoffJson,
    exportMeta: appliedMeta,
    performanceApplied: true,
    error: null,
  });

  return {
    outputVideoPath: withPerfPath,
    performanceApplied: true,
    warning: null,
  };
}
