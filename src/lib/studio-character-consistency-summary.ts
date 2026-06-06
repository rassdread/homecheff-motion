/**
 * Character Consistency Center — per-character advisory scores.
 */

import type { StudioCharacterListItem } from "@/types/studio-api";

export type CharacterConsistencyItem = {
  characterId: string;
  name: string;
  score: number;
  missingKeys: Array<
    "voice_lock" | "personality" | "reference_image" | "performance_profile"
  >;
};

export type CharacterConsistencySummary = {
  overallScore: number;
  characters: CharacterConsistencyItem[];
};

function scoreCharacter(character: StudioCharacterListItem): CharacterConsistencyItem {
  const missing: CharacterConsistencyItem["missingKeys"] = [];
  let points = 0;
  const max = 4;

  if (character.voiceLock && character.voiceProfile?.trim()) {
    points++;
  } else {
    missing.push("voice_lock");
  }

  if (character.personality?.trim() || character.personalityMemory?.trim()) {
    points++;
  } else {
    missing.push("personality");
  }

  if (character.referenceImageUrl?.trim() || character.primaryReferenceImageId) {
    points++;
  } else {
    missing.push("reference_image");
  }

  if (
    character.performanceEnabled ||
    character.defaultHeadMovement?.trim() ||
    character.idleAnimationStyle?.trim()
  ) {
    points++;
  } else {
    missing.push("performance_profile");
  }

  return {
    characterId: character.id,
    name: character.name,
    score: Math.round((points / max) * 100),
    missingKeys: missing,
  };
}

export function buildCharacterConsistencySummary(
  characters: StudioCharacterListItem[]
): CharacterConsistencySummary {
  if (characters.length === 0) {
    return { overallScore: 100, characters: [] };
  }
  const items = characters.map(scoreCharacter);
  const overallScore = Math.round(
    items.reduce((sum, c) => sum + c.score, 0) / items.length
  );
  return { overallScore, characters: items };
}
