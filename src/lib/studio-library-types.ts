/**
 * S.5 — Canonical library / project contracts (pure).
 * Storage architecture only for prompt presets — no Prompt Matrix optimization.
 */

export const STUDIO_LIBRARY_ASSET_FAMILIES = [
  "image",
  "video",
  "voice",
  "music",
  "sfx",
  "subtitle",
  "character",
  "location",
  "prop",
  "world",
  "brand",
  "prompt_preset",
  "upload",
  "other",
] as const;

export type StudioLibraryAssetFamily = (typeof STUDIO_LIBRARY_ASSET_FAMILIES)[number];

export const STUDIO_LIBRARY_ORIGINS = [
  "generated",
  "uploaded",
  "derived",
  "manual",
  "system",
  "imported",
] as const;

export type StudioLibraryOrigin = (typeof STUDIO_LIBRARY_ORIGINS)[number];

export const STUDIO_LIBRARY_ASSET_STATUSES = ["active", "draft", "archived", "deleted"] as const;

export type StudioLibraryAssetStatus = (typeof STUDIO_LIBRARY_ASSET_STATUSES)[number];

export const STUDIO_CREATIVE_PROJECT_STATUSES = ["active", "archived", "template"] as const;

export type StudioCreativeProjectStatus = (typeof STUDIO_CREATIVE_PROJECT_STATUSES)[number];

export const STUDIO_FAVORITE_TARGET_KINDS = [
  "project",
  "asset",
  "voice",
  "character",
  "music",
  "prompt_preset",
  "brand_kit",
  "collection",
] as const;

export type StudioFavoriteTargetKind = (typeof STUDIO_FAVORITE_TARGET_KINDS)[number];

export const STUDIO_PROMPT_PRESET_SCOPES = [
  "user",
  "project",
  "brand",
  "default",
  "system",
] as const;

export type StudioPromptPresetScope = (typeof STUDIO_PROMPT_PRESET_SCOPES)[number];

export const STUDIO_ASSET_RELATION_TYPES = [
  "uses_voice",
  "uses_character",
  "uses_location",
  "uses_prop",
  "derived_from",
  "belongs_to",
  "subtitle_of",
  "brand_of",
  "uses_music",
  "uses_preset",
] as const;

export type StudioAssetRelationType = (typeof STUDIO_ASSET_RELATION_TYPES)[number];

/** Map generation capability → library family (attach, never rewrite orchestrator). */
export function familyForGenerationCapability(capability: string): StudioLibraryAssetFamily {
  switch (capability) {
    case "IMAGE_GENERATE":
    case "IMAGE_EDIT":
      return "image";
    case "VIDEO_GENERATE":
    case "FUSION_RENDER":
    case "RENDER":
      return "video";
    case "VOICE_TTS":
    case "VOICE_CLONE":
      return "voice";
    case "MUSIC_GENERATE":
      return "music";
    case "SFX_GENERATE":
      return "sfx";
    case "SUBTITLE_GENERATE":
    case "TRANSLATE":
      return "subtitle";
    default:
      return "other";
  }
}

export function isStudioLibraryAssetFamily(value: string): value is StudioLibraryAssetFamily {
  return (STUDIO_LIBRARY_ASSET_FAMILIES as readonly string[]).includes(value);
}
