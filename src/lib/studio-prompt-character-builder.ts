import type { CharacterSnapshot } from "@/types/studio-character-snapshot";
import type { StudioCharacterListItem } from "@/types/studio-api";
import { buildCharacterIdentityPromptContext } from "@/lib/studio-character-identity-visual-hints";

const ROLE_HINTS: Record<string, string> = {
  mascot: "mascot",
  human: "person",
  animal: "animal character",
  object: "character",
};

export function buildCharacterPromptLine(
  character: CharacterSnapshot,
  sourceCharacter?: StudioCharacterListItem | null
): string {
  const parts: string[] = [];
  const roleHint = ROLE_HINTS[character.role] ?? character.role;
  parts.push(`${character.name} (${roleHint})`);
  if (character.description.trim()) {
    parts.push(character.description.trim());
  }
  if (character.personality.trim()) {
    parts.push(character.personality.trim());
  }
  const identityContext = buildCharacterIdentityPromptContext(sourceCharacter ?? null);
  if (identityContext) {
    parts.push(identityContext);
  }
  return parts.join(". ");
}

export function buildCharactersPrompt(
  characters: CharacterSnapshot[],
  sourceCharacters?: StudioCharacterListItem[]
): string {
  if (characters.length === 0) {
    return "";
  }
  const byId = new Map((sourceCharacters ?? []).map((c) => [c.id, c]));
  const lines = characters.map((c) => {
    const core = buildCharacterPromptLine(c, byId.get(c.id) ?? null);
    if (c.personality.trim() && !core.includes(c.personality.trim())) {
      return `${c.name}: ${c.personality.trim()}. ${core}`;
    }
    return core;
  });
  return lines.join("\n");
}
