import type { MotionSubtitleTrackHandoff } from "@/types/studio-voice-execution";

export const MOTION_AUDIO_EXPORT_JSON_VERSION = 1 as const;

export type MotionSubtitleExportMode = "off" | "burn_in" | "metadata_only";

/** Persisted on AnimationProject.studioHandoffJson.motionAudioExport (no extra column). */
export type MotionStudioAudioExportJson = {
  version: typeof MOTION_AUDIO_EXPORT_JSON_VERSION;
  voiceEnabled: boolean;
  subtitlesEnabled: boolean;
  subtitleMode: MotionSubtitleExportMode;
  voiceAudioUrl: string | null;
  voiceLanguage: string | null;
  voiceProvider: string | null;
  voiceDurationSeconds: number | null;
  subtitleTrack: MotionSubtitleTrackHandoff | null;
  subtitleFormat: "srt";
  /** URL of final video before voice/subtitle post-process (for optional download). */
  preVoiceFinalVideoUrl?: string | null;
  lastMux?: {
    audioMuxed: boolean;
    subtitleBurned: boolean;
    at: string;
    error?: string | null;
  };
};

export type MotionStudioAudioExportResponse = MotionStudioAudioExportJson & {
  hasStudioVoice: boolean;
  hasSubtitleTrack: boolean;
  studioStoryboardId: string | null;
};
