/**
 * Shared source-entity resolution for preview and production prompt building.
 */

import { buildSceneIdentityConsumption } from "@/lib/studio-identity-consumption";
import { normalizeStudioContinuityStrength } from "@/lib/studio-continuity-strength";
import type { PromptBuilderSourceEntities } from "@/lib/studio-identity-prompt-context";
import type {
  StudioSceneDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioContinuityStrength } from "@/lib/studio-continuity-strength";

export function worldProfilePickToListItem(pick: WorldProfilePick): StudioWorldProfileListItem {
  return {
    id: pick.id,
    ownerId: "",
    name: pick.name,
    slug: pick.id,
    description: pick.description,
    visualStyle: pick.visualStyle,
    tone: pick.tone,
    continuityRules: pick.continuityRules,
    continuityStrength: normalizeStudioContinuityStrength(
      pick.continuityStrength
    ) as StudioContinuityStrength,
    createdAt: "",
    updatedAt: "",
  };
}

export type WorldProfilePick = {
  id: string;
  name: string;
  description: string;
  visualStyle: string;
  tone: string;
  continuityRules: string;
  continuityStrength: string;
};

export function collectWorldsFromWorldProfilePicks(
  picks: Array<WorldProfilePick | null | undefined>
): StudioWorldProfileListItem[] {
  const byId = new Map<string, StudioWorldProfileListItem>();
  for (const pick of picks) {
    if (!pick || byId.has(pick.id)) {
      continue;
    }
    byId.set(pick.id, worldProfilePickToListItem(pick));
  }
  return [...byId.values()];
}

/** Same library shape used by StudioScenePromptPreview and server production. */
export function buildPromptSourceEntitiesFromSceneDetail(
  scene: StudioSceneDetail,
  worlds: StudioWorldProfileListItem[] = []
): PromptBuilderSourceEntities {
  return {
    characters: scene.characters,
    locations: scene.location ? [scene.location] : [],
    props: scene.props,
    worlds,
  };
}

/** Director identity lines for a single scene (generation context, not UI-only). */
export function buildSceneDirectorContextLines(
  scene: StudioSceneDetail,
  sourceEntities: PromptBuilderSourceEntities
): string[] {
  const consumption = buildSceneIdentityConsumption({
    scene,
    libraries: sourceEntities,
  });
  return [...new Set([...consumption.visualLines, ...consumption.audioLines])].slice(0, 12);
}
