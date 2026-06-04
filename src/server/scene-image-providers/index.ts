import { MockSceneImageProvider } from "@/server/scene-image-providers/mock-provider";
import { OpenAiSceneImageProvider } from "@/server/scene-image-providers/openai-provider";
import type { SceneImageProvider } from "@/server/scene-image-providers/types";

export * from "@/server/scene-image-providers/types";

export type SceneImageProviderId = "openai" | "mock";

/**
 * Which provider generates Studio scene stills (env only, server-side).
 * Defaults to `openai` when OPENAI_API_KEY is set, otherwise `mock`.
 */
export function getSelectedSceneImageProviderId(): SceneImageProviderId {
  const forced = process.env.STUDIO_SCENE_IMAGE_PROVIDER?.trim().toLowerCase();
  if (forced === "openai" || forced === "mock") {
    return forced;
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    return "openai";
  }
  return "mock";
}

export function getSceneImageProvider(): SceneImageProvider {
  if (getSelectedSceneImageProviderId() === "openai") {
    return new OpenAiSceneImageProvider();
  }
  return new MockSceneImageProvider();
}
