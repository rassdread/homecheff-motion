/**
 * Extracts consistency-check phrases from identity visual-hints lines
 * so analyzers align with Visual Production wording.
 */

import { buildCharacterIdentityVisualProductionLines } from "@/lib/studio-character-identity-visual-hints";
import { buildLocationIdentityVisualProductionLines } from "@/lib/studio-location-identity-visual-hints";
import { buildPropIdentityVisualProductionLines } from "@/lib/studio-prop-identity-visual-hints";
import { buildWorldIdentityVisualProductionLines } from "@/lib/studio-world-identity-visual-hints";
import { memoryPhrases } from "@/lib/studio-consistency-text-signals";
import {
  characterMemorySnapshotToIdentitySpec,
  locationMemorySnapshotToIdentitySpec,
  propMemorySnapshotToIdentitySpec,
  worldMemorySnapshotToIdentitySpec,
} from "@/lib/studio-identity-spec-mappers";
import type {
  CharacterMemorySnapshot,
  LocationMemorySnapshot,
  PropMemorySnapshot,
  WorldMemorySnapshot,
} from "@/types/studio-memory-snapshots";

export function identityPhrasesFromVisualLines(lines: string[]): string[] {
  const phrases = new Set<string>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const colonIdx = trimmed.indexOf(":");
    const content =
      colonIdx >= 0
        ? trimmed.slice(colonIdx + 1).replace(/\.\s*$/, "").trim()
        : trimmed.replace(/\.\s*$/, "").trim();
    if (!content) {
      continue;
    }
    for (const segment of content.split(/[.;]/)) {
      const part = segment.trim();
      if (part.length < 3) {
        continue;
      }
      for (const phrase of memoryPhrases(part)) {
        if (phrase.length >= 3) {
          phrases.add(phrase);
        }
      }
    }
  }
  return [...phrases];
}

function hasStructuredIdentityMarker(...values: string[]): boolean {
  return values.some((value) => /\bhc:[\w=,]+/i.test(value));
}

export function characterIdentityConsistencyPhrases(
  character: CharacterMemorySnapshot
): string[] {
  if (
    !hasStructuredIdentityMarker(
      character.visualKeywords,
      character.appearanceMemory,
      character.defaultClothing,
      character.defaultAccessories
    )
  ) {
    return [];
  }
  const spec = characterMemorySnapshotToIdentitySpec(character);
  return identityPhrasesFromVisualLines(buildCharacterIdentityVisualProductionLines(spec));
}

export function locationIdentityConsistencyPhrases(
  location: LocationMemorySnapshot
): string[] {
  if (
    !hasStructuredIdentityMarker(
      location.environmentKeywords,
      location.visualIdentity,
      location.worldMemory
    )
  ) {
    return [];
  }
  const spec = locationMemorySnapshotToIdentitySpec(location);
  return identityPhrasesFromVisualLines(buildLocationIdentityVisualProductionLines(spec));
}

export function propIdentityConsistencyPhrases(prop: PropMemorySnapshot): string[] {
  if (!hasStructuredIdentityMarker(prop.appearanceMemory, prop.brandingRules)) {
    return [];
  }
  const spec = propMemorySnapshotToIdentitySpec(prop);
  return identityPhrasesFromVisualLines(buildPropIdentityVisualProductionLines(spec));
}

export function worldIdentityConsistencyPhrases(world: WorldMemorySnapshot): string[] {
  if (
    !hasStructuredIdentityMarker(
      world.visualStyle,
      world.tone,
      world.continuityRules,
      world.description
    )
  ) {
    return [];
  }
  const spec = worldMemorySnapshotToIdentitySpec(world);
  return identityPhrasesFromVisualLines(buildWorldIdentityVisualProductionLines(spec));
}

export function mergeConsistencyPhrases(...groups: string[][]): string[] {
  return [...new Set(groups.flat().filter((phrase) => phrase.length >= 3))];
}
