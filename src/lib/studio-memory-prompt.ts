import { parseIdentityContinuityNotes } from "@/lib/studio-character-identity-fields";
import {
  buildCharacterIdentityPromptLinesFromMemory,
  buildCharacterStructuredIdentityPromptLines,
} from "@/lib/studio-character-identity-prompt-lines";
import { continuityStrengthPromptHint } from "@/lib/studio-continuity-strength";
import { buildLocationIdentityMemoryPromptExtras } from "@/lib/studio-location-identity-visual-hints";
import { buildPropIdentityMemoryPromptExtras } from "@/lib/studio-prop-identity-visual-hints";
import {
  buildWorldIdentityMemoryPromptExtras,
  buildWorldIdentityRenderStrategyHints,
} from "@/lib/studio-world-identity-visual-hints";
import { worldProfilePickToListItem } from "@/lib/studio-prompt-source-entities";
import { parsePropAppearanceDetails } from "@/lib/studio-prop-identity-structured";
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
    const structuredIdentityLines = buildCharacterIdentityPromptLinesFromMemory(character);
    block.push(...structuredIdentityLines);
    if (
      character.visualKeywords.trim() &&
      buildCharacterStructuredIdentityPromptLines(character.visualKeywords).length === 0
    ) {
      block.push(`Visual keywords: ${character.visualKeywords.trim()}.`);
    }
    const { forbiddenElements, usageContext } = parseIdentityContinuityNotes(
      character.continuityNotes
    );
    if (forbiddenElements) {
      block.push(`Forbidden: ${forbiddenElements}.`);
    }
    if (character.referenceNotes.trim()) {
      block.push(`Reference notes: ${character.referenceNotes.trim()}.`);
    }
    block.push(continuityStrengthPromptHint(character.identityStrength));
    if (usageContext) {
      block.push(usageContext);
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
  block.push(...buildLocationIdentityMemoryPromptExtras(location));
  const { forbiddenElements, usageContext } = parseIdentityContinuityNotes(
    location.continuityNotes
  );
  if (forbiddenElements) {
    block.push(`Forbidden: ${forbiddenElements}.`);
  }
  block.push(continuityStrengthPromptHint(location.continuityStrength));
  if (usageContext) {
    block.push(usageContext);
  }
  return [block.join(" ")];
}

export function buildPropMemoryPromptLines(
  props: SceneMemoryBundle["props"],
  options?: { characterNamesById?: Map<string, string> }
): string[] {
  return props.map((prop) => {
    const block: string[] = [`Keep ${prop.name} visually consistent when visible.`];
    block.push(...buildPropIdentityMemoryPromptExtras(prop, options?.characterNamesById));
    const detailOnly = parsePropAppearanceDetails(prop.appearanceMemory);
    if (detailOnly) {
      block.push(`Appearance: ${detailOnly}.`);
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
  block.push(...buildWorldIdentityMemoryPromptExtras(world));
  block.push(
    ...buildWorldIdentityRenderStrategyHints(
      worldProfilePickToListItem({
        id: world.id,
        name: world.name,
        description: world.description,
        visualStyle: world.visualStyle,
        tone: world.tone,
        continuityRules: world.continuityRules,
        continuityStrength: world.continuityStrength,
      })
    )
  );
  block.push(continuityStrengthPromptHint(world.continuityStrength));
  return [block.join(" ")];
}

export function buildSceneMemoryContinuityPrompt(
  bundle: SceneMemoryBundle,
  options?: { identityDriftLines?: string[] }
): string {
  const characterNamesById = new Map(bundle.characters.map((c) => [c.id, c.name]));
  const parts = [
    ...buildWorldMemoryPromptLines(bundle.world),
    ...buildCharacterMemoryPromptLines(bundle.characters),
    ...buildLocationMemoryPromptLines(bundle.location),
    ...buildPropMemoryPromptLines(bundle.props, { characterNamesById }),
    ...(options?.identityDriftLines ?? []),
    continuityStrengthPromptHint(bundle.continuityStrength),
  ];
  const joined = joinLines(parts);
  return joined || "Maintain visual consistency across the storyboard sequence.";
}
