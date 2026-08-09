/**
 * S.7B — Provider-neutral AudioSpecification.
 * Metadata / intent only — not provider prompt syntax.
 */

import type { StudioAudioOwnershipScope } from "@/lib/studio-audio-ownership";
import type { StudioGenerationCapability } from "@/lib/studio-generation-capabilities";
import type { StudioCreativeExperienceId } from "@/lib/studio-prompt-matrix/experience-ids";

export type AudioSpecificationCapability =
  | "VOICE_TTS"
  | "VOICE_CLONE"
  | "MUSIC_GENERATE"
  | "SFX_GENERATE"
  | "SUBTITLE_TRANSCRIBE"
  | "TRANSLATE_EXPORT"
  | "AUDIO_MIX";

export type AudioSpecification = {
  version: "7b.1";
  capability: AudioSpecificationCapability;
  scope: StudioAudioOwnershipScope;
  /** Matrix experience id when mapped */
  matrixExperienceId: StudioCreativeExperienceId | null;
  generationCapability: StudioGenerationCapability | null;
  characterVoice: {
    characterId: string | null;
    voiceProfile: string | null;
    voiceProvider: string | null;
    language: string | null;
    locked: boolean;
  } | null;
  narratorVoice: {
    voiceProfile: string | null;
    voiceProvider: string | null;
    language: string | null;
  } | null;
  language: string | null;
  script: string | null;
  emotion: string | null;
  pace: string | null;
  music: {
    assetId: string | null;
    style: string | null;
    mood: string | null;
    durationSeconds: number | null;
    prompt: string | null;
  } | null;
  sfx: {
    assetId: string | null;
    category: string | null;
    prompt: string | null;
    durationSeconds: number | null;
    /** Honest: current render is one bed, not timed hits. */
    renderSemantics: "project_bed" | "planning_cue_only";
  } | null;
  ambience: {
    /** Ambience is SFX subtype */
    asSfxSubtype: true;
    category: string | null;
  } | null;
  durationSeconds: number | null;
  timing: {
    startBehavior: string | null;
    endBehavior: string | null;
  } | null;
  subtitleIntent: {
    language: string | null;
    burnIn: boolean | null;
  } | null;
  translationIntent: {
    /** Overlay/language-export only — not dubbing */
    mode: "overlay_export" | "not_dubbing";
    targetLanguage: string | null;
  } | null;
  mixIntent: {
    duckingMode: string | null;
    voiceLevel: number | null;
    musicLevel: number | null;
    sfxLevel: number | null;
  } | null;
  brandAudio: {
    voiceAssetId: string | null;
    musicAssetId: string | null;
    /** Contract only — not auto-wired into mix in S.7B */
    wired: false;
  } | null;
};

const MATRIX_MAP: Record<
  AudioSpecificationCapability,
  StudioCreativeExperienceId | null
> = {
  VOICE_TTS: "VOICE_TTS",
  VOICE_CLONE: "VOICE_CLONE",
  MUSIC_GENERATE: "MUSIC_GENERATE",
  SFX_GENERATE: "SFX_GENERATE",
  SUBTITLE_TRANSCRIBE: "SUBTITLE_TRANSCRIBE",
  TRANSLATE_EXPORT: "TRANSLATE_EXPORT",
  AUDIO_MIX: null,
};

const GEN_MAP: Record<AudioSpecificationCapability, StudioGenerationCapability | null> = {
  VOICE_TTS: "VOICE_TTS",
  VOICE_CLONE: "VOICE_CLONE",
  MUSIC_GENERATE: "MUSIC_GENERATE",
  SFX_GENERATE: "SFX_GENERATE",
  SUBTITLE_TRANSCRIBE: "SUBTITLE_GENERATE",
  TRANSLATE_EXPORT: "TRANSLATE",
  AUDIO_MIX: null,
};

export function emptyAudioSpecification(
  capability: AudioSpecificationCapability,
  scope: StudioAudioOwnershipScope
): AudioSpecification {
  return {
    version: "7b.1",
    capability,
    scope,
    matrixExperienceId: MATRIX_MAP[capability],
    generationCapability: GEN_MAP[capability],
    characterVoice: null,
    narratorVoice: null,
    language: null,
    script: null,
    emotion: null,
    pace: null,
    music: null,
    sfx: null,
    ambience: null,
    durationSeconds: null,
    timing: null,
    subtitleIntent: null,
    translationIntent: null,
    mixIntent: null,
    brandAudio: { voiceAssetId: null, musicAssetId: null, wired: false },
  };
}

/** Quick intent → AudioSpecification seed (no UI required in S.7B). */
export function audioSpecificationFromQuickIntent(
  intent:
    | "add_voice_over"
    | "use_character_voice"
    | "create_music"
    | "create_sound"
    | "create_subtitles"
    | "translate_video"
): AudioSpecification {
  switch (intent) {
    case "add_voice_over":
      return emptyAudioSpecification("VOICE_TTS", "NARRATION");
    case "use_character_voice":
      return emptyAudioSpecification("VOICE_TTS", "CHARACTER_VOICE");
    case "create_music":
      return emptyAudioSpecification("MUSIC_GENERATE", "PROJECT_MUSIC");
    case "create_sound":
      return emptyAudioSpecification("SFX_GENERATE", "SCENE_SFX");
    case "create_subtitles":
      return emptyAudioSpecification("SUBTITLE_TRANSCRIBE", "SUBTITLES");
    case "translate_video": {
      const spec = emptyAudioSpecification("TRANSLATE_EXPORT", "TRANSLATION");
      spec.translationIntent = { mode: "overlay_export", targetLanguage: null };
      return spec;
    }
    default: {
      const _x: never = intent;
      return _x;
    }
  }
}
