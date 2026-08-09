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
  | "VoiceIdentityDirector"
  | "VoicePerformanceDirector";

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
  /** S.7C — recommend emotion/delivery/pace only */
  VoicePerformanceDirector: {
    functions: ["RECOMMEND", "PLAN"],
    mayCallElevenLabs: false,
  },
};

/** Experience pack status — S.7C voice + S.7D music/sfx packs are PARTIAL. */
export const STUDIO_AUDIO_EXPERIENCE_PACK_STATUS = {
  VoiceStudio: "PARTIAL",
  VoiceCloneStudio: "PARTIAL",
  MusicStudio: "PARTIAL",
  SfxStudio: "PARTIAL",
  SubtitleStudio: "PARTIAL",
  TranslateStudio: "PARTIAL",
} as const;
