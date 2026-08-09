/**
 * S.7E — Translation Experience Packs → Matrix TRANSLATE_EXPORT (no new engines).
 */

import type { StudioCreativeExperienceId } from "@/lib/studio-prompt-matrix/experience-ids";
import type { StudioGenerationCapability } from "@/lib/studio-generation-capabilities";
import type { StudioTranslationQuality } from "@/lib/studio-translation-studio";

export const STUDIO_TRANSLATION_EXPERIENCE_PACK_IDS = [
  "MARKETING_TRANSLATION",
  "BUSINESS_TRANSLATION",
  "MOVIE_LOCALIZATION",
  "RESTAURANT_LOCALIZATION",
  "HOMECHEFF_LOCALIZATION",
  "TRAVEL_LOCALIZATION",
  "SOCIAL_LOCALIZATION",
  "BRAND_LOCALIZATION",
] as const;

export type StudioTranslationExperiencePackId =
  (typeof STUDIO_TRANSLATION_EXPERIENCE_PACK_IDS)[number];

export type StudioTranslationExperiencePack = {
  packId: StudioTranslationExperiencePackId;
  label: string;
  status: "PARTIAL";
  matrixExperienceId: StudioCreativeExperienceId;
  generationCapability: StudioGenerationCapability;
  suggestedQuality: StudioTranslationQuality;
  productDoorHint: string;
};

export const STUDIO_TRANSLATION_EXPERIENCE_PACKS: Record<
  StudioTranslationExperiencePackId,
  StudioTranslationExperiencePack
> = {
  MARKETING_TRANSLATION: {
    packId: "MARKETING_TRANSLATION",
    label: "Marketing Translation",
    status: "PARTIAL",
    matrixExperienceId: "TRANSLATE_EXPORT",
    generationCapability: "TRANSLATE",
    suggestedQuality: "marketing",
    productDoorHint: "marketing_translation",
  },
  BUSINESS_TRANSLATION: {
    packId: "BUSINESS_TRANSLATION",
    label: "Business Translation",
    status: "PARTIAL",
    matrixExperienceId: "TRANSLATE_EXPORT",
    generationCapability: "TRANSLATE",
    suggestedQuality: "formal",
    productDoorHint: "business_translation",
  },
  MOVIE_LOCALIZATION: {
    packId: "MOVIE_LOCALIZATION",
    label: "Movie Localization",
    status: "PARTIAL",
    matrixExperienceId: "TRANSLATE_EXPORT",
    generationCapability: "TRANSLATE",
    suggestedQuality: "creative",
    productDoorHint: "creative_film",
  },
  RESTAURANT_LOCALIZATION: {
    packId: "RESTAURANT_LOCALIZATION",
    label: "Restaurant Localization",
    status: "PARTIAL",
    matrixExperienceId: "TRANSLATE_EXPORT",
    generationCapability: "TRANSLATE",
    suggestedQuality: "marketing",
    productDoorHint: "business_restaurant",
  },
  HOMECHEFF_LOCALIZATION: {
    packId: "HOMECHEFF_LOCALIZATION",
    label: "HomeCheff Localization",
    status: "PARTIAL",
    matrixExperienceId: "TRANSLATE_EXPORT",
    generationCapability: "TRANSLATE",
    suggestedQuality: "brand_safe",
    productDoorHint: "business_homecheff",
  },
  TRAVEL_LOCALIZATION: {
    packId: "TRAVEL_LOCALIZATION",
    label: "Travel Localization",
    status: "PARTIAL",
    matrixExperienceId: "TRANSLATE_EXPORT",
    generationCapability: "TRANSLATE",
    suggestedQuality: "informal",
    productDoorHint: "creative_travel_vlog",
  },
  SOCIAL_LOCALIZATION: {
    packId: "SOCIAL_LOCALIZATION",
    label: "Social Localization",
    status: "PARTIAL",
    matrixExperienceId: "TRANSLATE_EXPORT",
    generationCapability: "TRANSLATE",
    suggestedQuality: "informal",
    productDoorHint: "social_localization",
  },
  BRAND_LOCALIZATION: {
    packId: "BRAND_LOCALIZATION",
    label: "Brand Localization",
    status: "PARTIAL",
    matrixExperienceId: "TRANSLATE_EXPORT",
    generationCapability: "TRANSLATE",
    suggestedQuality: "brand_safe",
    productDoorHint: "brand_localization",
  },
};

export function listStudioTranslationExperiencePacks(): StudioTranslationExperiencePack[] {
  return STUDIO_TRANSLATION_EXPERIENCE_PACK_IDS.map(
    (id) => STUDIO_TRANSLATION_EXPERIENCE_PACKS[id]
  );
}
