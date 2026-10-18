export const VOICE_PREVIEW_CONFIRMATION_CODE = "PREVIEW_CONFIRMATION_REQUIRED";

export type VoicePreviewChargeDecision =
  | { action: "play_free" }
  | { action: "require_confirmation" }
  | { action: "insufficient" }
  | { action: "charge" };

export function decideVoicePreviewCharge(input: {
  cacheHit: boolean;
  confirmCharge: boolean;
  credits: number;
  studioHcAvailable: number | null;
}): VoicePreviewChargeDecision {
  if (input.cacheHit) return { action: "play_free" };
  if (!input.confirmCharge) return { action: "require_confirmation" };
  if (input.studioHcAvailable != null && input.studioHcAvailable < input.credits) {
    return { action: "insufficient" };
  }
  return { action: "charge" };
}
