/**
 * S.7C — Structured voice emotion metadata (provider-neutral).
 */

export const STUDIO_VOICE_EMOTIONS = [
  "neutral",
  "happy",
  "excited",
  "calm",
  "sad",
  "angry",
  "fear",
  "luxury",
  "professional",
  "friendly",
  "motivational",
  "romantic",
  "storytelling",
  "comedy",
] as const;

export type StudioVoiceEmotion = (typeof STUDIO_VOICE_EMOTIONS)[number];

export function isStudioVoiceEmotion(value: string | null | undefined): value is StudioVoiceEmotion {
  return Boolean(value && (STUDIO_VOICE_EMOTIONS as readonly string[]).includes(value));
}

export function normalizeStudioVoiceEmotion(
  value: string | null | undefined,
  fallback: StudioVoiceEmotion = "neutral"
): StudioVoiceEmotion {
  const raw = (value ?? "").trim().toLowerCase();
  return isStudioVoiceEmotion(raw) ? raw : fallback;
}
