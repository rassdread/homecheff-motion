/**
 * Voice profile references — presets, ElevenLabs library voices, and cloned voices.
 * Library and cloned voices use prefixed refs without schema migration.
 */

import { getVoiceProfilePreset, normalizeStudioVoiceProfileId, type StudioVoiceProfileId } from "@/lib/studio-voice-profiles";

export const CLONED_VOICE_PROFILE_PREFIX = "clone:";
export const LIBRARY_VOICE_PROFILE_PREFIX = "library:";

export type VoiceProfileRef =
  | { kind: "preset"; profileId: StudioVoiceProfileId; raw: string }
  | { kind: "clone"; providerVoiceId: string; raw: string }
  | { kind: "library"; providerVoiceId: string; raw: string };

export function formatClonedVoiceProfileRef(providerVoiceId: string): string {
  const id = providerVoiceId.trim();
  if (!id) {
    throw new Error("Provider voice id is required.");
  }
  return `${CLONED_VOICE_PROFILE_PREFIX}${id}`;
}

export function formatLibraryVoiceProfileRef(providerVoiceId: string): string {
  const id = providerVoiceId.trim();
  if (!id) {
    throw new Error("Provider voice id is required.");
  }
  return `${LIBRARY_VOICE_PROFILE_PREFIX}${id}`;
}

export function safeFormatClonedVoiceProfileRef(providerVoiceId: string): string | null {
  const id = providerVoiceId.trim();
  return id ? `${CLONED_VOICE_PROFILE_PREFIX}${id}` : null;
}

export function safeFormatLibraryVoiceProfileRef(providerVoiceId: string): string | null {
  const id = providerVoiceId.trim();
  return id ? `${LIBRARY_VOICE_PROFILE_PREFIX}${id}` : null;
}

export type VoiceProfileSynthesisValidation =
  | { ok: true; voiceProfile: string }
  | { ok: false; code: string; message: string };

/** Reject clone/library refs without a provider voice id before TTS or preview. */
export function validateVoiceProfileForSynthesis(
  value: string | undefined | null
): VoiceProfileSynthesisValidation {
  const raw = (value ?? "").trim();
  if (!raw) {
    return {
      ok: false,
      code: "VOICE_PROFILE_REQUIRED",
      message: "Voice profile is required.",
    };
  }
  const ref = parseVoiceProfileRef(raw);
  if ((ref.kind === "clone" || ref.kind === "library") && !ref.providerVoiceId) {
    return {
      ok: false,
      code: "PROVIDER_VOICE_ID_REQUIRED",
      message: "This voice is not available.",
    };
  }
  return { ok: true, voiceProfile: normalizeVoiceProfileForSynthesis(raw) };
}

export function parseVoiceProfileRef(value: string | undefined | null): VoiceProfileRef {
  const raw = (value ?? "").trim();
  if (raw.startsWith(CLONED_VOICE_PROFILE_PREFIX)) {
    const providerVoiceId = raw.slice(CLONED_VOICE_PROFILE_PREFIX.length).trim();
    return { kind: "clone", providerVoiceId, raw };
  }
  if (raw.startsWith(LIBRARY_VOICE_PROFILE_PREFIX)) {
    const providerVoiceId = raw.slice(LIBRARY_VOICE_PROFILE_PREFIX.length).trim();
    return { kind: "library", providerVoiceId, raw };
  }
  const profileId = normalizeStudioVoiceProfileId(raw);
  return { kind: "preset", profileId, raw: profileId };
}

export function isClonedVoiceProfileRef(value: string | undefined | null): boolean {
  return parseVoiceProfileRef(value).kind === "clone";
}

export function isLibraryVoiceProfileRef(value: string | undefined | null): boolean {
  return parseVoiceProfileRef(value).kind === "library";
}

export function isProviderVoiceProfileRef(value: string | undefined | null): boolean {
  const kind = parseVoiceProfileRef(value).kind;
  return kind === "clone" || kind === "library";
}

export function normalizeStoredVoiceProfile(value: string | undefined | null): string {
  const ref = parseVoiceProfileRef(value);
  return ref.raw;
}

/** Preserve clone/library refs for TTS; normalize presets only. */
export function normalizeVoiceProfileForSynthesis(value: string | undefined | null): string {
  const ref = parseVoiceProfileRef(value);
  if (ref.kind === "clone" || ref.kind === "library") {
    return ref.raw;
  }
  return ref.profileId;
}

/** Preserve clone/library refs for planning, TTS, and storyboard reads. */
export function resolvePlanningVoiceProfile(
  value: string | undefined | null,
  fallback = "warm_narrator" as StudioVoiceProfileId
): string {
  const raw = (value ?? "").trim();
  if (!raw) {
    return fallback;
  }
  const ref = parseVoiceProfileRef(raw);
  if (ref.kind === "clone" || ref.kind === "library") {
    return ref.raw;
  }
  return ref.profileId;
}

export function voiceProfileLabelKeyForPlanning(voiceProfile: string): string {
  const ref = parseVoiceProfileRef(voiceProfile);
  if (ref.kind === "clone") {
    return "studio.voiceClone.clonedVoice";
  }
  if (ref.kind === "library") {
    return "studio.voiceLibrary.libraryVoice";
  }
  return getVoiceProfilePreset(ref.profileId).labelKey;
}

export function resolveProviderVoiceIdFromProfile(voiceProfile: string): string | null {
  const ref = parseVoiceProfileRef(voiceProfile);
  if (ref.kind === "clone" || ref.kind === "library") {
    return ref.providerVoiceId;
  }
  return null;
}

export function resolveVoiceProfileLabelKey(
  voiceProfile: string,
  presetLabelKey?: string
): string {
  const ref = parseVoiceProfileRef(voiceProfile);
  if (ref.kind === "clone") {
    return "studio.voiceClone.clonedVoice";
  }
  if (ref.kind === "library") {
    return "studio.voiceLibrary.libraryVoice";
  }
  return presetLabelKey ?? "studio.voice.preset.warmNarrator";
}

export function characterHasExplicitVoiceChoice(voiceProfile: string | undefined | null): boolean {
  const ref = parseVoiceProfileRef(voiceProfile);
  if (ref.kind === "clone" || ref.kind === "library") {
    return true;
  }
  return ref.profileId !== "warm_narrator";
}
