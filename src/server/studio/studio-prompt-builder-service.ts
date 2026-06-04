import { buildScenePrompt, buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import { studioSceneDetailToPromptInput } from "@/lib/studio-scene-to-prompt-input";
import type { PromptBuilderOutput } from "@/types/studio-prompt-builder";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { StudioSceneDetail } from "@/types/studio-api";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";

export { buildScenePrompt, buildScenePromptFromInput };

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
