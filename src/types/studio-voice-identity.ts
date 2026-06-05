/** Studio V39 — voice identity, lock enforcement, multi-language profiles. */

import type { CharacterVoiceAssignment } from "@/types/studio-character-voice";
import type { StudioVoiceExecutionLanguage } from "@/types/studio-voice-execution";

export const VOICE_IDENTITY_LANGUAGES = ["nl", "en", "es", "fr", "de", "pt"] as const;

export type VoiceIdentityLanguage = (typeof VOICE_IDENTITY_LANGUAGES)[number];

export type ResolvedCharacterVoiceIdentity = {
  characterId: string;
  characterName: string;
  language: VoiceIdentityLanguage | string;
  voiceEnabled: boolean;
  voiceProvider: string;
  voiceProfile: string;
  voiceGender: string;
  voiceDescription: string;
  voiceLock: boolean;
  presetLabelKey: string;
  displayLabel: string;
  source: "character_default" | "language_override" | "locked_base";
  languageOverrideApplied: boolean;
};

export type CharacterLanguageVoiceRow = {
  characterId: string;
  characterName: string;
  language: VoiceIdentityLanguage | string;
  displayLabel: string;
  voiceProfile: string;
  voiceLock: boolean;
  hasProfile: boolean;
};

export type VoiceIdentityWarning = {
  code: string;
  severity: "info" | "warning";
  messageKey: string;
  params?: Record<string, string | number>;
  characterId?: string;
  characterName?: string;
};

export type VoiceIdentityPlan = {
  enabled: boolean;
  storyboardLanguage: string;
  identitySummary: string;
  resolvedProfiles: ResolvedCharacterVoiceIdentity[];
  languageRows: CharacterLanguageVoiceRow[];
  lockedAssignments: CharacterVoiceAssignment[];
  warnings: VoiceIdentityWarning[];
  recommendations: string[];
  identityScore: number;
};

/** Motion handoff V19 — voice identity plan. */
export type MotionVoiceIdentityHandoffPlan = {
  enabled: boolean;
  identitySummary: string;
  lockedVoiceAssignments: CharacterVoiceAssignment[];
  resolvedVoiceProfiles: ResolvedCharacterVoiceIdentity[];
  voiceIdentityWarnings: VoiceIdentityWarning[];
  recommendations: string[];
};

export type MotionCharacterResolvedVoiceHandoff = {
  characterId: string;
  characterName: string;
  voiceProfile: string;
  voiceLanguage: string;
  displayLabel: string;
  voiceLock: boolean;
  presetLabelKey: string;
};
