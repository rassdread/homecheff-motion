/**
 * S.6E — Canonical experience registry (many doors → few engines).
 */

import type { StudioCreativeExperienceId } from "@/lib/studio-prompt-matrix/experience-ids";
import type {
  StudioMatrixCompliance,
  StudioMatrixDetailLevel,
  StudioMatrixModality,
  StudioRuntimeProviderId,
} from "@/lib/studio-prompt-matrix/types";

export type StudioExperienceFamily =
  | "IDENTITY"
  | "PHOTO"
  | "VIDEO"
  | "MOTION"
  | "FUSION"
  | "SOCIAL"
  | "BUSINESS"
  | "FOOD"
  | "LIFESTYLE"
  | "FASHION"
  | "VOICE"
  | "AUDIO"
  | "BRAND"
  | "RENDER"
  | "PUBLISH"
  | "STORY";

export type StudioContinuityRequirement =
  | "none"
  | "optional"
  | "when_linked"
  | "source_image"
  | "fusion_refs";

export type StudioExperienceRegistryEntry = {
  experienceId: StudioCreativeExperienceId;
  family: StudioExperienceFamily;
  modality: StudioMatrixModality;
  continuityRequirements: StudioContinuityRequirement;
  supportedModes: StudioMatrixDetailLevel[];
  generationCapability: string | null;
  runtimeProvider: StudioRuntimeProviderId | null;
  resultType: "image" | "video" | "audio" | "voice" | "text" | "plan" | "mixed";
  compliance: StudioMatrixCompliance;
  status: "LIVE" | "PARTIAL" | "ADVANCED" | "LEGACY" | "EXPERIMENTAL";
};

const ALL_MODES: StudioMatrixDetailLevel[] = ["QUICK", "PROFESSIONAL", "DIRECTOR"];

export const STUDIO_EXPERIENCE_REGISTRY: Record<
  StudioCreativeExperienceId,
  StudioExperienceRegistryEntry
