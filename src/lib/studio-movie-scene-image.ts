import type { StudioSceneDetail } from "@/types/studio-api";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

export function resolveSceneDisplayImage(
  scene: Pick<StudioSceneDetail, "selectedSceneImageId" | "sceneImages">
): StudioSceneImageListItem | null {
  const selected = scene.selectedSceneImageId
    ? scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)
    : null;
  if (selected?.status === "completed") {
    return selected;
  }
  return scene.sceneImages.find((img) => img.status === "completed") ?? null;
}

export function sceneHasCompletedImage(scene: Pick<StudioSceneDetail, "sceneImages">): boolean {
  return scene.sceneImages.some((img) => img.status === "completed");
}

export function scenesWithoutCompletedImages(
  scenes: StudioSceneDetail[]
): StudioSceneDetail[] {
  return scenes.filter((s) => !sceneHasCompletedImage(s));
}
