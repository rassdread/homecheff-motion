import {
  AUDIO_DUCKING_MODES,
  AUDIO_FOCUS_TYPES,
} from "@/types/studio-audio-production-director";

export function isAudioFocusType(value: string): boolean {
  return (AUDIO_FOCUS_TYPES as readonly string[]).includes(value);
}

export function isAudioDuckingMode(value: string): boolean {
  return (AUDIO_DUCKING_MODES as readonly string[]).includes(value);
}

export function clampMixLevel(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
