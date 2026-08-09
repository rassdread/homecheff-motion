/**
 * S.7D — SFX Experience Packs (map onto SFX_GENERATE — no new engines).
 */

import type { StudioCreativeExperienceId } from "@/lib/studio-prompt-matrix/experience-ids";
import type { StudioGenerationCapability } from "@/lib/studio-generation-capabilities";

export const STUDIO_SFX_EXPERIENCE_PACK_IDS = [
  "RESTAURANT_SOUNDS",
  "KITCHEN_SOUNDS",
  "NATURE_SOUNDS",
  "CITY_SOUNDS",
  "OFFICE_SOUNDS",
  "CROWD_SOUNDS",
  "ACTION_SOUNDS",
  "CINEMATIC_FX",
  "COMEDY_FX",
  "TRANSITION_FX",
] as const;

export type StudioSfxExperiencePackId = (typeof STUDIO_SFX_EXPERIENCE_PACK_IDS)[number];

export type StudioSfxExperiencePack = {
  packId: StudioSfxExperiencePackId;
  label: string;
  status: "PARTIAL" | "ENGINE_ONLY" | "LIVE";
  matrixExperienceId: StudioCreativeExperienceId;
  generationCapability: StudioGenerationCapability;
  suggestedCategory: string;
  productDoorHint: string;
};

export const STUDIO_SFX_EXPERIENCE_PACKS: Record<
  StudioSfxExperiencePackId,
  StudioSfxExperiencePack
> = {
  RESTAURANT_SOUNDS: {
    packId: "RESTAURANT_SOUNDS",
    label: "Restaurant Sounds",
    status: "PARTIAL",
    matrixExperienceId: "SFX_GENERATE",
    generationCapability: "SFX_GENERATE",
    suggestedCategory: "ambience",
    productDoorHint: "business_restaurant",
  },
  KITCHEN_SOUNDS: {
    packId: "KITCHEN_SOUNDS",
    label: "Kitchen Sounds",
    status: "PARTIAL",
    matrixExperienceId: "SFX_GENERATE",
    generationCapability: "SFX_GENERATE",
    suggestedCategory: "ambience",
    productDoorHint: "business_homecheff",
  },
  NATURE_SOUNDS: {
    packId: "NATURE_SOUNDS",
    label: "Nature Sounds",
    status: "PARTIAL",
    matrixExperienceId: "SFX_GENERATE",
    generationCapability: "SFX_GENERATE",
    suggestedCategory: "nature",
    productDoorHint: "nature_sounds",
  },
  CITY_SOUNDS: {
    packId: "CITY_SOUNDS",
    label: "City Sounds",
    status: "PARTIAL",
    matrixExperienceId: "SFX_GENERATE",
    generationCapability: "SFX_GENERATE",
    suggestedCategory: "city",
    productDoorHint: "city_sounds",
  },
  OFFICE_SOUNDS: {
    packId: "OFFICE_SOUNDS",
    label: "Office Sounds",
    status: "PARTIAL",
    matrixExperienceId: "SFX_GENERATE",
    generationCapability: "SFX_GENERATE",
    suggestedCategory: "ambience",
    productDoorHint: "office_sounds",
  },
  CROWD_SOUNDS: {
    packId: "CROWD_SOUNDS",
    label: "Crowd Sounds",
    status: "PARTIAL",
    matrixExperienceId: "SFX_GENERATE",
    generationCapability: "SFX_GENERATE",
    suggestedCategory: "crowd",
    productDoorHint: "crowd_sounds",
  },
  ACTION_SOUNDS: {
    packId: "ACTION_SOUNDS",
    label: "Action Sounds",
    status: "PARTIAL",
    matrixExperienceId: "SFX_GENERATE",
    generationCapability: "SFX_GENERATE",
    suggestedCategory: "impact",
    productDoorHint: "action_sounds",
  },
  CINEMATIC_FX: {
    packId: "CINEMATIC_FX",
    label: "Cinematic FX",
    status: "PARTIAL",
    matrixExperienceId: "SFX_GENERATE",
    generationCapability: "SFX_GENERATE",
    suggestedCategory: "whoosh",
    productDoorHint: "cinematic_fx",
  },
  COMEDY_FX: {
    packId: "COMEDY_FX",
    label: "Comedy FX",
    status: "PARTIAL",
    matrixExperienceId: "SFX_GENERATE",
    generationCapability: "SFX_GENERATE",
    suggestedCategory: "custom",
    productDoorHint: "comedy_fx",
  },
  TRANSITION_FX: {
    packId: "TRANSITION_FX",
    label: "Transition FX",
    status: "PARTIAL",
    matrixExperienceId: "SFX_GENERATE",
    generationCapability: "SFX_GENERATE",
    suggestedCategory: "transition",
    productDoorHint: "transition_fx",
  },
};

export function listStudioSfxExperiencePacks(): StudioSfxExperiencePack[] {
  return STUDIO_SFX_EXPERIENCE_PACK_IDS.map((id) => STUDIO_SFX_EXPERIENCE_PACKS[id]);
}

export function sfxPackToOpenExperienceInput(packId: StudioSfxExperiencePackId) {
  const pack = STUDIO_SFX_EXPERIENCE_PACKS[packId];
  return {
    doorHint: pack.productDoorHint,
    entryFan: "sfx_experience_pack",
    videoIntent: pack.packId.toLowerCase(),
    preferProfessional: true,
  };
}
