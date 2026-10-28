/**
 * Saves an already-owned local image as a completed scene still.
 * Does not call a provider and does not reserve credits.
 */

import { prisma } from "@/lib/prisma";
import { PROMPT_BUILDER_VERSION } from "@/types/studio-prompt-builder";

export async function saveOwnedSceneStill(input: {
  sceneId: string;
  imageUrl: string;
  storageKey: string;
  description: string;
}) {
  const image = await prisma.studioSceneImage.create({
    data: {
      sceneId: input.sceneId,
      status: "completed",
      promptVersion: PROMPT_BUILDER_VERSION,
      generationVersion: 1,
      generatedPrompt: input.description.trim().slice(0, 4000) || "Synthetic local still for this scene.",
      imageUrl: input.imageUrl,
      storageKey: input.storageKey,
      thumbnailUrl: "",
      provider: "local_synthetic",
      generationSettings: { synthetic: true, source: "owned_local_media" },
    },
    select: { id: true },
  });
  await prisma.studioScene.update({
    where: { id: input.sceneId },
    data: { selectedSceneImageId: image.id },
  });
  return image;
}
