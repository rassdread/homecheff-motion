/**
 * S.6E — ElevenLabs mapping (voice / music / sfx).
 * Structured mapping only — does not change ElevenLabs implementation.
 */

import type { ContinuityBundle } from "@/lib/studio-prompt-matrix/continuity-bundle";
import type { CreativeSpecification } from "@/lib/studio-prompt-matrix/creative-specification";
import {
  STUDIO_PROMPT_MATRIX_VERSION,
  STUDIO_PROVIDER_TRANSFORM_VERSION,
} from "@/lib/studio-prompt-matrix/types";

export type ElevenLabsVoiceMapping = {
  provider: "elevenlabs_tts" | "elevenlabs_clone";
  matrixVersion: typeof STUDIO_PROMPT_MATRIX_VERSION;
  providerTransformVersion: typeof STUDIO_PROVIDER_TRANSFORM_VERSION;
  experience: CreativeSpecification["experience"];
  characterId: string | null;
  voiceProvider: string | null;
  voiceProfileId: string | null;
  language: string | null;
  toneEmotion: string | null;
  script: string | null;
  locked: boolean;
};

export type ElevenLabsAudioMapping = {
  provider: "elevenlabs_music" | "elevenlabs_sfx";
  matrixVersion: typeof STUDIO_PROMPT_MATRIX_VERSION;
  providerTransformVersion: typeof STUDIO_PROVIDER_TRANSFORM_VERSION;
  experience: CreativeSpecification["experience"];
  mood: string | null;
  energy: string | null;
  durationSeconds: number | null;
  storyContext: string | null;
  worldAmbience: string | null;
};

export function mapVoiceTransform(input: {
  specification: CreativeSpecification;
  continuity: ContinuityBundle;
  mode?: "tts" | "clone";
}): ElevenLabsVoiceMapping {
  const voice =
    input.continuity.voice.find(
      (v) => v.characterId && v.characterId === input.specification.audio.voiceCharacterId
    ) ?? input.continuity.voice[0];

  return {
    provider: input.mode === "clone" ? "elevenlabs_clone" : "elevenlabs_tts",
    matrixVersion: STUDIO_PROMPT_MATRIX_VERSION,
    providerTransformVersion: STUDIO_PROVIDER_TRANSFORM_VERSION,
    experience: input.specification.experience,
    characterId: input.specification.audio.voiceCharacterId ?? voice?.characterId ?? null,
    voiceProvider: voice?.voiceProvider ?? null,
    voiceProfileId: voice?.voiceProfileId ?? null,
    language: input.specification.audio.language ?? voice?.language ?? null,
    toneEmotion: input.specification.performance.emotion,
    script: input.specification.audio.script,
    locked: voice?.locked ?? false,
  };
}

export function mapAudioTransform(input: {
  specification: CreativeSpecification;
  continuity: ContinuityBundle;
  kind: "music" | "sfx";
}): ElevenLabsAudioMapping {
  return {
    provider: input.kind === "music" ? "elevenlabs_music" : "elevenlabs_sfx",
    matrixVersion: STUDIO_PROMPT_MATRIX_VERSION,
    providerTransformVersion: STUDIO_PROVIDER_TRANSFORM_VERSION,
    experience: input.specification.experience,
    mood: input.specification.audio.mood,
    energy: input.specification.audio.energy,
    durationSeconds: input.specification.duration.resolvedSeconds,
    storyContext: input.specification.story.description ?? input.specification.story.title,
    worldAmbience: input.continuity.world?.tone ?? input.specification.environment.worldTone,
  };
}
