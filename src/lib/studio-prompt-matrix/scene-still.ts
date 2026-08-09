/**
 * S.6E — Scene still Matrix wrap around existing studio-prompt-builder.
 * Does NOT replace the builder. Proves ContinuityBundle → Matrix → builder compatibility.
 */

import { assembleCreativeSpecification } from "@/lib/studio-prompt-matrix/assemble";
import {
  resolveContinuityBundleFromPromptInput,
  type ContinuityBundle,
} from "@/lib/studio-prompt-matrix/continuity-bundle";
import type { CreativeSpecification } from "@/lib/studio-prompt-matrix/creative-specification";
import { transformOpenAiImageFromSceneStill } from "@/lib/studio-prompt-matrix/transforms/openai-image";
import { buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import type { PromptBuilderInput, PromptBuilderOutput } from "@/types/studio-prompt-builder";
import type { StudioMatrixDetailLevel } from "@/lib/studio-prompt-matrix/types";
import type { PromptPresetOverlay } from "@/lib/studio-prompt-matrix/overlays";

export type SceneStillMatrixResult = {
  continuity: ContinuityBundle;
  specification: CreativeSpecification;
  /** Existing builder output — semantic equivalence target. */
  builderOutput: PromptBuilderOutput;
  /** OpenAI-oriented transform wrapping builder prompt. */
  providerRequest: ReturnType<typeof transformOpenAiImageFromSceneStill>;
};

export function buildSceneStillViaMatrix(
  input: PromptBuilderInput,
  options?: {
    detailLevel?: StudioMatrixDetailLevel;
    durationSeconds?: number | null;
    storyboardId?: string | null;
    storyboardTitle?: string | null;
    aspectRatio?: string | null;
    platform?: string | null;
    promptPreset?: PromptPresetOverlay | null;
  }
): SceneStillMatrixResult {
  const continuity = resolveContinuityBundleFromPromptInput(input, {
    durationSeconds: options?.durationSeconds ?? null,
    storyboardId: options?.storyboardId ?? null,
    storyboardTitle: options?.storyboardTitle ?? null,
  });

  const specification = assembleCreativeSpecification({
    experienceId: "SCENE_STILL",
    continuity,
    detailLevel: options?.detailLevel ?? "PROFESSIONAL",
    promptPreset: options?.promptPreset ?? null,
    selections: {
      shotType: input.shotType ?? input.scene.camera,
      cameraMovement: input.cameraMovement,
      energy: input.sceneEnergy,
      action: input.scene.action,
      emotion: input.scene.emotion,
      styleProfile: input.styleProfile,
      directorProfile: input.directorProfile,
      durationSeconds: options?.durationSeconds ?? null,
      aspectRatio: options?.aspectRatio ?? null,
      platform: options?.platform ?? null,
    },
    explicitUserLock: [
      ...(input.styleProfile ? (["styleProfile"] as const) : []),
      ...(input.sceneEnergy ? (["energy"] as const) : []),
    ],
  });

  // Existing builder remains authoritative for section text.
  const builderOutput = buildScenePromptFromInput(input);
  const providerRequest = transformOpenAiImageFromSceneStill({
    specification,
    continuity,
    builderOutput,
  });

  return {
    continuity,
    specification,
    builderOutput,
    providerRequest,
  };
}
