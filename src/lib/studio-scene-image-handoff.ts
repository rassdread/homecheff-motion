import type { StudioSceneImageReference } from "@/types/studio-scene-image-reference";

export type StudioSceneImageHandoffRow = {
  id: string;
  status: string;
  imageUrl: string;
  thumbnailUrl: string;
  promptVersion: number;
  generationVersion: number;
};

export type ResolvedStudioSceneImageHandoff = {
  selectedSceneImageId: string | null;
  selectedSceneImageUrl: string | null;
  selectedSceneImagePromptVersion: number | null;
  selectedSceneImageGenerationVersion: number | null;
  reference: StudioSceneImageReference | null;
};

function pickCompletedImage(
  sceneImages: StudioSceneImageHandoffRow[],
  imageId: string | null | undefined
): StudioSceneImageHandoffRow | null {
  if (imageId) {
    const selected = sceneImages.find(
      (img) => img.id === imageId && img.status === "completed" && img.imageUrl.trim()
    );
    if (selected) {
      return selected;
    }
  }
  return (
    sceneImages.find((img) => img.status === "completed" && img.imageUrl.trim()) ?? null
  );
}

/**
 * Resolves the Studio scene image for Motion handoff (selected → latest completed → empty).
 */
export function resolveStudioSceneImageHandoff(params: {
  storyboardId: string;
  sceneId: string;
  selectedSceneImageId: string | null;
  sceneImages: StudioSceneImageHandoffRow[];
}): ResolvedStudioSceneImageHandoff {
  const image = pickCompletedImage(params.sceneImages, params.selectedSceneImageId);

  if (!image) {
    return {
      selectedSceneImageId: null,
      selectedSceneImageUrl: null,
      selectedSceneImagePromptVersion: null,
      selectedSceneImageGenerationVersion: null,
      reference: null,
    };
  }

  const thumbnail = image.thumbnailUrl.trim() || image.imageUrl.trim();

  return {
    selectedSceneImageId: image.id,
    selectedSceneImageUrl: image.imageUrl.trim(),
    selectedSceneImagePromptVersion: image.promptVersion,
    selectedSceneImageGenerationVersion: image.generationVersion,
    reference: {
      sceneImageId: image.id,
      sceneId: params.sceneId,
      storyboardId: params.storyboardId,
      promptVersion: image.promptVersion,
      generationVersion: image.generationVersion,
      imageUrl: image.imageUrl.trim(),
      thumbnailUrl: thumbnail,
    },
  };
}
