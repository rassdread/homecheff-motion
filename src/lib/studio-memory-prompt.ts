import { continuityStrengthPromptHint } from "@/lib/studio-continuity-strength";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";

function joinLines(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n");
}

export function buildCharacterMemoryPromptLines(
  characters: SceneMemoryBundle["characters"]
): string[] {
  const lines: string[] = [];
  for (const character of characters) {
    const block: string[] = [];
    block.push(
      character.role === "mascot"
        ? `Maintain the same ${character.name} mascot identity.`
        : `Maintain consistent identity for ${character.name}.`
    );
    if (character.appearanceMemory.trim()) {
      block.push(`Appearance: ${character.appearanceMemory.trim()}.`);
    }
    if (character.defaultClothing.trim()) {
      block.push(`Clothing: ${character.defaultClothing.trim()}.`);
    }
    if (character.defaultAccessories.trim()) {
      block.push(`Accessories: ${character.defaultAccessories.trim()}.`);
    }
    if (character.personalityMemory.trim()) {
      block.push(`Personality: ${character.personalityMemory.trim()}.`);
    }
    if (character.visualKeywords.trim()) {
      block.push(`Visual keywords: ${character.visualKeywords.trim()}.`);
    }
    if (character.referenceNotes.trim()) {
      block.push(`Reference notes: ${character.referenceNotes.trim()}.`);
    }
    block.push(continuityStrengthPromptHint(character.identityStrength));
    if (character.continuityNotes.trim()) {
      block.push(character.continuityNotes.trim());
    }
    if (character.worldProfileName) {
      block.push(`Belongs to world: ${character.worldProfileName}.`);
    }
    lines.push(block.join(" "));
  }
  return lines;
}

export function buildLocationMemoryPromptLines(
  location: SceneMemoryBundle["location"]
): string[] {
  if (!location) {
    return [];
  }
  const block: string[] = [`Maintain consistent ${location.name} environment.`];
  if (location.visualIdentity.trim()) {
    block.push(`Visual identity: ${location.visualIdentity.trim()}.`);
  }
  if (location.worldMemory.trim()) {
    block.push(location.worldMemory.trim());
  }
  if (location.environmentKeywords.trim()) {
    block.push(`Environment keywords: ${location.environmentKeywords.trim()}.`);
  }
  block.push(continuityStrengthPromptHint(location.continuityStrength));
  if (location.continuityNotes.trim()) {
    block.push(location.continuityNotes.trim());
  }
  return [block.join(" ")];
}

export function buildPropMemoryPromptLines(props: SceneMemoryBundle["props"]): string[] {
  return props.map((prop) => {
    const block: string[] = [`Keep ${prop.name} visually consistent when visible.`];
    if (prop.appearanceMemory.trim()) {
      block.push(`Appearance: ${prop.appearanceMemory.trim()}.`);
    }
    if (prop.brandingRules.trim()) {
      block.push(`Branding: ${prop.brandingRules.trim()}.`);
    }
    block.push(continuityStrengthPromptHint(prop.continuityStrength));
    if (prop.continuityNotes.trim()) {
      block.push(prop.continuityNotes.trim());
    }
    return block.join(" ");
  });
}

export function buildWorldMemoryPromptLines(world: SceneMemoryBundle["world"]): string[] {
  if (!world) {
    return [];
  }
  const block: string[] = [`Maintain ${world.name} world visual style.`];
  if (world.visualStyle.trim()) {
    block.push(`Visual style: ${world.visualStyle.trim()}.`);
  }
  if (world.tone.trim()) {
    block.push(`Tone: ${world.tone.trim()}.`);
  }
  if (world.continuityRules.trim()) {
    block.push(world.continuityRules.trim());
  }
  block.push(continuityStrengthPromptHint(world.continuityStrength));
  return [block.join(" ")];
}

export function buildSceneMemoryContinuityPrompt(
  bundle: SceneMemoryBundle,
  options?: { identityDriftLines?: string[] }
): string {
  const parts = [
    ...buildWorldMemoryPromptLines(bundle.world),
    ...buildCharacterMemoryPromptLines(bundle.characters),
    ...buildLocationMemoryPromptLines(bundle.location),
    ...buildPropMemoryPromptLines(bundle.props),
    ...(options?.identityDriftLines ?? []),
    continuityStrengthPromptHint(bundle.continuityStrength),
  ];
  const joined = joinLines(parts);
  return joined || "Maintain visual consistency across the storyboard sequence.";
}
