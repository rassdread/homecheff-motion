/**
 * S.6E — Canonical creative experience IDs.
 * Multiple UI doors map to one ID (no Matrix logic per entry fan).
 */

export const STUDIO_CREATIVE_EXPERIENCE_IDS = [
  "SCENE_STILL",
  "ASSET_REFERENCE_GENERATE",
  "VIDEO_INTENT",
  "RESTAURANT_PROMO",
  "COOKING_SHOW",
  "FOOD_PROMO",
  "SOCIAL_CAMPAIGN",
  "FASHION_REEL",
  "OUTFIT_CHANGE",
  "CHARACTER_FUSION",
  "PERSON_BACKGROUND",
  "PRODUCT_BRANDING",
  "MOTION_PRESET",
  "INSTANT_PHOTO_TO_VIDEO",
  "STUDIO_MOTION_HANDOFF",
  "VOICE_TTS",
  "VOICE_CLONE",
  "MUSIC_GENERATE",
  "SFX_GENERATE",
  "SUBTITLE_TRANSCRIBE",
  "TRANSLATE_EXPORT",
  "FUSION_EXPERIMENTAL",
  "PUBLISH_EXPORT",
  "LEGACY_UNMAPPED",
] as const;

export type StudioCreativeExperienceId = (typeof STUDIO_CREATIVE_EXPERIENCE_IDS)[number];

export function isStudioCreativeExperienceId(value: string): value is StudioCreativeExperienceId {
  return (STUDIO_CREATIVE_EXPERIENCE_IDS as readonly string[]).includes(value);
}

/** Map entry fans / legacy ids → canonical experience. */
export function resolveCanonicalExperienceId(input: {
  fusionIntent?: string | null;
  videoIntent?: string | null;
  characterStudioFlow?: string | null;
  motionPresetId?: string | null;
  instantStyle?: string | null;
  photoIntent?: string | null;
  studioTool?: string | null;
  generationCapability?: string | null;
}): StudioCreativeExperienceId {
  const fusion = input.fusionIntent?.trim().toLowerCase() ?? "";
  if (fusion === "outfit_from_reference" || fusion === "person_outfit") return "OUTFIT_CHANGE";
  if (fusion === "character_fusion") return "CHARACTER_FUSION";
  if (fusion === "person_background") return "PERSON_BACKGROUND";
  if (
    fusion === "product_branding" ||
    fusion === "product_packaging" ||
    fusion === "product_family"
  ) {
    return "PRODUCT_BRANDING";
  }
  if (
    fusion === "genetic_blend" ||
    fusion === "future_child" ||
    fusion === "life_timeline" ||
    fusion === "how_will_i_look"
  ) {
    return "FUSION_EXPERIMENTAL";
  }

  const flow = input.characterStudioFlow?.trim().toLowerCase() ?? "";
  if (flow === "outfit") return "OUTFIT_CHANGE";
  if (flow === "character_fusion") return "CHARACTER_FUSION";
  if (flow === "logo_placement") return "PRODUCT_BRANDING";

  const vIntent = input.videoIntent?.trim().toLowerCase() ?? "";
  if (vIntent === "restaurant_promo") return "RESTAURANT_PROMO";
  if (vIntent === "cooking_show") return "COOKING_SHOW";
  if (vIntent === "social_campaign") return "SOCIAL_CAMPAIGN";
  if (vIntent === "fashion_reel") return "FASHION_REEL";
  if (vIntent) return "VIDEO_INTENT";

  if (input.instantStyle?.trim().toLowerCase() === "food_promo") return "FOOD_PROMO";
  if (input.motionPresetId?.trim()) return "MOTION_PRESET";
  if (
    input.photoIntent === "animate_photo" ||
    input.photoIntent === "bring_photo_to_life" ||
    input.photoIntent === "photo_to_video" ||
    input.photoIntent === "image_to_video"
  ) {
    return "INSTANT_PHOTO_TO_VIDEO";
  }

  if (input.generationCapability === "IMAGE_GENERATE") return "SCENE_STILL";
  if (input.generationCapability === "VOICE_TTS") return "VOICE_TTS";
  if (input.generationCapability === "VOICE_CLONE") return "VOICE_CLONE";
  if (input.generationCapability === "MUSIC_GENERATE") return "MUSIC_GENERATE";
  if (input.generationCapability === "SFX_GENERATE") return "SFX_GENERATE";
  if (input.generationCapability === "VIDEO_GENERATE") return "STUDIO_MOTION_HANDOFF";
  if (input.generationCapability === "FUSION_RENDER") return "CHARACTER_FUSION";

  if (input.studioTool === "visual") return "SCENE_STILL";
  if (input.studioTool === "voice") return "VOICE_TTS";
  if (input.studioTool === "music") return "MUSIC_GENERATE";
  if (input.studioTool === "sound") return "SFX_GENERATE";
  if (input.studioTool === "export") return "PUBLISH_EXPORT";

  return "LEGACY_UNMAPPED";
}
