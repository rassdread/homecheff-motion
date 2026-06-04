import { prisma } from "@/lib/prisma";
import { buildSceneCorrectionBundle } from "@/lib/build-scene-correction-bundle";
import { buildCombinedCorrectionRecommendations } from "@/lib/build-combined-correction-recommendations";
import { buildRegenerationRecommendation } from "@/lib/build-regeneration-recommendation";
import { buildStoryboardImprovementSummary } from "@/lib/build-storyboard-improvement-summary";
import {
  computeCombinedImageScore,
  pickRecommendedSceneImage,
} from "@/lib/studio-combined-image-score";
import { computeCombinedImprovementScore } from "@/lib/studio-improvement-score";
import { parseSceneConsistencyReport } from "@/lib/studio-consistency-report-parse";
import { parseVisionConsistencyReport } from "@/lib/studio-vision-report-parse";
import {
  isSceneImageProviderAvailable,
  validateSceneImageRegeneration,
} from "@/lib/studio-regeneration-guard";
import { mapStudioSceneImageToListItem } from "@/lib/studio-scene-image-map";
import { analyzeAndPersistSceneImage } from "@/server/studio/studio-consistency-service";
import { analyzeAndPersistSceneImageVision } from "@/server/studio/studio-vision-service";
import { regenerateStudioSceneImageWithCorrections } from "@/server/studio/studio-scene-image-service";
import {
  mapStudioSceneToDetail,
  STUDIO_SCENE_DETAIL_INCLUDE,
  type ServiceError,
} from "@/server/studio/studio-storyboard-service";
import { studioStoryboardViewerCanModify } from "@/server/studio/studio-storyboard-access";
import type { SessionUser } from "@/server/auth/session";
import type {
  BulkImproveScenesResponse,
  ImproveSceneImageResponse,
  RegenerationRecommendation,
  StoryboardImprovementSummary,
} from "@/types/studio-improvement";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

async function resolveSourceImage(
  sceneId: string,
  sourceImageId: string | undefined
) {
  const scene = await prisma.studioScene.findUnique({
    where: { id: sceneId },
    include: { sceneImages: { orderBy: { createdAt: "desc" } } },
  });
  if (!scene) {
    return null;
  }
  const source =
    (sourceImageId
      ? scene.sceneImages.find((img) => img.id === sourceImageId)
      : null) ??
    scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId) ??
    scene.sceneImages.find((img) => img.status === "completed");
  return source ? mapStudioSceneImageToListItem(source) : null;
}

