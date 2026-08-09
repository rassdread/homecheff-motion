/**
 * S.7D — Music Experience Packs (map onto MUSIC_GENERATE — no new engines).
 */

import type { StudioCreativeExperienceId } from "@/lib/studio-prompt-matrix/experience-ids";
import type { StudioGenerationCapability } from "@/lib/studio-generation-capabilities";

export const STUDIO_MUSIC_EXPERIENCE_PACK_IDS = [
  "MUSIC_STUDIO",
  "RESTAURANT_MUSIC",
  "HOMECHEFF_MUSIC",
  "COMMERCIAL_MUSIC",
  "PODCAST_MUSIC",
  "MOVIE_MUSIC",
  "DOCUMENTARY_MUSIC",
  "SOCIAL_MUSIC",
  "LUXURY_MUSIC",
  "TRAVEL_MUSIC",
  "WORKOUT_MUSIC",
] as const;

export type StudioMusicExperiencePackId = (typeof STUDIO_MUSIC_EXPERIENCE_PACK_IDS)[number];

export type StudioMusicExperiencePack = {
  packId: StudioMusicExperiencePackId;
  label: string;
  status: "PARTIAL" | "ENGINE_ONLY" | "LIVE";
  matrixExperienceId: StudioCreativeExperienceId;
  generationCapability: StudioGenerationCapability;
  suggestedGenre: string | null;
  suggestedMood: string | null;
  productDoorHint: string;
};

export const STUDIO_MUSIC_EXPERIENCE_PACKS: Record<
  StudioMusicExperiencePackId,
  StudioMusicExperiencePack
> = {
  MUSIC_STUDIO: {
    packId: "MUSIC_STUDIO",
    label: "Music Studio",
    status: "PARTIAL",
    matrixExperienceId: "MUSIC_GENERATE",
    generationCapability: "MUSIC_GENERATE",
    suggestedGenre: "cinematic",
    suggestedMood: "warm",
    productDoorHint: "music_studio",
  },
  RESTAURANT_MUSIC: {
    packId: "RESTAURANT_MUSIC",
    label: "Restaurant Music",
    status: "PARTIAL",
    matrixExperienceId: "MUSIC_GENERATE",
    generationCapability: "MUSIC_GENERATE",
    suggestedGenre: "acoustic",
    suggestedMood: "warm",
    productDoorHint: "business_restaurant",
  },
  HOMECHEFF_MUSIC: {
    packId: "HOMECHEFF_MUSIC",
    label: "HomeCheff Music",
    status: "PARTIAL",
    matrixExperienceId: "MUSIC_GENERATE",
    generationCapability: "MUSIC_GENERATE",
    suggestedGenre: "folk",
    suggestedMood: "warm",
    productDoorHint: "business_homecheff",
  },
  COMMERCIAL_MUSIC: {
    packId: "COMMERCIAL_MUSIC",
    label: "Commercial Music",
    status: "PARTIAL",
    matrixExperienceId: "MUSIC_GENERATE",
    generationCapability: "MUSIC_GENERATE",
    suggestedGenre: "corporate",
    suggestedMood: "energetic",
    productDoorHint: "business_commercial",
  },
  PODCAST_MUSIC: {
    packId: "PODCAST_MUSIC",
    label: "Podcast Music",
    status: "PARTIAL",
    matrixExperienceId: "MUSIC_GENERATE",
    generationCapability: "MUSIC_GENERATE",
    suggestedGenre: "ambient",
    suggestedMood: "calm",
    productDoorHint: "creative_podcast",
  },
  MOVIE_MUSIC: {
    packId: "MOVIE_MUSIC",
    label: "Movie Music",
    status: "PARTIAL",
    matrixExperienceId: "MUSIC_GENERATE",
    generationCapability: "MUSIC_GENERATE",
    suggestedGenre: "cinematic",
    suggestedMood: "cinematic",
    productDoorHint: "creative_film",
  },
  DOCUMENTARY_MUSIC: {
    packId: "DOCUMENTARY_MUSIC",
    label: "Documentary Music",
    status: "PARTIAL",
    matrixExperienceId: "MUSIC_GENERATE",
    generationCapability: "MUSIC_GENERATE",
    suggestedGenre: "documentary",
    suggestedMood: "calm",
    productDoorHint: "creative_documentary",
  },
  SOCIAL_MUSIC: {
    packId: "SOCIAL_MUSIC",
    label: "Social Music",
    status: "PARTIAL",
    matrixExperienceId: "MUSIC_GENERATE",
    generationCapability: "MUSIC_GENERATE",
    suggestedGenre: "pop",
    suggestedMood: "energetic",
    productDoorHint: "social_tiktok",
  },
  LUXURY_MUSIC: {
    packId: "LUXURY_MUSIC",
    label: "Luxury Music",
    status: "PARTIAL",
    matrixExperienceId: "MUSIC_GENERATE",
    generationCapability: "MUSIC_GENERATE",
    suggestedGenre: "elegant",
    suggestedMood: "calm",
    productDoorHint: "luxury_music",
  },
  TRAVEL_MUSIC: {
    packId: "TRAVEL_MUSIC",
    label: "Travel Music",
    status: "PARTIAL",
    matrixExperienceId: "MUSIC_GENERATE",
    generationCapability: "MUSIC_GENERATE",
    suggestedGenre: "world",
    suggestedMood: "warm",
    productDoorHint: "creative_travel_vlog",
  },
  WORKOUT_MUSIC: {
    packId: "WORKOUT_MUSIC",
    label: "Workout Music",
    status: "PARTIAL",
    matrixExperienceId: "MUSIC_GENERATE",
    generationCapability: "MUSIC_GENERATE",
    suggestedGenre: "electronic",
    suggestedMood: "energetic",
    productDoorHint: "workout_music",
  },
};

export function listStudioMusicExperiencePacks(): StudioMusicExperiencePack[] {
  return STUDIO_MUSIC_EXPERIENCE_PACK_IDS.map((id) => STUDIO_MUSIC_EXPERIENCE_PACKS[id]);
}

export function musicPackToOpenExperienceInput(packId: StudioMusicExperiencePackId) {
  const pack = STUDIO_MUSIC_EXPERIENCE_PACKS[packId];
  return {
    doorHint: pack.productDoorHint,
    entryFan: "music_experience_pack",
    videoIntent: pack.packId.toLowerCase(),
    preferProfessional: true,
  };
}
