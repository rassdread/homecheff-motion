import { normalizeTextRenderMode, usesPosterMotionPreserve } from "@/lib/hybrid-motion-overlay";

/** How Instant Premium assembles the final video from segment clips. */
export type FinalAssemblyMode =
  | "poster_composite_segments"
  | "concat_segments_only"
  | "static_poster_motion";

export const FINAL_ASSEMBLY_MODES: readonly FinalAssemblyMode[] = [
  "poster_composite_segments",
  "concat_segments_only",
  "static_poster_motion",
] as const;

export type FinalAssemblyLogEntry = {
  projectId: string;
  mode: FinalAssemblyMode;
  segmentCount: number;
  processedSegmentCount: number;
  compositorApplied: boolean;
  blendStrength: number;
  segmentIndex?: number;
  posterImageId?: string | null;
  sourceSegmentUrl?: string;
  processedSegmentPath?: string;
  compositorDetail?: "blend" | "static_poster" | "passthrough" | "skipped" | "concat";
  phase?: "assembly_start" | "segment" | "assembly_complete";
};

export function logFinalAssembly(entry: FinalAssemblyLogEntry): void {
  console.info("[final-assembly]", entry);
}

/** poster_motion_preserve → per-segment compositor; other modes → plain concat. */
export function resolveFinalAssemblyMode(textRenderMode: string | null | undefined): FinalAssemblyMode {
  const mode = normalizeTextRenderMode(textRenderMode);
  if (usesPosterMotionPreserve(mode)) {
    return "poster_composite_segments";
  }
  return "concat_segments_only";
}

export function shouldRunSegmentCompositor(assemblyMode: FinalAssemblyMode): boolean {
  return assemblyMode === "poster_composite_segments" || assemblyMode === "static_poster_motion";
}

export function allowsPlainSegmentPassthrough(assemblyMode: FinalAssemblyMode): boolean {
  return assemblyMode === "concat_segments_only";
}

export function isPosterCompositeAssemblyMode(
  assemblyMode: FinalAssemblyMode
): assemblyMode is "poster_composite_segments" {
  return assemblyMode === "poster_composite_segments";
}
