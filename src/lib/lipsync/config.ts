/**
 * True lip-sync capability config for Simple Studio.
 * Prefer Hedra when keyed; otherwise Replicate SadTalker (existing REPLICATE_API_TOKEN).
 */

export type LipsyncProviderId = "hedra_avatar" | "replicate_sadtalker" | "none";

export function getLipsyncProviderId(): LipsyncProviderId {
  const forced = process.env.STUDIO_LIPSYNC_PROVIDER?.trim().toLowerCase();
  if (forced === "hedra" || forced === "hedra_avatar") {
    return process.env.HEDRA_API_KEY?.trim() ? "hedra_avatar" : "none";
  }
  if (forced === "sadtalker" || forced === "replicate_sadtalker") {
    return process.env.REPLICATE_API_TOKEN?.trim() ? "replicate_sadtalker" : "none";
  }
  if (forced === "none" || forced === "off") return "none";

  // Auto: Hedra first (higher quality photo+audio), else Replicate SadTalker.
  if (process.env.HEDRA_API_KEY?.trim()) return "hedra_avatar";
  if (process.env.REPLICATE_API_TOKEN?.trim()) return "replicate_sadtalker";
  return "none";
}

export function isTrueLipsyncConfigured(): boolean {
  return getLipsyncProviderId() !== "none";
}

/** Reserved USD estimate for SadTalker (~$0.15/run published) with buffer. */
export const LIPSYNC_SADTALKER_RESERVED_USD = 0.2;

/** Hedra Avatar 720p published ~$0.05/sec — reserved with buffer. */
export const LIPSYNC_HEDRA_USD_PER_SECOND = 0.06;

export function estimateLipsyncReservedUsd(input: {
  provider: LipsyncProviderId;
  durationSeconds: number;
}): number {
  if (input.provider === "hedra_avatar") {
    return Math.max(0.3, LIPSYNC_HEDRA_USD_PER_SECOND * Math.max(1, input.durationSeconds));
  }
  if (input.provider === "replicate_sadtalker") {
    return LIPSYNC_SADTALKER_RESERVED_USD;
  }
  return 0;
}
