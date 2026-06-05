import {
  SOUND_AMBIENT_IDS,
  SOUND_CHARACTER_IDS,
  SOUND_ENVIRONMENT_IDS,
  SOUND_OBJECT_IDS,
  SOUND_TRANSITION_IDS,
} from "@/types/studio-sound-director";

export function isSoundEnvironmentId(value: string): boolean {
  return (SOUND_ENVIRONMENT_IDS as readonly string[]).includes(value);
}

export function isSoundCharacterId(value: string): boolean {
  return (SOUND_CHARACTER_IDS as readonly string[]).includes(value);
}

export function isSoundObjectId(value: string): boolean {
  return (SOUND_OBJECT_IDS as readonly string[]).includes(value);
}

export function isSoundTransitionId(value: string): boolean {
  return (SOUND_TRANSITION_IDS as readonly string[]).includes(value);
}

export function isSoundAmbientId(value: string): boolean {
  return (SOUND_AMBIENT_IDS as readonly string[]).includes(value);
}

const ALL_SOUND_IDS = [
  ...SOUND_ENVIRONMENT_IDS,
  ...SOUND_CHARACTER_IDS,
  ...SOUND_OBJECT_IDS,
  ...SOUND_TRANSITION_IDS,
  ...SOUND_AMBIENT_IDS,
] as const;

export function normalizeSoundOverrideList(
  raw: string,
  allowed: readonly string[]
): string {
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((id) => id && (allowed as readonly string[]).includes(id))
    .join(",");
}

export function isValidSoundId(value: string): boolean {
  return (ALL_SOUND_IDS as readonly string[]).includes(value);
}
