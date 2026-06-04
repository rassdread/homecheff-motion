/** Studio V33 — character-level voice identity. */

import type { StudioVoiceExecutionLanguage } from "@/types/studio-voice-execution";

export type CharacterVoiceLanguageProfile = {
  voiceEnabled?: boolean;
  voiceProvider?: string;
  voiceProfile?: string;
  voiceGender?: string;
  voiceDescription?: string;
};

export type CharacterVoiceProfilesByLanguage = Partial<
  Record<StudioVoiceExecutionLanguage, CharacterVoiceLanguageProfile>
>;

export type CharacterVoiceProfileSnapshot = {
  voiceEnabled: boolean;
  voiceProvider: string;
  voiceProfile: string;
  voiceLanguage: string;
  voiceGender: string;
  voiceDescription: string;
  voiceNotes: string;
  voiceLock: boolean;
  voiceProfilesByLanguage: CharacterVoiceProfilesByLanguage;
};

export type CharacterVoiceAssignment = {
  characterId: string;
  characterName: string;
  characterSlug: string;
  voiceEnabled: boolean;
  voiceProvider: string;
  voiceProfile: string;
  voiceLanguage: string;
  voiceGender: string;
  voiceDescription: string;
  voiceLock: boolean;
  presetLabelKey: string;
};

export type SpeakerVoiceSegment = {
  speaker: string;
  characterId: string | null;
  text: string;
  voiceProfile: string;
  voiceProvider: string;
  voiceLanguage: string;
  order: number;
  startSeconds?: number;
  endSeconds?: number;
  durationSeconds?: number;
};

export type CharacterVoiceConsistencyWarning = {
  code: string;
  severity: "low" | "medium";
  message: string;
  characterId?: string;
  characterName?: string;
};