export async function getSceneRegenerationRecommendation(
  storyboardId: string,
  sceneId: string,
  sourceImageId: string | undefined,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ recommendation: RegenerationRecommendation } | { error: ServiceError }> {
  const scene = await prisma.studioScene.findFirst({
    where: { id: sceneId, storyboardId },
    include: { storyboard: true, sceneImages: true },
  });
  if (!scene) {
    return { error: serviceError("NOT_FOUND", "Scene not found.", 404) };
  }
  if (!studioStoryboardViewerCanModify(viewer, scene.storyboard)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const source = await resolveSourceImage(sceneId, sourceImageId);
  const consistencyReport = source
    ? parseSceneConsistencyReport(
        scene.sceneImages.find((i) => i.id === source.id)?.consistencyReport ?? null
      )
    : null;
  const visionReport = source
    ? parseVisionConsistencyReport(
        scene.sceneImages.find((i) => i.id === source.id)?.visionReport ?? null
      )
    : null;

  const recommendations =
    consistencyReport && source
      ? buildCombinedCorrectionRecommendations({
          consistencyReport,
          visionReport,
        })
      : [];

  const recommendation = buildRegenerationRecommendation({
    image: source ?? { status: "failed", consistencyStatus: null, visionStatus: null, generatedPrompt: "" },
    consistencyReport,
    visionReport,
    recommendations,
  });

  return { recommendation };
}

export async function improveSceneImageWithApproval(
  storyboardId: string,
  sceneId: string,
  sourceImageId: string | undefined,
  viewer: Pick<SessionUser, "id" | "role">,
  options?: { autoSelect?: boolean }
): Promise<ImproveSceneImageResponse | { error: ServiceError }> {
  const scene = await prisma.studioScene.findFirst({
    where: { id: sceneId, storyboardId },
    include: { storyboard: true },
  });
  if (!scene) {
    return { error: serviceError("NOT_FOUND", "Scene not found.", 404) };
  }

  const source = await resolveSourceImage(sceneId, sourceImageId);
  let consistencyReport = source
    ? parseSceneConsistencyReport(
        (
          await prisma.studioSceneImage.findUnique({ where: { id: source.id } })
        )?.consistencyReport ?? null
      )
    : null;
  let visionReport = source
    ? parseVisionConsistencyReport(
        (
          await prisma.studioSceneImage.findUnique({ where: { id: source.id } })
        )?.visionReport ?? null
      )
    : null;

  if (source && !consistencyReport) {
    const analyzed = await analyzeAndPersistSceneImage(
      storyboardId,
      sceneId,
      source.id,
      viewer
    );
    if ("error" in analyzed) {
      return analyzed;
    }
    consistencyReport = analyzed.report;
  }
  if (source && !visionReport) {
    const vision = await analyzeAndPersistSceneImageVision(
      storyboardId,
      sceneId,
      source.id,
      viewer
    );
    if (!("error" in vision)) {
      visionReport = vision.report;
    }
  }

  const recommendations = consistencyReport
    ? buildCombinedCorrectionRecommendations({ consistencyReport, visionReport })
    : [];

  const guard = validateSceneImageRegeneration({
    source,
    recommendations,
    providerAvailable: isSceneImageProviderAvailable(),
  });
  if (!guard.ok) {
    return { error: serviceError(guard.code, guard.message, 400) };
  }

  const regeneration = buildRegenerationRecommendation({
    image: source!,
    consistencyReport,
    visionReport,
    recommendations,
  });

  const regen = await regenerateStudioSceneImageWithCorrections(
    storyboardId,
    sceneId,
    source!.id,
    viewer
  );
  if ("error" in regen) {
    return regen;
  }

  const autoSelectEnabled =
    options?.autoSelect ?? scene.storyboard.autoSelectImprovedImage;
  let autoSelected = false;

  if (autoSelectEnabled && source) {
    const newCombined = computeCombinedImageScore({
      visionScore: regen.image.visionScore,
      consistencyScore: regen.image.consistencyScore,
    });
    const oldCombined = computeCombinedImageScore({
      visionScore: source.visionScore,
      consistencyScore: source.consistencyScore,
    });
    const currentSelectedId = scene.selectedSceneImageId;
    const shouldSelect =
      newCombined !== null &&
      (oldCombined === null || newCombined > oldCombined) &&
      (currentSelectedId === source.id || currentSelectedId === null);

    if (shouldSelect) {
      await prisma.studioScene.update({
        where: { id: sceneId },
        data: { selectedSceneImageId: regen.image.id },
      });
      autoSelected = true;
    }
  }

  const updatedSceneRow = await prisma.studioScene.findUnique({
    where: { id: sceneId },
    include: STUDIO_SCENE_DETAIL_INCLUDE,
  });
  if (!updatedSceneRow) {
    return { error: serviceError("NOT_FOUND", "Scene not found after improve.", 404) };
  }

  const improvement = computeCombinedImprovementScore({
    previousConsistencyScore: source!.consistencyScore,
    newConsistencyScore: regen.image.consistencyScore ?? regen.consistencyReport.overallScore,
    previousVisionScore: source!.visionScore,
    newVisionScore: regen.image.visionScore,
  });

  return {
    image: regen.image,
    scene: mapStudioSceneToDetail(updatedSceneRow),
    regeneration,
    correction: regen.correction,
    improvement,
    consistencyReport: regen.consistencyReport,
    visionReport: parseVisionConsistencyReport(regen.image.visionReport),
    autoSelected,
  };
}

export async function getStoryboardImprovementSummary(
  storyboardId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ summary: StoryboardImprovementSummary } | { error: ServiceError }> {
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

  const scenes = storyboard.scenes.map((scene) => {
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
  });

  const summary = buildStoryboardImprovementSummary({
    storyboardId,
    scenes,
  });

  return { summary };
}

export async function bulkImproveScenesWithApproval(
  storyboardId: string,
  sceneIds: string[],
  viewer: Pick<SessionUser, "id" | "role">,
  options?: { autoSelect?: boolean }
): Promise<BulkImproveScenesResponse | { error: ServiceError }> {
  const storyboard = await prisma.studioStoryboard.findUnique({
    where: { id: storyboardId },
  });
  if (!storyboard) {
    return { error: serviceError("NOT_FOUND", "Storyboard not found.", 404) };
  }
  if (!studioStoryboardViewerCanModify(viewer, storyboard)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const results: BulkImproveScenesResponse["results"] = [];
  let processed = 0;

  for (const sceneId of sceneIds) {
    processed += 1;
    const improved = await improveSceneImageWithApproval(
      storyboardId,
      sceneId,
      undefined,
      viewer,
      { autoSelect: options?.autoSelect ?? storyboard.autoSelectImprovedImage }
    );
    if ("error" in improved) {
      results.push({
        sceneId,
        ok: false,
        error: improved.error.message,
      });
    } else {
      results.push({
        sceneId,
        ok: true,
        imageId: improved.image.id,
        autoSelected: improved.autoSelected,
      });
    }
  }

  return {
    results,
    processed,
    total: sceneIds.length,
  };
}

export function getRecommendedImageForScene(
  images: ReturnType<typeof mapStudioSceneImageToListItem>[]
) {
  return pickRecommendedSceneImage(images);
}
