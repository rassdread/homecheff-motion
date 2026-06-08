import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildVisionConsistencyReport } from "@/lib/build-vision-consistency-report";
import { buildSceneMemoryBundleFromSceneRow } from "@/lib/studio-scene-memory-bundle";
import { buildStoryboardVisionReport } from "@/lib/studio-vision-timeline";
import { mapStudioSceneImageToListItem } from "@/lib/studio-scene-image-map";
import { parseVisionConsistencyReport } from "@/lib/studio-vision-report-parse";
import {
  getStudioVisionProvider,
  type StudioVisionAnalyzeInput,
} from "@/server/studio-vision-providers";
import {
  STUDIO_SCENE_DETAIL_INCLUDE,
  type StudioStoryboardSceneRow,
} from "@/server/studio/studio-storyboard-service";
import { studioStoryboardViewerCanModify } from "@/server/studio/studio-storyboard-access";
import type { SessionUser } from "@/server/auth/session";
import type { VisionConsistencyReport, StoryboardVisionReport } from "@/types/studio-vision-consistency";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";
import {
  meterOpenAiVision,
  type StudioMeteringContext,
} from "@/server/provider-cost/studio-cost-metering";

export type ServiceError = {
  code: string;
  message: string;
  httpStatus: number;
};

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

function buildVisionInput(
  scene: StudioStoryboardSceneRow,
  image: { imageUrl: string; thumbnailUrl: string; generatedPrompt: string }
): StudioVisionAnalyzeInput {
  const memoryBundle = buildSceneMemoryBundleFromSceneRow({
    characters: scene.characters,
    location: scene.location,
    props: scene.props,
  });

  return {
    sceneImageUrl: image.imageUrl,
    thumbnailUrl: image.thumbnailUrl || null,
    generatedPrompt: image.generatedPrompt,
    sceneTitle: scene.title,
    sceneDescription: scene.description,
    sceneAction: scene.action,
    memory: {
      characters: memoryBundle.characters,
      location: memoryBundle.location,
      props: memoryBundle.props,
      world: memoryBundle.world,
      continuityStrength: memoryBundle.continuityStrength,
    },
    references: {
      characters: scene.characters.map((link) => ({
        id: link.character.id,
        name: link.character.name,
        referenceImageUrl: link.character.referenceImageUrl || null,
      })),
      location: scene.location
        ? {
            id: scene.location.id,
            name: scene.location.name,
            referenceImageUrl: scene.location.referenceImageUrl || null,
          }
        : null,
      props: scene.props.map((link) => ({
        id: link.prop.id,
        name: link.prop.name,
        referenceImageUrl: link.prop.referenceImageUrl || null,
      })),
    },
  };
}

export async function analyzeSceneImageVision(params: {
  scene: StudioStoryboardSceneRow;
  imageUrl: string;
  thumbnailUrl: string;
  generatedPrompt: string;
  metering?: StudioMeteringContext;
}): Promise<VisionConsistencyReport> {
  const provider = getStudioVisionProvider();
  const visionInput = buildVisionInput(params.scene, {
    imageUrl: params.imageUrl,
    thumbnailUrl: params.thumbnailUrl,
    generatedPrompt: params.generatedPrompt,
  });
  const refImageCount =
    1 +
    visionInput.references.characters.filter((c) => c.referenceImageUrl).length +
    (visionInput.references.location?.referenceImageUrl ? 1 : 0) +
    visionInput.references.props.filter((p) => p.referenceImageUrl).length;
  let raw;
  try {
    raw = await provider.analyzeImage(visionInput);
    if (params.metering) {
      meterOpenAiVision({
        ctx: params.metering,
        status: "completed",
        imageCount: Math.min(refImageCount, 5),
        providerId: provider.id,
        relatedJobId: params.metering.relatedJobId ?? undefined,
      });
    }
  } catch (err) {
    if (params.metering) {
      meterOpenAiVision({
        ctx: params.metering,
        status: "failed",
        imageCount: Math.min(refImageCount, 5),
        providerId: provider.id,
        relatedJobId: params.metering.relatedJobId ?? undefined,
      });
    }
    throw err;
  }
  const memoryBundle = buildSceneMemoryBundleFromSceneRow({
    characters: params.scene.characters,
    location: params.scene.location,
    props: params.scene.props,
  });
  return buildVisionConsistencyReport({
    raw,
    memory: {
      characters: memoryBundle.characters,
      location: memoryBundle.location,
      props: memoryBundle.props,
      world: memoryBundle.world,
      continuityStrength: memoryBundle.continuityStrength,
    },
  });
}

