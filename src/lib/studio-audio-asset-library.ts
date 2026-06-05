/**
 * Studio V38 — system audio asset catalog (planning only).
 */

import type { AudioAssetCategory, StudioAudioAsset } from "@/types/studio-audio-asset-director";

function asset(
  partial: Omit<StudioAudioAsset, "provider" | "licenseType" | "isSystemAsset">
): StudioAudioAsset {
  return {
    ...partial,
    provider: "system",
    licenseType: "system",
    isSystemAsset: true,
  };
}

export const STUDIO_AUDIO_ASSET_LIBRARY: StudioAudioAsset[] = [
  // Voice
  asset({
    id: "voice_narrator_a",
    name: "Narrator A",
    category: "voice",
    description: "Warm primary narrator voice for brand storytelling.",
    tags: ["narrator", "warm", "primary"],
    moodTags: ["warm", "trustworthy"],
    energyTags: ["low", "medium"],
    duration: 0,
    language: "en",
  }),
  asset({
    id: "voice_narrator_b",
    name: "Narrator B",
    category: "voice",
    description: "Backup narrator with similar tone for continuity.",
    tags: ["narrator", "backup"],
    moodTags: ["warm", "steady"],
    energyTags: ["low", "medium"],
    duration: 0,
    language: "en",
  }),
  asset({
    id: "voice_character_lead",
    name: "Character Voice",
    category: "voice",
    description: "Primary character dialogue voice.",
    tags: ["character", "dialogue"],
    moodTags: ["natural", "expressive"],
    energyTags: ["medium"],
    duration: 0,
    language: "en",
  }),
  asset({
    id: "voice_documentary",
    name: "Documentary Narrator",
    category: "voice",
    description: "Neutral documentary narration voice.",
    tags: ["documentary", "narrator"],
    moodTags: ["neutral", "informative"],
    energyTags: ["low"],
    duration: 0,
    language: "en",
  }),
  asset({
    id: "voice_commercial",
    name: "Commercial Voice",
    category: "voice",
    description: "Polished commercial presenter voice.",
    tags: ["commercial", "presenter"],
    moodTags: ["confident", "clean"],
    energyTags: ["medium", "high"],
    duration: 0,
    language: "en",
  }),

  // Music
  asset({
    id: "music_community_intro",
    name: "Community Intro",
    category: "music",
    description: "Welcoming community opening bed.",
    tags: ["community", "intro", "warm"],
    moodTags: ["friendly", "human"],
    energyTags: ["low"],
    duration: 45,
    language: null,
  }),
  asset({
    id: "music_corporate_build",
    name: "Corporate Build",
    category: "music",
    description: "Clean corporate momentum bed.",
    tags: ["corporate", "build"],
    moodTags: ["professional", "clean"],
    energyTags: ["medium"],
    duration: 60,
    language: null,
  }),
  asset({
    id: "music_inspirational_growth",
    name: "Inspirational Growth",
    category: "music",
    description: "Uplifting build with piano and strings.",
    tags: ["inspirational", "build", "growth"],
    moodTags: ["hopeful", "uplifting"],
    energyTags: ["medium", "high"],
    duration: 55,
    language: null,
  }),
  asset({
    id: "music_documentary_ambient",
    name: "Documentary Ambient",
    category: "music",
    description: "Subtle documentary underscore pad.",
    tags: ["documentary", "ambient"],
    moodTags: ["natural", "observational"],
    energyTags: ["low"],
    duration: 50,
    language: null,
  }),
  asset({
    id: "music_epic_momentum",
    name: "Epic Momentum",
    category: "music",
    description: "Cinematic high-energy peak track.",
    tags: ["epic", "climax", "momentum"],
    moodTags: ["powerful", "cinematic"],
    energyTags: ["high"],
    duration: 48,
    language: null,
  }),
  asset({
    id: "music_corporate_resolution",
    name: "Corporate Resolution",
    category: "music",
    description: "Soft corporate outro bed.",
    tags: ["corporate", "resolution"],
    moodTags: ["calm", "resolved"],
    energyTags: ["low"],
    duration: 40,
    language: null,
  }),
  asset({
    id: "music_social_pulse",
    name: "Social Pulse",
    category: "music",
    description: "Rhythmic social media energy bed.",
    tags: ["social", "dynamic"],
    moodTags: ["energetic", "modern"],
    energyTags: ["medium", "high"],
    duration: 35,
    language: null,
  }),
  asset({
    id: "music_adventure_drive",
    name: "Adventure Drive",
    category: "music",
    description: "Forward-moving adventure underscore.",
    tags: ["adventure", "build"],
    moodTags: ["curious", "active"],
    energyTags: ["medium", "high"],
    duration: 52,
    language: null,
  }),

  // Ambience
  asset({
    id: "amb_birds",
    name: "Birds",
    category: "ambience",
    description: "Light outdoor birds ambience.",
    tags: ["nature", "outdoor"],
    moodTags: ["calm", "natural"],
    energyTags: ["low"],
    duration: 30,
    language: null,
  }),
  asset({
    id: "amb_light_wind",
    name: "Light Wind",
    category: "ambience",
    description: "Gentle wind through open space.",
    tags: ["wind", "nature"],
    moodTags: ["airy", "calm"],
    energyTags: ["low"],
    duration: 30,
    language: null,
  }),
  asset({
    id: "amb_crowd",
    name: "Crowd",
    category: "ambience",
    description: "Background crowd presence.",
    tags: ["crowd", "public"],
    moodTags: ["social", "busy"],
    energyTags: ["medium"],
    duration: 35,
    language: null,
  }),
  asset({
    id: "amb_kitchen",
    name: "Kitchen Ambience",
    category: "ambience",
    description: "Restaurant kitchen room tone.",
    tags: ["kitchen", "restaurant"],
    moodTags: ["warm", "active"],
    energyTags: ["medium"],
    duration: 40,
    language: null,
  }),
  asset({
    id: "amb_market",
    name: "Market Ambience",
    category: "ambience",
    description: "Outdoor marketplace atmosphere.",
    tags: ["market", "community"],
    moodTags: ["lively", "human"],
    energyTags: ["medium"],
    duration: 40,
    language: null,
  }),
  asset({
    id: "amb_office",
    name: "Office Room Tone",
    category: "ambience",
    description: "Subtle office ambience.",
    tags: ["office", "corporate"],
    moodTags: ["professional", "quiet"],
    energyTags: ["low"],
    duration: 35,
    language: null,
  }),
  asset({
    id: "amb_city_distant",
    name: "Distant City",
    category: "ambience",
    description: "Soft distant urban traffic bed.",
    tags: ["city", "urban"],
    moodTags: ["neutral"],
    energyTags: ["low", "medium"],
    duration: 35,
    language: null,
  }),

  // SFX
  asset({
    id: "sfx_footsteps",
    name: "Footsteps",
    category: "sfx",
    description: "Human footsteps on hard surface.",
    tags: ["character", "movement"],
    moodTags: ["neutral"],
    energyTags: ["medium"],
    duration: 4,
    language: null,
  }),
  asset({
    id: "sfx_door_open",
    name: "Door Open",
    category: "sfx",
    description: "Door open and close.",
    tags: ["door", "prop"],
    moodTags: ["neutral"],
    energyTags: ["low"],
    duration: 2,
    language: null,
  }),
  asset({
    id: "sfx_phone_notification",
    name: "Phone Notification",
    category: "sfx",
    description: "Smartphone notification chime.",
    tags: ["phone", "notification"],
    moodTags: ["alert"],
    energyTags: ["medium"],
    duration: 1,
    language: null,
  }),
  asset({
    id: "sfx_applause",
    name: "Applause",
    category: "sfx",
    description: "Light audience applause.",
    tags: ["crowd", "celebration"],
    moodTags: ["happy"],
    energyTags: ["high"],
    duration: 5,
    language: null,
  }),
  asset({
    id: "sfx_cooking",
    name: "Cooking Sizzle",
    category: "sfx",
    description: "Kitchen cooking and sizzle.",
    tags: ["kitchen", "cooking"],
    moodTags: ["active"],
    energyTags: ["medium"],
    duration: 6,
    language: null,
  }),
  asset({
    id: "sfx_whoosh",
    name: "Whoosh Transition",
    category: "sfx",
    description: "Scene transition whoosh.",
    tags: ["transition"],
    moodTags: ["dynamic"],
    energyTags: ["medium", "high"],
    duration: 2,
    language: null,
  }),
  asset({
    id: "sfx_impact",
    name: "Impact Hit",
    category: "sfx",
    description: "Punchy impact accent.",
    tags: ["action", "transition"],
    moodTags: ["intense"],
    energyTags: ["high"],
    duration: 1,
    language: null,
  }),
  asset({
    id: "sfx_vehicle",
    name: "Vehicle Pass",
    category: "sfx",
    description: "Vehicle pass-by.",
    tags: ["vehicle", "street"],
    moodTags: ["urban"],
    energyTags: ["medium"],
    duration: 5,
    language: null,
  }),
];

