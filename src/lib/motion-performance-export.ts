import { buildMotionPerformanceFramePlan } from "@/lib/build-motion-performance-frame-plan";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import {
  MOTION_PERFORMANCE_EXPORT_JSON_VERSION,
  MOTION_PERFORMANCE_RUNTIME_VERSION,
  type MotionStudioPerformanceExportJson,
} from "@/types/motion-character-performance-export";
import { parseMotionHandoffPayloadForStorage } from "@/lib/studio-motion-handoff-storage";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseMotionStudioPerformanceExport(
  raw: unknown
): MotionStudioPerformanceExportJson | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  if (raw.version !== MOTION_PERFORMANCE_EXPORT_JSON_VERSION) {
    return null;
  }
  return raw as MotionStudioPerformanceExportJson;
}

export function readMotionPerformanceExportFromHandoffJson(
  studioHandoffJson: unknown
): MotionStudioPerformanceExportJson | null {
  if (!isPlainObject(studioHandoffJson)) {
    return null;
  }
  return parseMotionStudioPerformanceExport(studioHandoffJson.motionPerformanceExport);
}

export function mergeMotionPerformanceExportIntoHandoffStorage(
  handoffStorage: Record<string, unknown>,
  performanceExport: MotionStudioPerformanceExportJson
): Record<string, unknown> {
  return {
    ...handoffStorage,
    motionPerformanceExport: performanceExport,
  };
}

export function resolveMotionHandoffForPerformance(
  studioHandoffJson: unknown
): MotionHandoffPayload | null {
  return parseMotionHandoffPayloadForStorage(studioHandoffJson);
}

export function shouldApplyStudioPerformanceOverlay(params: {
  studioHandoffJson: unknown;
  videoDurationSeconds: number;
}): boolean {
  const handoff = resolveMotionHandoffForPerformance(params.studioHandoffJson);
  if (!handoff || handoff.version < MOTION_HANDOFF_PAYLOAD_VERSION) {
    return false;
  }
  const enabled = (handoff.characterPerformanceProfiles ?? []).some((p) => p.performanceEnabled);
  if (!enabled) {
    return false;
  }
  return params.videoDurationSeconds > 0;
}

export function buildMotionStudioPerformanceExportMetadata(params: {
  handoff: MotionHandoffPayload | null;
  videoDurationSeconds: number;
  performanceApplied: boolean;
}): MotionStudioPerformanceExportJson | null {
  const handoff = params.handoff;
  if (!handoff || handoff.version < MOTION_HANDOFF_PAYLOAD_VERSION) {
    return null;
  }
  const profiles = (handoff.characterPerformanceProfiles ?? []).filter((p) => p.performanceEnabled);
  if (profiles.length === 0) {
    return null;
  }

  const plan = buildMotionPerformanceFramePlan({
    handoff,
    videoDurationSeconds: params.videoDurationSeconds,
  });

  return {
    version: MOTION_PERFORMANCE_EXPORT_JSON_VERSION,
    performanceRuntimeVersion: MOTION_PERFORMANCE_RUNTIME_VERSION,
    performanceEnabled: true,
    performanceApplied: params.performanceApplied,
    frameSampleCount: plan.frames.length,
    warnings: plan.warnings,
    characterProfileIds: profiles.map((p) => p.characterId),
  };
}

export function buildPerformanceExportRenderSnapshot(
  exportMeta: MotionStudioPerformanceExportJson | null
): Record<string, unknown> | null {
  if (!exportMeta) {
    return null;
  }
  return {
    performanceRuntimeVersion: exportMeta.performanceRuntimeVersion,
    performanceEnabled: exportMeta.performanceEnabled,
    performanceApplied: exportMeta.performanceApplied,
    performanceWarnings: exportMeta.warnings,
    frameSampleCount: exportMeta.frameSampleCount,
    characterProfileIds: exportMeta.characterProfileIds,
    overlayApplied: exportMeta.lastOverlay?.applied ?? false,
  };
}
