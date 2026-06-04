import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildSceneConsistencyReport } from "@/lib/build-scene-consistency-report";
import { buildSceneMemoryBundleFromSceneRow } from "@/lib/studio-scene-memory-bundle";
import { buildStoryboardConsistencyReport } from "@/lib/studio-consistency-timeline";
import { mapStudioSceneImageToListItem } from "@/lib/studio-scene-image-map";
import {
  STUDIO_SCENE_DETAIL_INCLUDE,
  type StudioStoryboardSceneRow,
} from "@/server/studio/studio-storyboard-service";
import { studioStoryboardViewerCanModify } from "@/server/studio/studio-storyboard-access";
import type { SessionUser } from "@/server/auth/session";
import type { SceneConsistencyReport, StoryboardConsistencyReport } from "@/types/studio-consistency";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

export type ServiceError = {
  code: string;
  message: string;
  httpStatus: number;
};

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export function analyzeSceneImageConsistency(params: {
  scene: StudioStoryboardSceneRow;
  generatedPrompt: string;
}): SceneConsistencyReport {
  const memoryBundle = buildSceneMemoryBundleFromSceneRow({
    characters: params.scene.characters,
    location: params.scene.location,
    props: params.scene.props,
  });

  return buildSceneConsistencyReport({
    sceneImage: {
      generatedPrompt: params.generatedPrompt,
      sceneTitle: params.scene.title,
      sceneDescription: params.scene.description,
      sceneAction: params.scene.action,
    },
    memory: {
      characters: memoryBundle.characters,
      location: memoryBundle.location,
      props: memoryBundle.props,
      world: memoryBundle.world,
      continuityStrength: memoryBundle.continuityStrength,
    },
  });
}

export async function persistSceneImageConsistency(
  imageId: string,
  report: SceneConsistencyReport
): Promise<StudioSceneImageListItem> {
  const row = await prisma.studioSceneImage.update({
    where: { id: imageId },
    data: {
      consistencyScore: report.overallScore,
      consistencyStatus: report.consistencyStatus,
      consistencyReport: report as unknown as Prisma.InputJsonValue,
      consistencyRecommendations: report.recommendations as unknown as Prisma.InputJsonValue,
      consistencyAnalyzedAt: new Date(report.analyzedAt),
    },
  });
  return mapStudioSceneImageToListItem(row);
}

export async function analyzeAndPersistSceneImage(
  storyboardId: string,
  sceneId: string,
  imageId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ image: StudioSceneImageListItem; report: SceneConsistencyReport } | { error: ServiceError }> {
  const scene = await prisma.studioScene.findFirst({
    where: { id: sceneId, storyboardId },
    include: {
      ...STUDIO_SCENE_DETAIL_INCLUDE,
      storyboard: true,
    },
  });
  if (!scene) {
    return { error: serviceError("NOT_FOUND", "Scene not found.", 404) };
  }
  if (!studioStoryboardViewerCanModify(viewer, scene.storyboard)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const image = await prisma.studioSceneImage.findFirst({
    where: { id: imageId, sceneId },
  });
  if (!image) {
    return { error: serviceError("NOT_FOUND", "Scene image not found.", 404) };
  }
  if (image.status !== "completed" || !image.generatedPrompt.trim()) {
    return {
      error: serviceError(
        "IMAGE_NOT_READY",
        "Analyze consistency only on completed images with a prompt.",
        400
      ),
    };
  }

  const report = analyzeSceneImageConsistency({
    scene,
    generatedPrompt: image.generatedPrompt,
  });
  const updated = await persistSceneImageConsistency(imageId, report);
  return { image: updated, report };
}

function resolveImageForAnalysis(
  scene: StudioStoryboardSceneRow
): { imageId: string; generatedPrompt: string } | null {
  const pick =
    (scene.selectedSceneImageId
      ? scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)
      : null) ?? scene.sceneImages.find((img) => img.status === "completed");

  if (!pick || pick.status !== "completed" || !pick.generatedPrompt.trim()) {
    return null;
  }
  return { imageId: pick.id, generatedPrompt: pick.generatedPrompt };
}

export async function analyzeStoryboardConsistency(
  storyboardId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ report: StoryboardConsistencyReport; images: StudioSceneImageListItem[] } | { error: ServiceError }> {
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
    return { error: serviceError("NOT_FOUND", "Storyboard not found.", 404) };
  }
  if (!studioStoryboardViewerCanModify(viewer, storyboard)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const sceneReports: StoryboardConsistencyReport["sceneReports"] = [];
  const updatedImages: StudioSceneImageListItem[] = [];

  for (const scene of storyboard.scenes) {
    const target = resolveImageForAnalysis(scene);
    if (!target) {
      sceneReports.push({
        sceneId: scene.id,
        sceneTitle: scene.title,
        order: scene.order,
        imageId: null,
        report: null,
      });
      continue;
    }

    const report = analyzeSceneImageConsistency({
      scene,
      generatedPrompt: target.generatedPrompt,
    });
    const image = await persistSceneImageConsistency(target.imageId, report);
    updatedImages.push(image);
    sceneReports.push({
      sceneId: scene.id,
      sceneTitle: scene.title,
      order: scene.order,
      imageId: target.imageId,
      report,
    });
  }

  const report = buildStoryboardConsistencyReport({
    storyboardId,
    scenes: sceneReports,
  });

  return { report, images: updatedImages };
}
