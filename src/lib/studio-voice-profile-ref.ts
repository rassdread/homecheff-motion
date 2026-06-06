/**
 * Voice profile references — presets and ElevenLabs cloned voices.
 * Cloned voices use `clone:<providerVoiceId>` without schema migration.
 */

import { normalizeStudioVoiceProfileId, type StudioVoiceProfileId } from "@/lib/studio-voice-profiles";

export const CLONED_VOICE_PROFILE_PREFIX = "clone:";

export type VoiceProfileRef =
  | { kind: "preset"; profileId: StudioVoiceProfileId; raw: string }
  | { kind: "clone"; providerVoiceId: string; raw: string };

export function formatClonedVoiceProfileRef(providerVoiceId: string): string {
  const id = providerVoiceId.trim();
  if (!id) {
    throw new Error("Provider voice id is required.");
  }
  return `${CLONED_VOICE_PROFILE_PREFIX}${id}`;
}

export function parseVoiceProfileRef(value: string | undefined | null): VoiceProfileRef {
  const raw = (value ?? "").trim();
  if (raw.startsWith(CLONED_VOICE_PROFILE_PREFIX)) {
    const providerVoiceId = raw.slice(CLONED_VOICE_PROFILE_PREFIX.length).trim();
    if (providerVoiceId) {
      return { kind: "clone", providerVoiceId, raw };
    }
  }
  const profileId = normalizeStudioVoiceProfileId(raw);
  return { kind: "preset", profileId, raw: profileId };
}

export function isClonedVoiceProfileRef(value: string | undefined | null): boolean {
  return parseVoiceProfileRef(value).kind === "clone";
}

export function normalizeStoredVoiceProfile(value: string | undefined | null): string {
  const ref = parseVoiceProfileRef(value);
  return ref.raw;
}

export function resolveProviderVoiceIdFromProfile(voiceProfile: string): string | null {
  const ref = parseVoiceProfileRef(voiceProfile);
  if (ref.kind === "clone") {
    return ref.providerVoiceId;
  }
  return null;
}
