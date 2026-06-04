import type { CharacterSnapshot } from "@/types/studio-character-snapshot";

const ROLE_HINTS: Record<string, string> = {
  mascot: "mascot",
  human: "person",
  animal: "animal character",
  object: "character",
};

export function buildCharacterPromptLine(character: CharacterSnapshot): string {
  const parts: string[] = [];
  const roleHint = ROLE_HINTS[character.role] ?? character.role;
  parts.push(`${character.name} (${roleHint})`);
  if (character.description.trim()) {
    parts.push(character.description.trim());
  }
  if (character.personality.trim()) {
    parts.push(character.personality.trim());
  }
  return parts.join(". ");
}

export function buildCharactersPrompt(characters: CharacterSnapshot[]): string {
  if (characters.length === 0) {
    return "";
  }
  const lines = characters.map((c) => {
    const core = buildCharacterPromptLine(c);
    if (c.personality.trim()) {
      return `${c.name}: ${c.personality.trim()}. ${core}`;
    }
    return core;
  });
  return lines.join("\n");
}
