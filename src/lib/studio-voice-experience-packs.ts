/**
 * S.7C — Voice Experience Packs.
 * Map onto existing Matrix capabilities — no new engines.
 */

import type { StudioCreativeExperienceId } from "@/lib/studio-prompt-matrix/experience-ids";
import type { StudioGenerationCapability } from "@/lib/studio-generation-capabilities";
import type { StudioVoiceStyle } from "@/lib/studio-voice-style";
import type { StudioDialogueConversationMode } from "@/lib/studio-dialogue-system";

export const STUDIO_VOICE_EXPERIENCE_PACK_IDS = [
  "VOICE_STUDIO",
  "PODCAST_STUDIO",
  "NARRATOR_STUDIO",
  "CHARACTER_DIALOGUE_STUDIO",
  "COMMERCIAL_VOICE_STUDIO",
  "AUDIOBOOK_STUDIO",
  "RESTAURANT_NARRATOR",
  "HOMECHEFF_VOICE",
  "MOVIE_NARRATOR",
  "STORYTELLING_STUDIO",
  "VOICE_CLONE_STUDIO",
] as const;

export type StudioVoiceExperiencePackId = (typeof STUDIO_VOICE_EXPERIENCE_PACK_IDS)[number];

export type StudioVoiceExperiencePackStatus = "ENGINE_ONLY" | "PARTIAL" | "LIVE";

export type StudioVoiceExperiencePack = {
  packId: StudioVoiceExperiencePackId;
  label: string;
  status: StudioVoiceExperiencePackStatus;
  matrixExperienceId: StudioCreativeExperienceId;
  generationCapability: StudioGenerationCapability;
  suggestedStyle: StudioVoiceStyle | null;
  suggestedConversationMode: StudioDialogueConversationMode | null;
  /** Maps into openExperience / Creative Director — no second engine */
  productDoorHint: string;
};

export const STUDIO_VOICE_EXPERIENCE_PACKS: Record<
  StudioVoiceExperiencePackId,
  StudioVoiceExperiencePack
> = {
  VOICE_STUDIO: {
    packId: "VOICE_STUDIO",
    label: "Voice Studio",
    status: "PARTIAL",
    matrixExperienceId: "VOICE_TTS",
    generationCapability: "VOICE_TTS",
    suggestedStyle: "presentation",
    suggestedConversationMode: "single_speaker",
    productDoorHint: "voice_studio",
  },
  PODCAST_STUDIO: {
    packId: "PODCAST_STUDIO",
    label: "Podcast Studio",
    status: "PARTIAL",
    matrixExperienceId: "VOICE_TTS",
    generationCapability: "VOICE_TTS",
    suggestedStyle: "podcast",
    suggestedConversationMode: "podcast",
    productDoorHint: "creative_podcast",
  },
  NARRATOR_STUDIO: {
    packId: "NARRATOR_STUDIO",
    label: "Narrator Studio",
    status: "PARTIAL",
    matrixExperienceId: "VOICE_TTS",
    generationCapability: "VOICE_TTS",
    suggestedStyle: "documentary",
    suggestedConversationMode: "storytelling",
    productDoorHint: "narrator_studio",
  },
  CHARACTER_DIALOGUE_STUDIO: {
    packId: "CHARACTER_DIALOGUE_STUDIO",
    label: "Character Dialogue Studio",
    status: "PARTIAL",
    matrixExperienceId: "VOICE_TTS",
    generationCapability: "VOICE_TTS",
    suggestedStyle: "movie",
    suggestedConversationMode: "conversation",
    productDoorHint: "character_dialogue",
  },
  COMMERCIAL_VOICE_STUDIO: {
    packId: "COMMERCIAL_VOICE_STUDIO",
    label: "Commercial Voice Studio",
    status: "PARTIAL",
    matrixExperienceId: "VOICE_TTS",
    generationCapability: "VOICE_TTS",
    suggestedStyle: "commercial",
    suggestedConversationMode: "commercial",
    productDoorHint: "commercial_voice",
  },
  AUDIOBOOK_STUDIO: {
    packId: "AUDIOBOOK_STUDIO",
    label: "Audiobook Studio",
    status: "PARTIAL",
    matrixExperienceId: "VOICE_TTS",
    generationCapability: "VOICE_TTS",
    suggestedStyle: "audiobook",
    suggestedConversationMode: "storytelling",
    productDoorHint: "audiobook_studio",
  },
  RESTAURANT_NARRATOR: {
    packId: "RESTAURANT_NARRATOR",
    label: "Restaurant Narrator",
    status: "PARTIAL",
    matrixExperienceId: "VOICE_TTS",
    generationCapability: "VOICE_TTS",
    suggestedStyle: "restaurant",
    suggestedConversationMode: "single_speaker",
    productDoorHint: "business_restaurant",
  },
  HOMECHEFF_VOICE: {
    packId: "HOMECHEFF_VOICE",
    label: "HomeCheff Voice",
    status: "PARTIAL",
    matrixExperienceId: "VOICE_TTS",
    generationCapability: "VOICE_TTS",
    suggestedStyle: "homecheff",
    suggestedConversationMode: "single_speaker",
    productDoorHint: "business_homecheff",
  },
  MOVIE_NARRATOR: {
    packId: "MOVIE_NARRATOR",
    label: "Movie Narrator",
    status: "PARTIAL",
    matrixExperienceId: "VOICE_TTS",
    generationCapability: "VOICE_TTS",
    suggestedStyle: "movie",
    suggestedConversationMode: "storytelling",
    productDoorHint: "creative_film",
  },
  STORYTELLING_STUDIO: {
    packId: "STORYTELLING_STUDIO",
    label: "Storytelling Studio",
    status: "PARTIAL",
    matrixExperienceId: "VOICE_TTS",
    generationCapability: "VOICE_TTS",
    suggestedStyle: "audiobook",
    suggestedConversationMode: "storytelling",
    productDoorHint: "storytelling_studio",
  },
  VOICE_CLONE_STUDIO: {
    packId: "VOICE_CLONE_STUDIO",
    label: "Voice Clone Studio",
    status: "PARTIAL",
    matrixExperienceId: "VOICE_CLONE",
    generationCapability: "VOICE_CLONE",
    suggestedStyle: null,
    suggestedConversationMode: null,
    productDoorHint: "voice_clone_studio",
  },
};

export function getStudioVoiceExperiencePack(
  packId: StudioVoiceExperiencePackId
): StudioVoiceExperiencePack {
  return STUDIO_VOICE_EXPERIENCE_PACKS[packId];
}

export function listStudioVoiceExperiencePacks(): StudioVoiceExperiencePack[] {
  return STUDIO_VOICE_EXPERIENCE_PACK_IDS.map((id) => STUDIO_VOICE_EXPERIENCE_PACKS[id]);
}

/** openExperience-compatible door input — no second Director API. */
export function voicePackToOpenExperienceInput(packId: StudioVoiceExperiencePackId): {
  doorHint: string;
  entryFan: string;
  videoIntent: string;
  preferProfessional: boolean;
} {
  const pack = getStudioVoiceExperiencePack(packId);
  return {
    doorHint: pack.productDoorHint,
    entryFan: "voice_experience_pack",
    videoIntent: pack.packId.toLowerCase(),
    preferProfessional: true,
  };
}