const assetById = new Map(STUDIO_AUDIO_ASSET_LIBRARY.map((a) => [a.id, a]));

export function getStudioAudioAsset(id: string): StudioAudioAsset | null {
  return assetById.get(id.trim()) ?? null;
}

export function listStudioAudioAssets(category?: AudioAssetCategory): StudioAudioAsset[] {
  if (!category) {
    return [...STUDIO_AUDIO_ASSET_LIBRARY];
  }
  return STUDIO_AUDIO_ASSET_LIBRARY.filter((a) => a.category === category);
}

export function searchStudioAudioAssets(params: {
  category?: AudioAssetCategory;
  query?: string;
  moodTag?: string;
  energyTag?: string;
}): StudioAudioAsset[] {
  const q = (params.query ?? "").trim().toLowerCase();
  return listStudioAudioAssets(params.category).filter((asset) => {
    if (params.moodTag && !asset.moodTags.includes(params.moodTag)) {
      return false;
    }
    if (params.energyTag && !asset.energyTags.includes(params.energyTag)) {
      return false;
    }
    if (!q) {
      return true;
    }
    const hay = [
      asset.name,
      asset.description,
      ...asset.tags,
      ...asset.moodTags,
      ...asset.energyTags,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function parseAssetIdList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function toAssignedAsset(
  asset: StudioAudioAsset,
  source: "recommended" | "override" = "recommended"
): import("@/types/studio-audio-asset-director").AssignedAudioAsset {
  return {
    assetId: asset.id,
    assetName: asset.name,
    category: asset.category,
    source,
  };
}
