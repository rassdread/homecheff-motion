/**
 * eleven_multilingual_v2 accepts a top-level `speed` from 0.7 to 1.2.
 * Values outside that range are rejected by the provider, so the editor
 * only offers the supported steps. 1 is the provider default.
 */
export const ELEVENLABS_SPEECH_SPEEDS = [0.7, 0.8, 0.9, 1, 1.1, 1.2] as const;

export const ELEVENLABS_DEFAULT_SPEECH_SPEED = 1;

export function normalizeElevenLabsSpeechSpeed(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return ELEVENLABS_DEFAULT_SPEECH_SPEED;
  const match = ELEVENLABS_SPEECH_SPEEDS.find((speed) => Math.abs(speed - numeric) < 0.001);
  return match ?? ELEVENLABS_DEFAULT_SPEECH_SPEED;
}

export function readCharacterSpeechSpeed(raw: unknown): number {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return ELEVENLABS_DEFAULT_SPEECH_SPEED;
  }
  return normalizeElevenLabsSpeechSpeed((raw as { speechSpeed?: unknown }).speechSpeed);
}

export function voiceProfilesWithSpeechSpeed(
  profiles: Record<string, unknown> | null | undefined,
  speechSpeed: number | undefined
): Record<string, unknown> | null | undefined {
  if (speechSpeed === undefined) {
    if (!profiles || Object.keys(profiles).length === 0) return undefined;
    return { ...profiles };
  }
  const speed = normalizeElevenLabsSpeechSpeed(speechSpeed);
  const stored: Record<string, unknown> = { ...(profiles ?? {}) };
  delete stored.speechSpeed;
  if (speed !== ELEVENLABS_DEFAULT_SPEECH_SPEED) {
    stored.speechSpeed = speed;
  }
  return Object.keys(stored).length > 0 ? stored : null;
}
