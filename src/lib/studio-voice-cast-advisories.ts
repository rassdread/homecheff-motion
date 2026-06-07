/**
 * Production memory cast combination advisories — advisory only, never auto-select.
 */

import type { CastCombinationAdvisory } from "@/types/studio-character-voice-orchestration";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";
import { collectStoryboardCharacters } from "@/lib/studio-character-voice";

function castKey(characterIds: string[]): string {
  return [...characterIds].sort().join("::");
}

export function deriveCastCombinationsFromStoryboard(
  storyboard: StudioStoryboardDetail
): string[] {
  const ids = collectStoryboardCharacters(storyboard)
    .map((c) => c.id)
    .filter(Boolean);
  return ids.length >= 2 ? [castKey(ids)] : [];
}

export function buildCastCombinationFrequency(params: {
  storyboards: Array<{ id: string; characterIds: string[] }>;
}): Map<string, { characterIds: string[]; storyboardIds: Set<string> }> {
  const map = new Map<string, { characterIds: string[]; storyboardIds: Set<string> }>();
  for (const sb of params.storyboards) {
    if (sb.characterIds.length < 2) {
      continue;
    }
    const key = castKey(sb.characterIds);
    const entry = map.get(key) ?? { characterIds: [...sb.characterIds].sort(), storyboardIds: new Set() };
    entry.storyboardIds.add(sb.id);
    map.set(key, entry);
  }
  return map;
}

export function buildFrequentCastAdvisories(params: {
  characters: StudioCharacterListItem[];
  storyboards?: Array<{ id: string; characterIds: string[] }>;
  projectMemory?: StudioProjectMemorySnapshot;
  limit?: number;
}): CastCombinationAdvisory[] {
  const nameById = new Map(params.characters.map((c) => [c.id, c.name]));
  const limit = params.limit ?? 2;

  if (params.projectMemory?.castCombinations?.length) {
    return params.projectMemory.castCombinations
      .filter((row) => row.storyboardCount >= 2 && row.characterIds.length >= 2)
      .slice(0, limit)
      .map((row) => {
        const castNames = row.characterIds.map((id) => nameById.get(id) ?? id).join(" + ");
        return {
          id: `frequent-cast-${row.characterIds.join("-")}`,
          messageKey: "studio.voiceOrchestration.advisory.frequentCast",
          messageParams: { castNames },
          characterIds: row.characterIds,
          storyboardCount: row.storyboardCount,
        };
      });
  }

  const frequency =
    params.storyboards && params.storyboards.length > 0
      ? buildCastCombinationFrequency({ storyboards: params.storyboards })
      : new Map<string, { characterIds: string[]; storyboardIds: Set<string> }>();

  const ranked = [...frequency.entries()]
    .map(([key, usage]) => ({
      key,
      characterIds: usage.characterIds,
      storyboardCount: usage.storyboardIds.size,
    }))
    .filter((row) => row.storyboardCount >= 2)
    .sort((a, b) => b.storyboardCount - a.storyboardCount)
    .slice(0, params.limit ?? 2);

  return ranked.map((row) => {
    const castNames = row.characterIds
      .map((id) => nameById.get(id) ?? id)
      .join(" + ");
    return {
      id: `frequent-cast-${row.key}`,
      messageKey: "studio.voiceOrchestration.advisory.frequentCast",
      messageParams: { castNames },
      characterIds: row.characterIds,
      storyboardCount: row.storyboardCount,
    };
  });
}
