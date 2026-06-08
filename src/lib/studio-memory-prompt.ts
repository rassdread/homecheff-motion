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

export type MemoryPromptPriority = "high" | "medium" | "low";

export type PrioritizedMemoryChunk = {
  text: string;
  priority: MemoryPromptPriority;
};

function joinPrioritizedChunks(chunks: PrioritizedMemoryChunk[]): string {
  const order: MemoryPromptPriority[] = ["high", "medium", "low"];
  const parts: string[] = [];
  for (const tier of order) {
    for (const chunk of chunks) {
      if (chunk.priority === tier && chunk.text.trim()) {
        parts.push(chunk.text.trim());
      }
    }
  }
  return parts.join(" ");
}

export function buildCharacterMemoryPromptChunks(
  characters: SceneMemoryBundle["characters"]
): PrioritizedMemoryChunk[] {
  const chunks: PrioritizedMemoryChunk[] = [];
  for (const character of characters) {
    chunks.push({
      priority: "high",
      text:
        character.role === "mascot"
          ? `Maintain the same ${character.name} mascot identity.`
          : `Maintain consistent identity for ${character.name}.`,
    });
    if (character.defaultClothing.trim()) {
      chunks.push({
        priority: "high",
        text: `Clothing: ${character.defaultClothing.trim()}.`,
      });
    }
    if (character.defaultAccessories.trim()) {
      chunks.push({
        priority: "high",
        text: `Accessories: ${character.defaultAccessories.trim()}.`,
      });
    }
    const structuredIdentityLines = buildCharacterIdentityPromptLinesFromMemory(character);
    for (const line of structuredIdentityLines) {
      chunks.push({ priority: "high", text: line });
    }
    const { forbiddenElements, usageContext } = parseIdentityContinuityNotes(
      character.continuityNotes
    );
    if (forbiddenElements) {
      chunks.push({ priority: "high", text: `Forbidden: ${forbiddenElements}.` });
    }
    if (character.appearanceMemory.trim()) {
      chunks.push({
        priority: "medium",
        text: `Appearance: ${character.appearanceMemory.trim()}.`,
      });
    }
    if (character.worldProfileName) {
      chunks.push({
        priority: "medium",
        text: `Belongs to world: ${character.worldProfileName}.`,
      });
    }
    if (
      character.visualKeywords.trim() &&
      buildCharacterStructuredIdentityPromptLines(character.visualKeywords).length === 0
    ) {
      chunks.push({
        priority: "medium",
        text: `Visual keywords: ${character.visualKeywords.trim()}.`,
      });
    }
    if (character.personalityMemory.trim()) {
      chunks.push({
        priority: "low",
        text: `Personality: ${character.personalityMemory.trim()}.`,
      });
    }
    if (character.referenceNotes.trim()) {
      chunks.push({
        priority: "low",
        text: `Reference notes: ${character.referenceNotes.trim()}.`,
      });
    }
    chunks.push({
      priority: "low",
      text: continuityStrengthPromptHint(character.identityStrength),
    });
    if (usageContext) {
      chunks.push({ priority: "low", text: usageContext });
    }
  }
  return chunks;
}

export function buildCharacterMemoryPromptLines(
  characters: SceneMemoryBundle["characters"]
): string[] {
  return characters.map((character) =>
    joinPrioritizedChunks(buildCharacterMemoryPromptChunks([character]))
  );
}

export function buildLocationMemoryPromptChunks(
  location: SceneMemoryBundle["location"]
): PrioritizedMemoryChunk[] {
  if (!location) {
    return [];
  }
  const chunks: PrioritizedMemoryChunk[] = [
    { priority: "high", text: `Maintain consistent ${location.name} environment.` },
  ];
  if (location.visualIdentity.trim()) {
    chunks.push({
      priority: "high",
      text: `Visual identity: ${location.visualIdentity.trim()}.`,
    });
  }
  for (const line of buildLocationIdentityMemoryPromptExtras(location)) {
    chunks.push({ priority: "high", text: line });
  }
  const { forbiddenElements, usageContext } = parseIdentityContinuityNotes(
    location.continuityNotes
  );
  if (forbiddenElements) {
    chunks.push({ priority: "high", text: `Forbidden: ${forbiddenElements}.` });
  }
  if (location.environmentKeywords.trim()) {
    chunks.push({
      priority: "medium",
      text: `Environment keywords: ${location.environmentKeywords.trim()}.`,
    });
  }
  if (location.worldMemory.trim()) {
    chunks.push({ priority: "medium", text: location.worldMemory.trim() });
  }
  chunks.push({
    priority: "low",
    text: continuityStrengthPromptHint(location.continuityStrength),
  });
  if (usageContext) {
    chunks.push({ priority: "low", text: usageContext });
  }
  return chunks;
}

