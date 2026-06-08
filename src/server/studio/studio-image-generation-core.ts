import { getSceneImageProvider } from "@/server/scene-image-providers";
import type { SceneImageGenerateResult } from "@/server/scene-image-providers/types";
import type {
  AssetGenerationIntent,
  AssetIdentityLockLevel,
} from "@/types/studio-asset-image-generation";

/** Shared text-to-image / source-image edit entry — reuses SceneImageProvider (OpenAI / mock). */
export async function generateImageBuffersFromPrompt(params: {
  prompt: string;
  correlationId: string;
  ownerId: string;
  seed?: string;
  logRoute?: string;
  sourceImageUrl?: string;
  generationIntent?: AssetGenerationIntent;
  identityLockLevel?: AssetIdentityLockLevel;
}): Promise<SceneImageGenerateResult> {
  const provider = getSceneImageProvider();
  return provider.generate({
    prompt: params.prompt,
    sceneId: params.correlationId,
    imageRecordId: params.correlationId,
    ownerId: params.ownerId,
    seed: params.seed,
    logRoute: params.logRoute,
    sourceImageUrl: params.sourceImageUrl,
    generationIntent: params.generationIntent,
    identityLockLevel: params.identityLockLevel,
  });
}
