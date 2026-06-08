import { buildScenePrompt, buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import {
  buildPromptSourceEntitiesFromSceneDetail,
  buildSceneDirectorContextLines,
  collectWorldsFromWorldProfilePicks,
  type WorldProfilePick,
} from "@/lib/studio-prompt-source-entities";
import type { StudioWorldProfileListItem } from "@/types/studio-api";
import { buildSceneMemoryBundleFromSceneRow } from "@/lib/studio-scene-memory-bundle";
import { studioSceneDetailToPromptInput } from "@/lib/studio-scene-to-prompt-input";
import type { PromptBuilderOutput } from "@/types/studio-prompt-builder";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import {
  mapStudioSceneToDetail,
  toSceneSnapshot,
  type StudioStoryboardSceneRow,
} from "@/server/studio/studio-storyboard-service";

export { buildScenePrompt, buildScenePromptFromInput };

function buildPromptSourceEntitiesFromSceneRow(
  row: StudioStoryboardSceneRow
): ReturnType<typeof buildPromptSourceEntitiesFromSceneDetail> {
  const sceneDetail = mapStudioSceneToDetail(row);
  const worldPicks: Array<WorldProfilePick | null | undefined> = [];
  for (const link of row.characters) {
    worldPicks.push(link.character.worldProfile as WorldProfilePick | null);
  }
  if (row.location) {
    worldPicks.push(row.location.worldProfile as WorldProfilePick | null);
  }
  for (const link of row.props) {
    worldPicks.push(link.prop.worldProfile as WorldProfilePick | null);
  }
  return buildPromptSourceEntitiesFromSceneDetail(sceneDetail, collectWorldsFromWorldProfilePicks(worldPicks));
}

/** Unified production prompt path — same sourceEntities + director context as preview. */
export function buildScenePromptFromSceneRow(
  row: StudioStoryboardSceneRow,
  styleProfile?: StudioPromptStyleProfile | string,
  directorProfile?: string,
  options?: { storyboard?: StudioStoryboardDetail }
): PromptBuilderOutput {
  const sceneDetail = mapStudioSceneToDetail(row);
  const sourceEntities = buildPromptSourceEntitiesFromSceneRow(row);
  const directorContextLines = buildSceneDirectorContextLines(sceneDetail, sourceEntities, {
    storyboard: options?.storyboard,
  });

  return buildScenePromptFromInput(
    studioSceneDetailToPromptInput(sceneDetail, styleProfile, directorProfile, {
      sourceEntities,
      directorContextLines,
    })
  );
}

export function buildScenePromptForDetail(
  scene: StudioSceneDetail,
  styleProfile?: StudioPromptStyleProfile | string,
  options?: {
    sourceEntities?: ReturnType<typeof buildPromptSourceEntitiesFromSceneDetail>;
    worlds?: StudioWorldProfileListItem[];
    storyboard?: StudioStoryboardDetail;
  }
): PromptBuilderOutput {
  const sourceEntities =
    options?.sourceEntities ??
    buildPromptSourceEntitiesFromSceneDetail(scene, options?.worlds ?? []);
  const directorContextLines = buildSceneDirectorContextLines(scene, sourceEntities, {
    storyboard: options?.storyboard,
  });
  return buildScenePromptFromInput(
    studioSceneDetailToPromptInput(scene, styleProfile, undefined, {
      sourceEntities,
      directorContextLines,
    })
  );
}

export function buildScenePromptForSnapshot(
  scene: SceneSnapshot,
  styleProfile?: StudioPromptStyleProfile | string
): PromptBuilderOutput {
  return buildScenePrompt(scene, styleProfile);
}

/** Legacy path without scene detail — memory bundle only. */
export function buildScenePromptFromSceneRowLegacy(
  row: StudioStoryboardSceneRow,
  styleProfile?: StudioPromptStyleProfile | string,
  directorProfile?: string
): PromptBuilderOutput {
  const snapshot = toSceneSnapshot(row);
  const memoryBundle = buildSceneMemoryBundleFromSceneRow({
    characters: row.characters,
    location: row.location,
    props: row.props,
  });
  return buildScenePrompt(snapshot, styleProfile, memoryBundle, {
    directorProfile,
    shotType: row.shotType,
    cameraMovement: row.cameraMovement,
    sceneEnergy: row.sceneEnergy,
  });
}
