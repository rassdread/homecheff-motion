import type { Prisma, StudioSceneImage } from "@prisma/client";
import {
  STUDIO_SCENE_IMAGE_STATUSES,
  type StudioSceneImageGenerationSettings,
  type StudioSceneImageListItem,
  type StudioSceneImageStatus,
} from "@/types/studio-scene-image";

function isStudioSceneImageStatus(value: string): value is StudioSceneImageStatus {
  return (STUDIO_SCENE_IMAGE_STATUSES as readonly string[]).includes(value);
}

function parseGenerationSettings(
  value: Prisma.JsonValue | null
): StudioSceneImageGenerationSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as StudioSceneImageGenerationSettings;
}

export function mapStudioSceneImageToListItem(row: StudioSceneImage): StudioSceneImageListItem {
  return {
    id: row.id,
    sceneId: row.sceneId,
    status: isStudioSceneImageStatus(row.status) ? row.status : "failed",
    promptVersion: row.promptVersion,
    generationVersion: row.generationVersion,
    generatedPrompt: row.generatedPrompt,
    imageUrl: row.imageUrl,
    storageKey: row.storageKey,
    thumbnailUrl: row.thumbnailUrl,
    provider: row.provider,
    seed: row.seed,
    generationSettings: parseGenerationSettings(row.generationSettings),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
