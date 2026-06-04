import { buildSceneMemoryBundleFromSceneRow } from "@/lib/studio-scene-memory-bundle";
import { buildScenePrompt, buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import { studioSceneDetailToPromptInput } from "@/lib/studio-scene-to-prompt-input";
import type { PromptBuilderOutput } from "@/types/studio-prompt-builder";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { StudioSceneDetail } from "@/types/studio-api";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import {
  toSceneSnapshot,
  type StudioStoryboardSceneRow,
} from "@/server/studio/studio-storyboard-service";

export { buildScenePrompt, buildScenePromptFromInput };

export function buildScenePromptFromSceneRow(
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

export function buildScenePromptForDetail(
  scene: StudioSceneDetail,
  styleProfile?: StudioPromptStyleProfile | string
): PromptBuilderOutput {
  return buildScenePromptFromInput(studioSceneDetailToPromptInput(scene, styleProfile));
}

export function buildScenePromptForSnapshot(
  scene: SceneSnapshot,
  styleProfile?: StudioPromptStyleProfile | string
): PromptBuilderOutput {
  return buildScenePrompt(scene, styleProfile);
}
