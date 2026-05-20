/** Client-safe final assembly mode types (no Node/ffmpeg imports). */

export type FinalAssemblyMode =
  | "raw_motion_concat"
  | "poster_composite_segments"
  | "concat_segments_only"
  | "static_poster_motion";

export const FINAL_ASSEMBLY_MODES: readonly FinalAssemblyMode[] = [
  "raw_motion_concat",
  "poster_composite_segments",
  "concat_segments_only",
  "static_poster_motion",
] as const;

export function isFinalAssemblyMode(value: string): value is FinalAssemblyMode {
  return (FINAL_ASSEMBLY_MODES as readonly string[]).includes(value);
}
