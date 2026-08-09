/**
 * S.7B — Canonical voice identity resolver with explicit precedence.
 *
 * Rule:
 * - Speaking role assigned to Character with voiceLock → Character wins (no silent storyboard replace)
 * - Narrator / unassigned / project default → Storyboard narration voice
 * Never silent about source.
 */

import { resolveCharacterVoiceIdentity } from "@/lib/studio-voice-identity-resolver";
import { normalizeStoredVoiceProfile } from "@/lib/studio-voice-profile-ref";
import type { StudioCharacterListItem } from "@/types/studio-api";

export type VoiceResolveRole = "character" | "narrator" | "unassigned";

export type ResolvedStudioVoiceIdentity = {
  source: "character" | "narrator" | "project_default" | "unassigned_fallback";
  role: VoiceResolveRole;
  voiceProvider: string;
  voiceProfile: string;
  language: string;
  voiceLock: boolean;
  characterId: string | null;
  characterName: string | null;
  /** Human-readable provenance for QA / handoff. */
  reason: string;
  /** True when storyboard attempted to override a locked character. */
  overrideBlocked: boolean;
  attemptedOverrideProfile: string | null;
};

export function resolveVoiceIdentity(input: {
  role: VoiceResolveRole;
  language?: string | null;
  character?: StudioCharacterListItem | null;
  storyboardVoiceProfile?: string | null;
  storyboardVoiceProvider?: string | null;
  storyboardVoiceLanguage?: string | null;
}): ResolvedStudioVoiceIdentity {
  const language = (
    input.language ??
    input.character?.voiceLanguage ??
    input.storyboardVoiceLanguage ??
    "en"
  )
    .trim()
    .toLowerCase()
    .slice(0, 2);

  const storyboardProfile = normalizeStoredVoiceProfile(
    input.storyboardVoiceProfile ?? "warm_narrator"
  );
  const storyboardProvider = (input.storyboardVoiceProvider ?? "elevenlabs").trim() || "elevenlabs";

  if (input.role === "narrator" || !input.character) {
    return {
      source: input.role === "narrator" ? "narrator" : "project_default",
      role: input.role === "character" ? "unassigned" : input.role,
      voiceProvider: storyboardProvider,
      voiceProfile: storyboardProfile,
      language,
      voiceLock: false,
      characterId: null,
      characterName: null,
      reason:
        input.role === "narrator"
          ? "Storyboard owns narrator / default narration voice."
          : "No character assigned — storyboard project default voice.",
      overrideBlocked: false,
      attemptedOverrideProfile: null,
    };
  }

  const identity = resolveCharacterVoiceIdentity({
    character: input.character,
    language,
    attemptedOverrideProfile: input.storyboardVoiceProfile,
  });

  const attempted = input.storyboardVoiceProfile
    ? normalizeStoredVoiceProfile(input.storyboardVoiceProfile)
    : null;
  const overrideBlocked =
    Boolean(identity.voiceLock) &&
    Boolean(attempted) &&
    attempted !== identity.voiceProfile;

  return {
    source: "character",
    role: "character",
    voiceProvider: identity.voiceProvider || "elevenlabs",
    voiceProfile: identity.voiceProfile,
    language: identity.language,
    voiceLock: identity.voiceLock,
    characterId: identity.characterId,
    characterName: identity.characterName,
    reason: identity.voiceLock
      ? overrideBlocked
        ? "Locked Character voice wins — storyboard override blocked."
        : "Locked Character voice identity."
      : "Character voice identity (unlocked; storyboard may suggest but character profile used for speaking role).",
    overrideBlocked,
    attemptedOverrideProfile: attempted,
  };
}

/** ContinuityBundle.voice[] mapper */
export function toContinuityVoiceIdentity(
  resolved: ResolvedStudioVoiceIdentity
): {
  characterId: string | null;
  voiceProvider: string | null;
  voiceProfileId: string | null;
  language: string | null;
  locked: boolean;
} {
  return {
    characterId: resolved.characterId,
    voiceProvider: resolved.voiceProvider,
    voiceProfileId: resolved.voiceProfile,
    language: resolved.language,
    locked: resolved.voiceLock,
  };
}
