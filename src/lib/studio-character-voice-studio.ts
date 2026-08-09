/**
 * S.7C — Canonical Character Voice Studio contract.
 * Aggregates existing Character identity fields — does not duplicate Prisma SoT.
 */

import {
  buildCharacterVoiceVariants,
  type StudioVoiceVariant,
} from "@/lib/studio-voice-variants";
import { resolveCharacterVoiceIdentity } from "@/lib/studio-voice-identity-resolver";
import type { StudioCharacterListItem } from "@/types/studio-api";
import type { ResolvedCharacterVoiceIdentity } from "@/types/studio-voice-identity";

export type CharacterVoiceStudioCapabilities = {
  tts: boolean;
  clone: boolean;
  multiLanguageProfiles: boolean;
  preview: boolean;
  history: boolean;
};

export type CharacterVoiceStudioContract = {
  version: "7c.1";
  characterId: string;
  characterName: string;
  /** Canonical identity — Character-owned */
  identity: ResolvedCharacterVoiceIdentity;
  /** Presentation / planning metadata (not provider syntax) */
  characteristics: {
    accent: string | null;
    language: string;
    agePresentation: string | null;
    genderPresentation: string;
    energy: string | null;
    emotionDefaults: string | null;
    speakingSpeed: string | null;
    pitch: string | null;
    pauseBehavior: string | null;
    pronunciationHints: string | null;
    voiceTags: string[];
  };
  variants: StudioVoiceVariant[];
  providerCapabilities: CharacterVoiceStudioCapabilities;
  reuse: {
    voiceProfile: string;
    locked: boolean;
    /** Reuse asset ≠ new generation */
    reuseWithoutRegeneration: true;
  };
  preview: {
    /** Preview must never replace final generation */
    replacesFinalGeneration: false;
    supported: true;
  };
};

function parseVoiceTags(notes: string): string[] {
  return notes
    .split(/[,;#]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 24);
}

/**
 * Build Voice Studio contract from an existing Character row.
 * No provider calls. No schema duplication.
 */
export function buildCharacterVoiceStudio(
  character: StudioCharacterListItem,
  language?: string | null
): CharacterVoiceStudioContract {
  const identity = resolveCharacterVoiceIdentity({
    character,
    language: language ?? character.voiceLanguage ?? "en",
  });

  return {
    version: "7c.1",
    characterId: character.id,
    characterName: character.name,
    identity,
    characteristics: {
      accent: null,
      language: String(identity.language),
      agePresentation: null,
      genderPresentation: identity.voiceGender || character.voiceGender || "",
      energy: null,
      emotionDefaults: null,
      speakingSpeed: null,
      pitch: null,
      pauseBehavior: null,
      pronunciationHints: character.voiceNotes?.trim() || null,
      voiceTags: parseVoiceTags(character.voiceNotes ?? ""),
    },
    variants: buildCharacterVoiceVariants(character.id),
    providerCapabilities: {
      tts: true,
      clone: true,
      multiLanguageProfiles: Boolean(
        character.voiceProfilesByLanguage &&
          Object.keys(character.voiceProfilesByLanguage).length > 0
      ),
      preview: true,
      history: true,
    },
    reuse: {
      voiceProfile: identity.voiceProfile,
      locked: identity.voiceLock,
      reuseWithoutRegeneration: true,
    },
    preview: {
      replacesFinalGeneration: false,
      supported: true,
    },
  };
}
