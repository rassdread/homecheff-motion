/**
 * Studio V31 Phase 1 — Voice Director field audit.
 * voiceTiming = computed via planVoiceTiming (not a DB column).
 * voiceNarrationMode = narrationMode in schema.
 */

export type StudioVoiceFieldStatus = "used" | "stored" | "missing";

export type StudioVoiceFieldAuditRow = {
  field: string;
  status: StudioVoiceFieldStatus;
  notes: string;
};

export const STUDIO_VOICE_FIELD_AUDIT: StudioVoiceFieldAuditRow[] = [
  { field: "voiceEnabled", status: "used", notes: "Gates generation and handoff voiceMetadata." },
  { field: "voiceLanguage", status: "used", notes: "Language key for voice asset + subtitles." },
  { field: "voiceStyle", status: "used", notes: "Stored on voice asset; echoed in handoff." },
  { field: "voiceProfile", status: "used", notes: "ElevenLabs preset + generation request." },
  { field: "narrationMode", status: "used", notes: "voiceNarrationMode — script tone + request metadata." },
  { field: "voiceNarrationScript", status: "used", notes: "TTS source text for generation." },
  {
    field: "voiceTiming",
    status: "used",
    notes: "Computed timed segments (planVoiceTiming → buildTimedVoiceSegments).",
  },
  { field: "voiceAudioUrl", status: "missing", notes: "V31 adds StudioStoryboardVoice.audioUrl." },
  { field: "subtitleTrack", status: "missing", notes: "V31 adds StudioStoryboardSubtitleTrack." },
];
