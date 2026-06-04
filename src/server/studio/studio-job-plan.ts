import { prisma } from "@/lib/prisma";
import { buildStoryboardImprovementSummary } from "@/lib/build-storyboard-improvement-summary";
import { mapStudioSceneImageToListItem } from "@/lib/studio-scene-image-map";
import { parseSceneConsistencyReport } from "@/lib/studio-consistency-report-parse";
import { parseVisionConsistencyReport } from "@/lib/studio-vision-report-parse";
import { STUDIO_SCENE_DETAIL_INCLUDE } from "@/server/studio/studio-storyboard-service";
import type { StudioJobCreateInput, StudioJobType } from "@/types/studio-job";

export type StudioJobPlannedScene = {
  sceneId: string;
  sceneTitle: string;
  order: number;
};

export async function planStudioJobScenes(
  storyboardId: string,
  type: StudioJobType,
  input: StudioJobCreateInput
): Promise<StudioJobPlannedScene[]> {
  const storyboard = await prisma.studioStoryboard.findUnique({
    where: { id: storyboardId },
    include: {
      scenes: {
        orderBy: { order: "asc" },
        include: STUDIO_SCENE_DETAIL_INCLUDE,
      },
    },
  });
  if (!storyboard) {
    return [];
  }

  const ordered = storyboard.scenes.map((s) => ({
    sceneId: s.id,
    sceneTitle: s.title,
    order: s.order,
    scene: s,
  }));

  const filterByIds = (ids: string[] | undefined) => {
    if (!ids?.length) {
      return ordered;
    }
    const set = new Set(ids);
    return ordered.filter((s) => set.has(s.sceneId));
  };

  if (type === "generate_scene_images") {
    return filterByIds(input.sceneIds).map(({ sceneId, sceneTitle, order }) => ({
      sceneId,
      sceneTitle,
      order,
    }));
  }

  if (type === "analyze_consistency" || type === "analyze_vision") {
    return filterByIds(input.sceneIds)
      .filter(({ scene }) => {
        const pick =
          (scene.selectedSceneImageId
            ? scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)
            : null) ?? scene.sceneImages.find((img) => img.status === "completed");
        return pick?.status === "completed" && pick.generatedPrompt.trim();
      })
      .map(({ sceneId, sceneTitle, order }) => ({ sceneId, sceneTitle, order }));
  }

  if (type === "improve_weak_scenes") {
    if (input.sceneIds?.length) {
      return filterByIds(input.sceneIds).map(({ sceneId, sceneTitle, order }) => ({
        sceneId,
        sceneTitle,
        order,
      }));
    }

    const summary = buildStoryboardImprovementSummary({
      storyboardId,
      scenes: storyboard.scenes.map((scene) => {
        const pick =
          (scene.selectedSceneImageId
            ? scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)
            : null) ?? scene.sceneImages.find((img) => img.status === "completed");
        const mapped = pick ? mapStudioSceneImageToListItem(pick) : null;
        return {
          sceneId: scene.id,
          sceneTitle: scene.title,
          order: scene.order,
          selectedSceneImageId: scene.selectedSceneImageId,
          image: mapped,
          consistencyReport: pick
            ? parseSceneConsistencyReport(pick.consistencyReport)
            : null,
          visionReport: pick ? parseVisionConsistencyReport(pick.visionReport) : null,
        };
      }),
    });

    return summary.scenes
      .filter((s) => s.regeneration.action !== "ok")
      .map((s) => ({
        sceneId: s.sceneId,
        sceneTitle: s.sceneTitle,
        order: s.order,
      }));
  }

  return [];
}