export async function persistSceneImageVision(
  imageId: string,
  report: VisionConsistencyReport
): Promise<StudioSceneImageListItem> {
  const row = await prisma.studioSceneImage.update({
    where: { id: imageId },
    data: {
      visionScore: report.overallVisionScore,
      visionStatus: report.visionStatus,
      visionReport: report as unknown as Prisma.InputJsonValue,
      visionAnalyzedAt: new Date(report.analyzedAt),
    },
  });
  return mapStudioSceneImageToListItem(row);
}

export async function analyzeAndPersistSceneImageVision(
  storyboardId: string,
  sceneId: string,
  imageId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ image: StudioSceneImageListItem; report: VisionConsistencyReport } | { error: ServiceError }> {
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
  if (image.status !== "completed" || !image.imageUrl.trim()) {
    return {
      error: serviceError(
        "IMAGE_NOT_READY",
        "Analyze vision only on completed images with a URL.",
        400
      ),
    };
  }

  try {
    const report = await analyzeSceneImageVision({
      scene,
      imageUrl: image.imageUrl,
      thumbnailUrl: image.thumbnailUrl,
      generatedPrompt: image.generatedPrompt,
      metering: {
        userId: viewer.id,
        storyboardId,
        sceneId,
        feature: "vision_scene_qa",
        relatedJobId: imageId,
      },
    });
    const updated = await persistSceneImageVision(imageId, report);
    return { image: updated, report };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vision analysis failed.";
    return {
      error: serviceError("VISION_FAILED", message.slice(0, 500), 502),
    };
  }
}

function resolveImageForVision(
  scene: StudioStoryboardSceneRow
): { imageId: string; imageUrl: string; thumbnailUrl: string; generatedPrompt: string } | null {
  const pick =
    (scene.selectedSceneImageId
      ? scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)
      : null) ?? scene.sceneImages.find((img) => img.status === "completed");

  if (!pick || pick.status !== "completed" || !pick.imageUrl.trim()) {
    return null;
  }
  return {
    imageId: pick.id,
    imageUrl: pick.imageUrl,
    thumbnailUrl: pick.thumbnailUrl,
    generatedPrompt: pick.generatedPrompt,
  };
}

export async function analyzeStoryboardVision(
  storyboardId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ report: StoryboardVisionReport; images: StudioSceneImageListItem[] } | { error: ServiceError }> {
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

  const sceneReports: StoryboardVisionReport["sceneReports"] = [];
  const updatedImages: StudioSceneImageListItem[] = [];

  for (const scene of storyboard.scenes) {
    const target = resolveImageForVision(scene);
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

    try {
      const report = await analyzeSceneImageVision({
        scene,
        imageUrl: target.imageUrl,
        thumbnailUrl: target.thumbnailUrl,
        generatedPrompt: target.generatedPrompt,
        metering: {
          userId: viewer.id,
          storyboardId,
          sceneId: scene.id,
          feature: "vision_storyboard",
          relatedJobId: target.imageId,
        },
      });
      const image = await persistSceneImageVision(target.imageId, report);
      updatedImages.push(image);
      sceneReports.push({
        sceneId: scene.id,
        sceneTitle: scene.title,
        order: scene.order,
        imageId: target.imageId,
        report,
      });
    } catch {
      const cached = parseVisionConsistencyReport(
        scene.sceneImages.find((img) => img.id === target.imageId)?.visionReport ?? null
      );
      sceneReports.push({
        sceneId: scene.id,
        sceneTitle: scene.title,
        order: scene.order,
        imageId: target.imageId,
        report: cached,
      });
    }
  }

  const report = buildStoryboardVisionReport({
    storyboardId,
    scenes: sceneReports,
  });

  return { report, images: updatedImages };
}
