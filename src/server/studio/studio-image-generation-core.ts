import { getSceneImageProvider } from "@/server/scene-image-providers";
import type { SceneImageGenerateResult } from "@/server/scene-image-providers/types";

/** Thin shared text-to-image entry — reuses SceneImageProvider (OpenAI / mock). */
export async function generateImageBuffersFromPrompt(params: {
  prompt: string;
  correlationId: string;
  ownerId: string;
  seed?: string;
}): Promise<SceneImageGenerateResult> {
  const provider = getSceneImageProvider();
  return provider.generate({
    prompt: params.prompt,
    sceneId: params.correlationId,
    imageRecordId: params.correlationId,
    ownerId: params.ownerId,
    seed: params.seed,
  });
}
