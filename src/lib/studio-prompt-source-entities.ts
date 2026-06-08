/**
 * Shared source-entity resolution for preview and production prompt building.
 */

import {
  buildSceneIdentityConsumption,
  buildStoryboardIdentityConsumption,
  identityLibrariesFromStoryboard,
  mergeDirectorContextLines,
} from "@/lib/studio-identity-consumption";
import { buildVoiceIntelligenceDirectorLines } from "@/lib/studio-voice-intelligence-consumption";
import { normalizeStudioContinuityStrength } from "@/lib/studio-continuity-strength";
import type { PromptBuilderSourceEntities } from "@/lib/studio-identity-prompt-context";
import type {
  StudioSceneDetail,
  StudioStoryboardDetail,
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

export type SceneDirectorContextOptions = {
  /** Full storyboard — merges storyboard-wide identity + voice intelligence into scene prompts. */
  storyboard?: StudioStoryboardDetail;
  /** Precomputed storyboard director lines (skips rebuild when already available). */
  storyboardDirectorLines?: string[];
};

/** Director identity lines for a scene — scene-specific + optional storyboard-wide context. */
export function buildSceneDirectorContextLines(
  scene: StudioSceneDetail,
  sourceEntities: PromptBuilderSourceEntities,
  options?: SceneDirectorContextOptions
): string[] {
  const consumption = buildSceneIdentityConsumption({
    scene,
    libraries: sourceEntities,
  });
  const sceneLines = [...new Set([...consumption.visualLines, ...consumption.audioLines])];

  const storyboardLines =
    options?.storyboardDirectorLines ??
    (options?.storyboard
      ? buildStoryboardIdentityConsumption({
          storyboard: options.storyboard,
          libraries: identityLibrariesFromStoryboard(options.storyboard),
        }).directorContextLines
      : []);

  const sceneCharacterIds = new Set(scene.characters.map((c) => c.id));
  const voiceLines = buildVoiceIntelligenceDirectorLines({
    characters: sourceEntities.characters.filter((c) => sceneCharacterIds.has(c.id)),
    locationNames: scene.location?.name ? [scene.location.name] : [],
  });

  return mergeDirectorContextLines(
    mergeDirectorContextLines(sceneLines, storyboardLines),
    voiceLines
  );
}
