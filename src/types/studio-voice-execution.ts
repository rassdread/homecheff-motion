/** Studio V31 — voice execution + Motion handoff types. */

export const STUDIO_VOICE_EXECUTION_LANGUAGES = ["en", "nl", "es", "fr"] as const;
export type StudioVoiceExecutionLanguage = (typeof STUDIO_VOICE_EXECUTION_LANGUAGES)[number];

export function isStudioVoiceExecutionLanguage(
  value: string
): value is StudioVoiceExecutionLanguage {
  return (STUDIO_VOICE_EXECUTION_LANGUAGES as readonly string[]).includes(value);
}

export type StudioVoiceAssetStatus = "queued" | "generating" | "completed" | "failed";

export type StudioVoiceProviderId = "elevenlabs" | "mock";

export type TimedVoiceSegment = {
  sceneId: string;
  order: number;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  text: string;
};

export type SubtitleTrackEntry = {
  start: number;
  end: number;
  text: string;
  sceneId?: string;
};

export type StoryboardSubtitleTrackPayload = {
  language: string;
  status: "draft" | "ready";
  entries: SubtitleTrackEntry[];
};

export type VoiceGenerationResult = {
  audioBuffer: Buffer;
  durationSeconds: number;
  provider: StudioVoiceProviderId;
  providerVoiceId: string;
  providerModelId: string;
  providerMetadata: Record<string, unknown>;
};

/** Motion handoff v12 — voice + subtitles (metadata only for export). */
export type MotionVoiceMetadata = {
  ready: boolean;
  language: string;
  provider: string;
  voiceProfile: string;
  voiceStyle: string;
  durationSeconds: number;
  audioUrl: string | null;
};

export type MotionVoiceSegmentHandoff = {
  sceneId: string;
  order: number;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  text: string;
};

export type MotionSubtitleTrackHandoff = {
  language: string;
  available: boolean;
  entries: SubtitleTrackEntry[];
  srt: string;
};
