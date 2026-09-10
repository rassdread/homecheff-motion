/**
 * Studio central HC spend gate — fail-closed.
 * When OFF, legacy Studio Credits remain authoritative (no destructive cutover).
 *
 * Typed mapping: Studio action → Growth HC action key.
 * Add future multiplatform-billable actions here (and in Growth studio-action-pricing).
 */

export function isStudioCentralHcSpendEnabled(): boolean {
  const flag = process.env.STUDIO_CENTRAL_HC_SPEND_ENABLED?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "on";
}

/** Explicit Studio → Growth HC action map (single registry for quote/reserve/capture). */
export const STUDIO_TO_CENTRAL_HC_ACTION: Record<string, string> = {
  motion_render: "motion_render_5s_720p_turbo",
  motion_render_5s_720p_turbo: "motion_render_5s_720p_turbo",
  premium_vision_analysis: "premium_vision_analysis",
  vision_analysis: "premium_vision_analysis",
  voice_generation: "voice_generation",
  lipsync_talking_avatar: "lipsync_talking_avatar",
  music_generation: "music_generation",
  sfx_generation: "sfx_generation",
  voice_clone: "voice_clone",
  image_generation: "image_generation",
};

/**
 * Map Studio action types to Growth HC catalog / reserve action keys.
 * Unmapped actions remain on legacy StudioWallet (intentionally product-local).
 */
export function studioActionToCentralHcAction(actionType: string): string | null {
  const key = actionType.trim().toLowerCase();
  if (STUDIO_TO_CENTRAL_HC_ACTION[key]) {
    return STUDIO_TO_CENTRAL_HC_ACTION[key]!;
  }
  // Motion / Vidu variants not listed above
  if (key.includes("vidu") || (key.includes("motion") && !key.includes("promotion"))) {
    return "motion_render_5s_720p_turbo";
  }
  return null;
}

/** Actions that must never silently fall back to legacy StudioWallet when central spend is enabled. */
export function isCentralHcMandatoryAction(actionType: string): boolean {
  return studioActionToCentralHcAction(actionType) != null;
}

/** Intentional legacy StudioWallet actions (not multiplatform HC). */
export const INTENTIONAL_LEGACY_STUDIO_WALLET_ACTIONS = [
  "ai_analysis",
  "storyboard_generation",
  "prompt_improvement",
  "voice_suggestion",
  "music_suggestion",
  "character_generation",
  "location_generation",
  "prop_generation",
  "world_generation",
  "scene_generation",
  "subtitle_transcription",
  "assistant_interpret",
  "ocr_scan",
  "publish_photo_story",
  "publish_slideshow",
  "publish_voice_message",
  "publish_poster_export",
  "publish_mp4_export",
  "translation_export",
  "image_edit",
  "fusion_render",
  "transformation_session",
  "studio_orchestrator_production",
] as const;
