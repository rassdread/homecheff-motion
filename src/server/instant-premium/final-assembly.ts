import { normalizeTextRenderMode, usesPosterMotionPreserve } from "@/lib/hybrid-motion-overlay";
import { parsePosterMotionSettings } from "@/lib/poster-motion-preserve";
import { resolvePremiumPolishProfile } from "@/lib/premium-polish-settings";
import {
  DEFAULT_SEGMENT_TRANSITION_TYPE,
  type SegmentTransitionType,
} from "@/server/instant-premium/segment-transition";

import {
  FINAL_ASSEMBLY_MODES,
  type FinalAssemblyMode,
} from "@/lib/final-assembly-types";

export type { FinalAssemblyMode };
export { FINAL_ASSEMBLY_MODES };

export type { SegmentTransitionType };
export { DEFAULT_SEGMENT_TRANSITION_TYPE };

import { PREMIUM_MOTION_PIPELINE } from "@/lib/premium-motion-engine";

/** Assembly policy for poster_motion_preserve (Vidu motion stays dominant). */
export const POSTER_MOTION_PRESERVE_ASSEMBLY_RULES = PREMIUM_MOTION_PIPELINE;

export type FinalAssemblyLogEntry = {
  projectId: string;
  assemblyMode: FinalAssemblyMode;
  segmentCount: number;
  usedRawSegments: boolean;
  usedComposite: boolean;
  usedFallback: boolean;
  transitionType: SegmentTransitionType;
  phase?: "assembly_start" | "segment" | "assembly_complete";
  processedSegmentCount?: number;
  segmentIndex?: number;
  blendStrength?: number;
  posterImageId?: string | null;
  sourceSegmentUrl?: string;
  processedSegmentPath?: string;
  compositorDetail?: "blend" | "static_poster" | "passthrough" | "skipped" | "concat";
};

export function logFinalAssembly(entry: FinalAssemblyLogEntry): void {
  console.info("[final-assembly]", entry);
}

function readEnvAssemblyModeOverride(): FinalAssemblyMode | null {
  const raw = process.env.INSTANT_FINAL_ASSEMBLY_MODE?.trim();
  if (!raw) {
    return null;
  }
  return FINAL_ASSEMBLY_MODES.includes(raw as FinalAssemblyMode)
    ? (raw as FinalAssemblyMode)
    : null;
}

/**
 * poster_motion_preserve → raw_motion_concat (Vidu segments concat as-is).
 * poster_composite_segments only when settings.advancedSegmentComposite or env override.
 */
export function resolveFinalAssemblyMode(
  textRenderMode: string | null | undefined,
  posterMotionSettings?: unknown
): FinalAssemblyMode {
  const mode = normalizeTextRenderMode(textRenderMode);
  if (!usesPosterMotionPreserve(mode)) {
    return "concat_segments_only";
  }

  const envOverride = readEnvAssemblyModeOverride();
  if (envOverride) {
    return envOverride;
  }

  const settings = parsePosterMotionSettings(posterMotionSettings);
  const polish = resolvePremiumPolishProfile(posterMotionSettings);
  if (
    settings.advancedSegmentComposite === true ||
    settings.useSegmentCompositor === true
  ) {
    return "poster_composite_segments";
  }
  if (polish.assemblyMode === "poster_composite_segments") {
    return "poster_composite_segments";
  }

  return polish.assemblyMode === "concat_segments_only"
    ? "concat_segments_only"
    : "raw_motion_concat";
}

export function usesRawAnimatedSegments(assemblyMode: FinalAssemblyMode): boolean {
  return assemblyMode === "raw_motion_concat" || assemblyMode === "concat_segments_only";
}

export function shouldRunSegmentCompositor(assemblyMode: FinalAssemblyMode): boolean {
  return assemblyMode === "poster_composite_segments" || assemblyMode === "static_poster_motion";
}

export function allowsPlainSegmentPassthrough(assemblyMode: FinalAssemblyMode): boolean {
  return usesRawAnimatedSegments(assemblyMode);
}

export function isPosterCompositeAssemblyMode(
  assemblyMode: FinalAssemblyMode
): assemblyMode is "poster_composite_segments" {
  return assemblyMode === "poster_composite_segments";
}

export function buildFinalAssemblyLogBase(params: {
  projectId: string;
  assemblyMode: FinalAssemblyMode;
  segmentCount: number;
  transitionType?: SegmentTransitionType;
  blendStrength?: number;
}): Pick<
  FinalAssemblyLogEntry,
  "projectId" | "assemblyMode" | "segmentCount" | "usedRawSegments" | "usedComposite" | "usedFallback" | "transitionType"
> {
  const usedRaw = usesRawAnimatedSegments(params.assemblyMode);
  return {
    projectId: params.projectId,
    assemblyMode: params.assemblyMode,
    segmentCount: params.segmentCount,
    usedRawSegments: usedRaw,
    usedComposite: shouldRunSegmentCompositor(params.assemblyMode),
    usedFallback: params.assemblyMode === "static_poster_motion",
    transitionType: params.transitionType ?? DEFAULT_SEGMENT_TRANSITION_TYPE,
  };
}
