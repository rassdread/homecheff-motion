/**
 * S.7E — Subtitle Experience Packs → Matrix SUBTITLE_TRANSCRIBE (no new engines).
 */

import type { StudioCreativeExperienceId } from "@/lib/studio-prompt-matrix/experience-ids";
import type { StudioGenerationCapability } from "@/lib/studio-generation-capabilities";
import type { StudioSubtitleStyleId } from "@/lib/studio-subtitle-style";

export const STUDIO_SUBTITLE_EXPERIENCE_PACK_IDS = [
  "PODCAST_SUBTITLES",
  "MOVIE_SUBTITLES",
  "TIKTOK_CAPTIONS",
  "INSTAGRAM_CAPTIONS",
  "RESTAURANT_CAPTIONS",
  "COMMERCIAL_CAPTIONS",
  "ACCESSIBILITY_CAPTIONS",
  "EDUCATION_CAPTIONS",
  "PRESENTATION_CAPTIONS",
] as const;

export type StudioSubtitleExperiencePackId =
  (typeof STUDIO_SUBTITLE_EXPERIENCE_PACK_IDS)[number];

export type StudioSubtitleExperiencePack = {
  packId: StudioSubtitleExperiencePackId;
  label: string;
  status: "PARTIAL";
  matrixExperienceId: StudioCreativeExperienceId;
  generationCapability: StudioGenerationCapability;
  suggestedStyle: StudioSubtitleStyleId;
  productDoorHint: string;
};

export const STUDIO_SUBTITLE_EXPERIENCE_PACKS: Record<
  StudioSubtitleExperiencePackId,
  StudioSubtitleExperiencePack
> = {
  PODCAST_SUBTITLES: {
    packId: "PODCAST_SUBTITLES",
    label: "Podcast Subtitles",
    status: "PARTIAL",
    matrixExperienceId: "SUBTITLE_TRANSCRIBE",
    generationCapability: "SUBTITLE_GENERATE",
    suggestedStyle: "podcast",
    productDoorHint: "creative_podcast",
  },
  MOVIE_SUBTITLES: {
    packId: "MOVIE_SUBTITLES",
    label: "Movie Subtitles",
    status: "PARTIAL",
    matrixExperienceId: "SUBTITLE_TRANSCRIBE",
    generationCapability: "SUBTITLE_GENERATE",
    suggestedStyle: "cinema",
    productDoorHint: "creative_film",
  },
  TIKTOK_CAPTIONS: {
    packId: "TIKTOK_CAPTIONS",
    label: "TikTok Captions",
    status: "PARTIAL",
    matrixExperienceId: "SUBTITLE_TRANSCRIBE",
    generationCapability: "SUBTITLE_GENERATE",
    suggestedStyle: "social",
    productDoorHint: "social_tiktok",
  },
  INSTAGRAM_CAPTIONS: {
    packId: "INSTAGRAM_CAPTIONS",
    label: "Instagram Captions",
    status: "PARTIAL",
    matrixExperienceId: "SUBTITLE_TRANSCRIBE",
    generationCapability: "SUBTITLE_GENERATE",
    suggestedStyle: "social",
    productDoorHint: "social_instagram",
  },
  RESTAURANT_CAPTIONS: {
    packId: "RESTAURANT_CAPTIONS",
    label: "Restaurant Captions",
    status: "PARTIAL",
    matrixExperienceId: "SUBTITLE_TRANSCRIBE",
    generationCapability: "SUBTITLE_GENERATE",
    suggestedStyle: "commercial",
    productDoorHint: "business_restaurant",
  },
  COMMERCIAL_CAPTIONS: {
    packId: "COMMERCIAL_CAPTIONS",
    label: "Commercial Captions",
    status: "PARTIAL",
    matrixExperienceId: "SUBTITLE_TRANSCRIBE",
    generationCapability: "SUBTITLE_GENERATE",
    suggestedStyle: "commercial",
    productDoorHint: "business_commercial",
  },
  ACCESSIBILITY_CAPTIONS: {
    packId: "ACCESSIBILITY_CAPTIONS",
    label: "Accessibility Captions",
    status: "PARTIAL",
    matrixExperienceId: "SUBTITLE_TRANSCRIBE",
    generationCapability: "SUBTITLE_GENERATE",
    suggestedStyle: "accessibility",
    productDoorHint: "accessibility_captions",
  },
  EDUCATION_CAPTIONS: {
    packId: "EDUCATION_CAPTIONS",
    label: "Education Captions",
    status: "PARTIAL",
    matrixExperienceId: "SUBTITLE_TRANSCRIBE",
    generationCapability: "SUBTITLE_GENERATE",
    suggestedStyle: "documentary",
    productDoorHint: "education_captions",
  },
  PRESENTATION_CAPTIONS: {
    packId: "PRESENTATION_CAPTIONS",
    label: "Presentation Captions",
    status: "PARTIAL",
    matrixExperienceId: "SUBTITLE_TRANSCRIBE",
    generationCapability: "SUBTITLE_GENERATE",
    suggestedStyle: "default",
    productDoorHint: "creative_presentation",
  },
};

export function listStudioSubtitleExperiencePacks(): StudioSubtitleExperiencePack[] {
  return STUDIO_SUBTITLE_EXPERIENCE_PACK_IDS.map((id) => STUDIO_SUBTITLE_EXPERIENCE_PACKS[id]);
}
