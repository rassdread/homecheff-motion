/**
 * S.7B — Formal FFmpeg audio mix contract (current product truth).
 * Not an NLE timeline — voice ± one music bed ± one SFX/ambience bed.
 */

export type StudioAudioMixContract = {
  version: "7b.1";
  /** Honest current capability */
  semantics: "static_beds_not_timeline";
  inputs: {
    voiceNarrationUrl: string | null;
    musicBedUrl: string | null;
    /** One bed only — planning cues are not timed hits. */
    sfxBedUrl: string | null;
    /** Subtitle burn-in is separate from audio mix. */
    subtitleBurnInSeparate: true;
  };
  levels: {
    voice: number;
    music: number;
    sfx: number;
  };
  ducking: {
    mode: string | null;
    enabled: boolean;
  };
  fade: {
    inSeconds: number | null;
    outSeconds: number | null;
  };
  duration: {
    targetSeconds: number | null;
    fitToVoice: boolean;
  };
  looping: {
    musicLoops: boolean;
    sfxLoops: boolean;
  };
  output: {
    format: "aac" | "mp3" | "wav" | "unknown";
    muxedWithVideo: boolean;
  };
};

export function defaultStudioAudioMixContract(
  partial?: Partial<StudioAudioMixContract>
): StudioAudioMixContract {
  return {
    version: "7b.1",
    semantics: "static_beds_not_timeline",
    inputs: {
      voiceNarrationUrl: null,
      musicBedUrl: null,
      sfxBedUrl: null,
      subtitleBurnInSeparate: true,
    },
    levels: {
      voice: 1,
      music: 0.35,
      sfx: 0.45,
    },
    ducking: {
      mode: "voice_priority",
      enabled: true,
    },
    fade: {
      inSeconds: null,
      outSeconds: null,
    },
    duration: {
      targetSeconds: null,
      fitToVoice: true,
    },
    looping: {
      musicLoops: true,
      sfxLoops: true,
    },
    output: {
      format: "aac",
      muxedWithVideo: true,
    },
    ...partial,
  };
}