> = {
  SCENE_STILL: {
    experienceId: "SCENE_STILL",
    family: "PHOTO",
    modality: "image",
    continuityRequirements: "when_linked",
    supportedModes: ALL_MODES,
    generationCapability: "IMAGE_GENERATE",
    runtimeProvider: "openai_image",
    resultType: "image",
    compliance: "MATRIX_WRAPPED",
    status: "LIVE",
  },
  ASSET_REFERENCE_GENERATE: {
    experienceId: "ASSET_REFERENCE_GENERATE",
    family: "IDENTITY",
    modality: "image",
    continuityRequirements: "optional",
    supportedModes: ALL_MODES,
    generationCapability: null,
    runtimeProvider: "openai_image",
    resultType: "image",
    compliance: "MATRIX_PARTIAL",
    status: "LIVE",
  },
  VIDEO_INTENT: {
    experienceId: "VIDEO_INTENT",
    family: "VIDEO",
    modality: "planning",
    continuityRequirements: "when_linked",
    supportedModes: ALL_MODES,
    generationCapability: null,
    runtimeProvider: null,
    resultType: "plan",
    compliance: "MATRIX_PARTIAL",
    status: "LIVE",
  },
  RESTAURANT_PROMO: {
    experienceId: "RESTAURANT_PROMO",
    family: "FOOD",
    modality: "planning",
    continuityRequirements: "when_linked",
    supportedModes: ALL_MODES,
    generationCapability: null,
    runtimeProvider: null,
    resultType: "plan",
    compliance: "MATRIX_PARTIAL",
    status: "LIVE",
  },
  COOKING_SHOW: {
    experienceId: "COOKING_SHOW",
    family: "FOOD",
    modality: "planning",
    continuityRequirements: "when_linked",
    supportedModes: ALL_MODES,
    generationCapability: null,
    runtimeProvider: null,
    resultType: "plan",
    compliance: "MATRIX_PARTIAL",
    status: "LIVE",
  },
  FOOD_PROMO: {
    experienceId: "FOOD_PROMO",
    family: "FOOD",
    modality: "video",
    continuityRequirements: "source_image",
    supportedModes: ["QUICK", "PROFESSIONAL"],
    generationCapability: "VIDEO_GENERATE",
    runtimeProvider: "vidu_motion",
    resultType: "video",
    compliance: "MATRIX_WRAPPED",
    status: "LIVE",
  },
  SOCIAL_CAMPAIGN: {
    experienceId: "SOCIAL_CAMPAIGN",
    family: "SOCIAL",
    modality: "planning",
    continuityRequirements: "when_linked",
    supportedModes: ALL_MODES,
    generationCapability: null,
    runtimeProvider: null,
    resultType: "plan",
    compliance: "MATRIX_PARTIAL",
    status: "LIVE",
  },
  FASHION_REEL: {
    experienceId: "FASHION_REEL",
    family: "FASHION",
    modality: "planning",
    continuityRequirements: "when_linked",
    supportedModes: ALL_MODES,
    generationCapability: null,
    runtimeProvider: null,
    resultType: "plan",
    compliance: "MATRIX_PARTIAL",
    status: "LIVE",
  },
  OUTFIT_CHANGE: {
    experienceId: "OUTFIT_CHANGE",
    family: "FUSION",
    modality: "fusion",
    continuityRequirements: "fusion_refs",
    supportedModes: ALL_MODES,
    generationCapability: "FUSION_RENDER",
    runtimeProvider: "openai_image",
    resultType: "image",
    compliance: "MATRIX_WRAPPED",
    status: "LIVE",
  },
  CHARACTER_FUSION: {
    experienceId: "CHARACTER_FUSION",
    family: "FUSION",
    modality: "fusion",
    continuityRequirements: "fusion_refs",
    supportedModes: ALL_MODES,
    generationCapability: "FUSION_RENDER",
    runtimeProvider: "openai_image",
    resultType: "image",
    compliance: "MATRIX_WRAPPED",
    status: "LIVE",
  },
  PERSON_BACKGROUND: {
    experienceId: "PERSON_BACKGROUND",
    family: "FUSION",
    modality: "fusion",
    continuityRequirements: "fusion_refs",
    supportedModes: ALL_MODES,
    generationCapability: "FUSION_RENDER",
    runtimeProvider: "openai_image",
    resultType: "image",
    compliance: "MATRIX_WRAPPED",
    status: "LIVE",
  },
  PRODUCT_BRANDING: {
    experienceId: "PRODUCT_BRANDING",
    family: "BRAND",
    modality: "fusion",
    continuityRequirements: "fusion_refs",
    supportedModes: ALL_MODES,
    generationCapability: "FUSION_RENDER",
    runtimeProvider: "openai_image",
    resultType: "image",
    compliance: "MATRIX_WRAPPED",
    status: "LIVE",
  },
  MOTION_PRESET: {
    experienceId: "MOTION_PRESET",
    family: "MOTION",
    modality: "video",
    continuityRequirements: "source_image",
    supportedModes: ["QUICK", "PROFESSIONAL"],
    generationCapability: "VIDEO_GENERATE",
    runtimeProvider: "vidu_motion",
    resultType: "video",
    compliance: "MATRIX_WRAPPED",
    status: "LIVE",
  },
  INSTANT_PHOTO_TO_VIDEO: {
    experienceId: "INSTANT_PHOTO_TO_VIDEO",
    family: "MOTION",
    modality: "video",
    continuityRequirements: "source_image",
    supportedModes: ["QUICK", "PROFESSIONAL"],
    generationCapability: "VIDEO_GENERATE",
    runtimeProvider: "vidu_motion",
    resultType: "video",
    compliance: "MATRIX_WRAPPED",
    status: "LIVE",
  },
  STUDIO_MOTION_HANDOFF: {
    experienceId: "STUDIO_MOTION_HANDOFF",
    family: "MOTION",
    modality: "video",
    continuityRequirements: "when_linked",
    supportedModes: ALL_MODES,
    generationCapability: "VIDEO_GENERATE",
    runtimeProvider: "vidu_motion",
    resultType: "video",
    compliance: "MATRIX_WRAPPED",
    status: "LIVE",
  },
  VOICE_TTS: {
    experienceId: "VOICE_TTS",
    family: "VOICE",
    modality: "voice",
    continuityRequirements: "optional",
    supportedModes: ALL_MODES,
    generationCapability: "VOICE_TTS",
    runtimeProvider: "elevenlabs_tts",
    resultType: "voice",
    compliance: "MATRIX_PARTIAL",
    status: "LIVE",
  },
  VOICE_CLONE: {
    experienceId: "VOICE_CLONE",
    family: "VOICE",
    modality: "voice",
    continuityRequirements: "optional",
    supportedModes: ["PROFESSIONAL", "DIRECTOR"],
    generationCapability: "VOICE_CLONE",
    runtimeProvider: "elevenlabs_clone",
    resultType: "voice",
    compliance: "MATRIX_PARTIAL",
    status: "LIVE",
  },
  MUSIC_GENERATE: {
    experienceId: "MUSIC_GENERATE",
    family: "AUDIO",
    modality: "audio",
    continuityRequirements: "none",
    supportedModes: ALL_MODES,
    generationCapability: "MUSIC_GENERATE",
    runtimeProvider: "elevenlabs_music",
    resultType: "audio",
    compliance: "MATRIX_PARTIAL",
    status: "LIVE",
  },
  SFX_GENERATE: {
    experienceId: "SFX_GENERATE",
    family: "AUDIO",
    modality: "audio",
    continuityRequirements: "none",
    supportedModes: ALL_MODES,
    generationCapability: "SFX_GENERATE",
    runtimeProvider: "elevenlabs_sfx",
    resultType: "audio",
    compliance: "MATRIX_PARTIAL",
    status: "LIVE",
  },
  SUBTITLE_TRANSCRIBE: {
    experienceId: "SUBTITLE_TRANSCRIBE",
    family: "VOICE",
    modality: "audio",
    continuityRequirements: "none",
    supportedModes: ["PROFESSIONAL", "DIRECTOR"],
    generationCapability: "SUBTITLE_GENERATE",
    runtimeProvider: "elevenlabs_stt",
    resultType: "text",
    compliance: "LEGACY_UNMIGRATED",
    status: "PARTIAL",
  },
  TRANSLATE_EXPORT: {
    experienceId: "TRANSLATE_EXPORT",
    family: "PUBLISH",
    modality: "export",
    continuityRequirements: "none",
    supportedModes: ["PROFESSIONAL", "DIRECTOR"],
    generationCapability: "TRANSLATE",
    runtimeProvider: null,
    resultType: "mixed",
    compliance: "LEGACY_UNMIGRATED",
    status: "PARTIAL",
  },
  FUSION_EXPERIMENTAL: {
    experienceId: "FUSION_EXPERIMENTAL",
    family: "FUSION",
    modality: "fusion",
    continuityRequirements: "fusion_refs",
    supportedModes: ["PROFESSIONAL", "DIRECTOR"],
    generationCapability: "FUSION_RENDER",
    runtimeProvider: "openai_image",
    resultType: "image",
    compliance: "EXPERIMENTAL",
    status: "EXPERIMENTAL",
  },
  PUBLISH_EXPORT: {
    experienceId: "PUBLISH_EXPORT",
    family: "PUBLISH",
    modality: "export",
    continuityRequirements: "none",
    supportedModes: ALL_MODES,
    generationCapability: null,
    runtimeProvider: null,
    resultType: "mixed",
    compliance: "LEGACY_UNMIGRATED",
    status: "PARTIAL",
  },
  LEGACY_UNMAPPED: {
    experienceId: "LEGACY_UNMAPPED",
    family: "STORY",
    modality: "planning",
    continuityRequirements: "optional",
    supportedModes: ALL_MODES,
    generationCapability: null,
    runtimeProvider: null,
    resultType: "plan",
    compliance: "LEGACY_UNMIGRATED",
    status: "LEGACY",
  },
};

export function getExperienceRegistryEntry(
  experienceId: StudioCreativeExperienceId
): StudioExperienceRegistryEntry {
  return STUDIO_EXPERIENCE_REGISTRY[experienceId];
}

export function listExperiencesByCompliance(
  compliance: StudioMatrixCompliance
): StudioExperienceRegistryEntry[] {
  return Object.values(STUDIO_EXPERIENCE_REGISTRY).filter((e) => e.compliance === compliance);
}