export function buildLocationMemoryPromptLines(
  location: SceneMemoryBundle["location"]
): string[] {
  const chunks = buildLocationMemoryPromptChunks(location);
  if (chunks.length === 0) {
    return [];
  }
  return [joinPrioritizedChunks(chunks)];
}

export function buildPropMemoryPromptChunks(
  props: SceneMemoryBundle["props"],
  options?: { characterNamesById?: Map<string, string> }
): PrioritizedMemoryChunk[] {
  const chunks: PrioritizedMemoryChunk[] = [];
  for (const prop of props) {
    chunks.push({
      priority: "high",
      text: `Keep ${prop.name} visually consistent when visible.`,
    });
    for (const line of buildPropIdentityMemoryPromptExtras(prop, options?.characterNamesById)) {
      chunks.push({ priority: "high", text: line });
    }
    if (prop.brandingRules.trim()) {
      chunks.push({
        priority: "high",
        text: `Branding: ${prop.brandingRules.trim()}.`,
      });
    }
    const detailOnly = parsePropAppearanceDetails(prop.appearanceMemory);
    if (detailOnly) {
      chunks.push({ priority: "medium", text: `Appearance: ${detailOnly}.` });
    }
    chunks.push({
      priority: "low",
      text: continuityStrengthPromptHint(prop.continuityStrength),
    });
    if (prop.continuityNotes.trim()) {
      chunks.push({ priority: "low", text: prop.continuityNotes.trim() });
    }
  }
  return chunks;
}

export function buildPropMemoryPromptLines(
  props: SceneMemoryBundle["props"],
  options?: { characterNamesById?: Map<string, string> }
): string[] {
  return props.map((prop) =>
    joinPrioritizedChunks(buildPropMemoryPromptChunks([prop], options))
  );
}

export function buildWorldMemoryPromptChunks(
  world: SceneMemoryBundle["world"]
): PrioritizedMemoryChunk[] {
  if (!world) {
    return [];
  }
  const chunks: PrioritizedMemoryChunk[] = [
    { priority: "high", text: `Maintain ${world.name} world visual style.` },
  ];
  for (const line of buildWorldIdentityMemoryPromptExtras(world)) {
    chunks.push({ priority: "high", text: line });
  }
  for (const line of buildWorldIdentityRenderStrategyHints(
    worldProfilePickToListItem({
      id: world.id,
      name: world.name,
      description: world.description,
      visualStyle: world.visualStyle,
      tone: world.tone,
      continuityRules: world.continuityRules,
      continuityStrength: world.continuityStrength,
    })
  )) {
    chunks.push({ priority: "high", text: line });
  }
  chunks.push({
    priority: "low",
    text: continuityStrengthPromptHint(world.continuityStrength),
  });
  return chunks;
}

export function buildWorldMemoryPromptLines(world: SceneMemoryBundle["world"]): string[] {
  const chunks = buildWorldMemoryPromptChunks(world);
  if (chunks.length === 0) {
    return [];
  }
  return [joinPrioritizedChunks(chunks)];
}

/** Priority-ordered memory chunks for motion instruction packing (high first). */
export function buildSceneMemoryPromptChunks(
  params: {
    characters: SceneMemoryBundle["characters"];
    location: SceneMemoryBundle["location"];
    props: SceneMemoryBundle["props"];
    world: SceneMemoryBundle["world"];
  },
  options?: { characterNamesById?: Map<string, string> }
): PrioritizedMemoryChunk[] {
  return [
    ...buildWorldMemoryPromptChunks(params.world),
    ...buildCharacterMemoryPromptChunks(params.characters),
    ...buildLocationMemoryPromptChunks(params.location),
    ...buildPropMemoryPromptChunks(params.props, options),
  ];
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
