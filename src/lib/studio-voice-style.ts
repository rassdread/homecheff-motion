/**
 * S.7C — Structured voice style metadata (provider-neutral).
 */

export const STUDIO_VOICE_STYLES = [
  "podcast",
  "movie",
  "commercial",
  "radio",
  "youtube",
  "tiktok",
  "documentary",
  "audiobook",
  "corporate",
  "restaurant",
  "homecheff",
  "training",
  "presentation",
] as const;

export type StudioVoiceStyle = (typeof STUDIO_VOICE_STYLES)[number];

export function isStudioVoiceStyle(value: string | null | undefined): value is StudioVoiceStyle {
  return Boolean(value && (STUDIO_VOICE_STYLES as readonly string[]).includes(value));
}

export function normalizeStudioVoiceStyle(
  value: string | null | undefined,
  fallback: StudioVoiceStyle = "presentation"
): StudioVoiceStyle {
  const raw = (value ?? "").trim().toLowerCase();
  return isStudioVoiceStyle(raw) ? raw : fallback;
}
