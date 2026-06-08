/**
 * Character identity read-only hints for Visual Production, prompts, and Shot Planner.
 */

import { characterIdentityFormFromCharacter } from "@/lib/studio-character-identity-fields";
import { buildCharacterStructuredIdentityPromptLines } from "@/lib/studio-character-identity-prompt-lines";
import { toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import type { StudioShotType } from "@/lib/studio-scene-director";
import type { CharacterIdentitySpec } from "@/types/studio-identity-spec";
import type { StudioCharacterListItem } from "@/types/studio-api";
import type { CharacterMemorySnapshot } from "@/types/studio-memory-snapshots";

export type CharacterIdentityShotHint = {
  preferredShotTypes: StudioShotType[];
  rationaleKey: string;
};

const TYPE_SHOT_HINTS: Record<string, CharacterIdentityShotHint> = {
  mascot: {
    preferredShotTypes: ["medium", "medium_wide"],
    rationaleKey: "studio.characterIdentity.shotHint.mascot",
  },
  animal: {
    preferredShotTypes: ["medium_close_up", "medium"],
    rationaleKey: "studio.characterIdentity.shotHint.animal",
  },
  brand_character: {
    preferredShotTypes: ["medium", "medium_close_up"],
    rationaleKey: "studio.characterIdentity.shotHint.brand",
  },
};

const ENERGY_SHOT_HINTS: Record<string, CharacterIdentityShotHint> = {
  energetic: {
    preferredShotTypes: ["medium_wide", "medium"],
    rationaleKey: "studio.characterIdentity.shotHint.energetic",
  },
  calm: {
    preferredShotTypes: ["medium", "medium_close_up"],
    rationaleKey: "studio.characterIdentity.shotHint.calm",
  },
};

const ROLE_SHOT_HINTS: Record<string, CharacterIdentityShotHint> = {
  mascot: {
    preferredShotTypes: ["medium", "medium_wide"],
    rationaleKey: "studio.characterIdentity.shotHint.mascot",
  },
};

export function resolveCharacterIdentityShotHint(
  characterType: string,
  energy: string,
  role: string
): CharacterIdentityShotHint | null {
  return (
    ENERGY_SHOT_HINTS[energy] ??
    TYPE_SHOT_HINTS[characterType] ??
    ROLE_SHOT_HINTS[role] ??
    null
  );
}

export function resolveCharacterIdentityShotHintFromCharacter(
  character: StudioCharacterListItem | null | undefined
): CharacterIdentityShotHint | null {
  if (!character) return null;
  const form = characterIdentityFormFromCharacter(character);
  return resolveCharacterIdentityShotHint(form.characterType, form.energy, form.role);
}

export function buildCharacterIdentityVisualProductionLines(
  spec: CharacterIdentitySpec
): string[] {
  const lines: string[] = [];
  const structured = buildCharacterStructuredIdentityPromptLines(spec.visualKeywords);
  lines.push(...structured);

  if (spec.role && !structured.some((l) => l.startsWith("Character type:"))) {
    lines.push(`Role: ${spec.role}.`);
  }
  if (spec.personality.trim()) {
    lines.push(`Personality: ${spec.personality.trim()}.`);
  }
  if (spec.memoryMetadata.defaultClothing.trim()) {
    lines.push(`Outfit: ${spec.memoryMetadata.defaultClothing.trim()}.`);
  }
  if (spec.memoryMetadata.defaultAccessories.trim()) {
    lines.push(`Accessories: ${spec.memoryMetadata.defaultAccessories.trim()}.`);
  }
  if (structured.length === 0 && spec.visualKeywords.trim()) {
    lines.push(`Visual keywords: ${spec.visualKeywords.trim()}.`);
  }
  if (spec.memoryMetadata.appearanceMemory.trim()) {
    lines.push(`Appearance: ${spec.memoryMetadata.appearanceMemory.trim()}.`);
  }
  if (spec.visualRules.trim()) {
    lines.push(`Visual rules: ${spec.visualRules.trim()}.`);
  }
  if (spec.forbiddenElements.trim()) {
    lines.push(`Forbidden: ${spec.forbiddenElements.trim()}.`);
  }
  if (spec.world.name) lines.push(`World: ${spec.world.name}.`);
  return lines;
}

export function buildCharacterIdentityMemoryPromptExtras(
  character: CharacterMemorySnapshot
): string[] {
  const lines: string[] = [];
  if (character.role.trim()) lines.push(`Role: ${character.role.trim()}.`);
  if (character.appearanceMemory.trim()) {
    lines.push(`Appearance: ${character.appearanceMemory.trim()}.`);
  }
  if (character.visualKeywords.trim()) {
    lines.push(`Visual keywords: ${character.visualKeywords.trim()}.`);
  }
  if (character.personalityMemory.trim()) {
    lines.push(`Personality: ${character.personalityMemory.trim()}.`);
  }
  if (character.defaultClothing.trim()) {
    lines.push(`Clothing: ${character.defaultClothing.trim()}.`);
  }
  if (character.worldProfileName) {
    lines.push(`World: ${character.worldProfileName}.`);
  }
  return lines;
}

export function buildCharacterIdentityPromptContext(
  character: StudioCharacterListItem | null
): string {
  if (!character) return "";
  return buildCharacterIdentityVisualProductionLines(toIdentitySpec(character)).join(" ");
}
