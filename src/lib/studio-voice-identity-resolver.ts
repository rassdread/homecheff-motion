/**
 * Studio V39 — resolveCharacterVoiceIdentity (single source of truth).
 */

import {
  characterVoiceSnapshotFromRow,
  resolveCharacterVoiceForLanguage,
} from "@/lib/studio-character-voice";
import { getVoiceProfilePreset, normalizeStudioVoiceProfileId } from "@/lib/studio-voice-profiles";
import {
  isClonedVoiceProfileRef,
  isLibraryVoiceProfileRef,
  normalizeStoredVoiceProfile,
  resolveVoiceProfileLabelKey,
} from "@/lib/studio-voice-profile-ref";
import { isStudioVoiceExecutionLanguage } from "@/types/studio-voice-execution";
import type { StudioCharacterListItem } from "@/types/studio-api";
import type {
  ResolvedCharacterVoiceIdentity,
  VoiceIdentityLanguage,
} from "@/types/studio-voice-identity";
import { VOICE_IDENTITY_LANGUAGES } from "@/types/studio-voice-identity";

export function normalizeVoiceIdentityLanguage(
  value: string | null | undefined,
  fallback = "en"
): VoiceIdentityLanguage | string {
  const lang = (value ?? fallback).trim().toLowerCase().slice(0, 2);
  if ((VOICE_IDENTITY_LANGUAGES as readonly string[]).includes(lang)) {
    return lang as VoiceIdentityLanguage;
  }
  return lang || fallback;
}

function displayLabelForIdentity(params: {
  voiceGender: string;
  voiceDescription: string;
  presetLabelKey: string;
}): string {
  if (params.voiceDescription.trim()) {
    return params.voiceDescription.trim();
  }
  if (params.voiceGender.trim()) {
    return params.voiceGender.trim();
  }
  return params.presetLabelKey;
}

export function resolveCharacterVoiceIdentity(params: {
  character: StudioCharacterListItem;
  language: string;
  /** When set, detect if storyboard tried to override a locked character. */
  attemptedOverrideProfile?: string | null;
}): ResolvedCharacterVoiceIdentity {
  const language = normalizeVoiceIdentityLanguage(
    params.language,
    params.character.voiceLanguage ?? "en"
  );
  const snapshot = characterVoiceSnapshotFromRow({
    voiceEnabled: params.character.voiceEnabled ?? false,
    voiceProvider: params.character.voiceProvider ?? "",
    voiceProfile: params.character.voiceProfile ?? "",
    voiceLanguage: params.character.voiceLanguage ?? "en",
    voiceGender: params.character.voiceGender ?? "",
    voiceDescription: params.character.voiceDescription ?? "",
    voiceNotes: params.character.voiceNotes ?? "",
    voiceLock: params.character.voiceLock ?? false,
    voiceProfilesJson: params.character.voiceProfilesByLanguage ?? null,
  });

  const baseProfile = normalizeStoredVoiceProfile(snapshot.voiceProfile);
  const resolved = resolveCharacterVoiceForLanguage(snapshot, language);
  const langOverride =
    isStudioVoiceExecutionLanguage(language) &&
    Boolean(snapshot.voiceProfilesByLanguage[language]?.voiceProfile);

  let voiceProfile = resolved.voiceProfile;
  if (params.character.voiceLock) {
    voiceProfile = langOverride ? resolved.voiceProfile : baseProfile;
    if (params.attemptedOverrideProfile?.trim()) {
      const attempted = normalizeStoredVoiceProfile(params.attemptedOverrideProfile);
      if (attempted !== voiceProfile) {
        voiceProfile = langOverride ? resolved.voiceProfile : baseProfile;
      }
    }
  }

  const preset = getVoiceProfilePreset(voiceProfile);
  const presetLabelKey =
    isClonedVoiceProfileRef(voiceProfile) ? "studio.voiceClone.clonedVoice"
    : isLibraryVoiceProfileRef(voiceProfile) ? "studio.voiceLibrary.libraryVoice"
    : resolveVoiceProfileLabelKey(voiceProfile, preset.labelKey);
  const source: ResolvedCharacterVoiceIdentity["source"] =
    params.character.voiceLock && !langOverride ? "locked_base"
    : langOverride ? "language_override"
    : "character_default";

  return {
    characterId: params.character.id,
    characterName: params.character.name,
    language,
    voiceEnabled: resolved.voiceEnabled,
    voiceProvider: resolved.voiceProvider || "elevenlabs",
    voiceProfile,
    voiceGender: resolved.voiceGender,
    voiceDescription: resolved.voiceDescription,
    voiceLock: params.character.voiceLock ?? false,
    presetLabelKey,
    displayLabel: displayLabelForIdentity({
      voiceGender: resolved.voiceGender,
      voiceDescription: resolved.voiceDescription,
      presetLabelKey,
    }),
    source,
    languageOverrideApplied: langOverride,
  };
}

export function resolveCharacterVoiceIdentitiesForLanguages(
  character: StudioCharacterListItem,
  languages: readonly string[] = VOICE_IDENTITY_LANGUAGES
): ResolvedCharacterVoiceIdentity[] {
  return languages.map((lang) =>
    resolveCharacterVoiceIdentity({ character, language: lang })
  );
}
