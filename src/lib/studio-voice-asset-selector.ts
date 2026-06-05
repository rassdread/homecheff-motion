/**
 * Studio V38 — voice asset selection from Character Voice Profiles (V33).
 */

import { getStudioAudioAsset } from "@/lib/studio-audio-asset-library";
import type { CharacterVoiceAssignment } from "@/types/studio-character-voice";
import type { StudioAudioAsset } from "@/types/studio-audio-asset-director";
import type { StudioSceneDetail } from "@/types/studio-api";

const VOICE_PROFILE_TO_ASSET: Record<string, string> = {
  warm_narrator: "voice_narrator_a",
  documentary: "voice_documentary",
  commercial: "voice_commercial",
  inspirational_founder: "voice_character_lead",
  premium_brand: "voice_narrator_a",
  educational: "voice_narrator_a",
};

const BACKUP_FOR_PRIMARY: Record<string, string> = {
  voice_narrator_a: "voice_narrator_b",
  voice_documentary: "voice_narrator_b",
  voice_commercial: "voice_narrator_a",
  voice_character_lead: "voice_narrator_b",
};

export function selectVoiceAssetForProfile(voiceProfile: string): StudioAudioAsset | null {
  const assetId = VOICE_PROFILE_TO_ASSET[voiceProfile.trim().toLowerCase()] ?? "voice_narrator_a";
  return getStudioAudioAsset(assetId);
}

export function selectBackupVoiceAsset(primary: StudioAudioAsset | null): StudioAudioAsset | null {
  if (!primary) {
    return getStudioAudioAsset("voice_narrator_b");
  }
  const backupId = BACKUP_FOR_PRIMARY[primary.id] ?? "voice_narrator_b";
  return getStudioAudioAsset(backupId);
}

export function selectVoiceAssetsForScene(params: {
  scene: StudioSceneDetail;
  storyboardVoiceProfile: string;
  storyboardLanguage: string;
  characterAssignments: CharacterVoiceAssignment[];
  isNarrationScene: boolean;
}): { primary: StudioAudioAsset | null; backup: StudioAudioAsset | null } {
  const primaryCharacter = params.scene.characters[0];
  let profile = params.storyboardVoiceProfile;

  if (primaryCharacter) {
    const assignment = params.characterAssignments.find((a) => a.characterId === primaryCharacter.id);
    if (assignment?.voiceEnabled && assignment.voiceProfile) {
      profile = assignment.voiceProfile;
    }
  }

  const primary = selectVoiceAssetForProfile(profile);
  const backup = selectBackupVoiceAsset(primary);

  if (primary && params.storyboardLanguage && primary.language) {
    const lang = params.storyboardLanguage.trim().slice(0, 2).toLowerCase();
    if (primary.language !== lang && lang !== "en") {
      // Keep asset but language may mismatch — warnings handled in director.
    }
  }

  if (!params.isNarrationScene && primaryCharacter && primary?.id === "voice_narrator_a") {
    const characterAsset = getStudioAudioAsset("voice_character_lead");
    return {
      primary: characterAsset ?? primary,
      backup: selectBackupVoiceAsset(characterAsset ?? primary),
    };
  }

  return { primary, backup };
}
