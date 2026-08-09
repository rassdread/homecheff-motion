/**
 * S.7B — Creative Director audio boundary.
 * Directors PLAN / RECOMMEND / WRITE_METADATA / HANDOFF — never call ElevenLabs.
 */

export type CreativeDirectorAudioFunction =
  | "PLAN"
  | "RECOMMEND"
  | "WRITE_METADATA"
  | "HANDOFF";

export type CreativeDirectorAudioRole =
  | "MusicDirector"
  | "SoundDirector"
  | "AudioProductionDirector"
  | "AudioAssetDirector"
  | "VoiceIdentityDirector";

export const CREATIVE_DIRECTOR_AUDIO_BOUNDARY: Record<
  CreativeDirectorAudioRole,
  { functions: CreativeDirectorAudioFunction[]; mayCallElevenLabs: false }
> = {
  MusicDirector: {
    functions: ["PLAN", "RECOMMEND", "WRITE_METADATA", "HANDOFF"],
    mayCallElevenLabs: false,
  },
  SoundDirector: {
    functions: ["PLAN", "RECOMMEND", "WRITE_METADATA", "HANDOFF"],
    mayCallElevenLabs: false,
  },
  AudioProductionDirector: {
    functions: ["PLAN", "WRITE_METADATA", "HANDOFF"],
    mayCallElevenLabs: false,
  },
  AudioAssetDirector: {
    functions: ["RECOMMEND", "WRITE_METADATA", "HANDOFF"],
    mayCallElevenLabs: false,
  },
  VoiceIdentityDirector: {
    functions: ["PLAN", "WRITE_METADATA", "HANDOFF"],
    mayCallElevenLabs: false,
  },
};

/** Experience pack preparation status — full packs wait for S.7H. */
export const STUDIO_AUDIO_EXPERIENCE_PACK_STATUS = {
  VoiceStudio: "ENGINE_ONLY",
  VoiceCloneStudio: "ENGINE_ONLY",
  MusicStudio: "ENGINE_ONLY",
  SfxStudio: "ENGINE_ONLY",
  SubtitleStudio: "PARTIAL",
  TranslateStudio: "PARTIAL",
} as const;
