import { prisma } from "@/lib/prisma";
import { buildSceneCorrectionBundle } from "@/lib/build-scene-correction-bundle";
import { parseSceneConsistencyReport } from "@/lib/studio-consistency-report-parse";
import { parseVisionConsistencyReport } from "@/lib/studio-vision-report-parse";
import {
  analyzeAndPersistSceneImage,
  analyzeStoryboardConsistency,
} from "@/server/studio/studio-consistency-service";
import { studioStoryboardViewerCanModify } from "@/server/studio/studio-storyboard-access";
import { buildStoryboardCorrectionSummary } from "@/lib/studio-storyboard-correction-summary";
import type {
  SceneCorrectionPreviewResponse,
  StoryboardCorrectionSummary,
} from "@/types/studio-correction";
import type { SessionUser } from "@/server/auth/session";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export async function previewSceneCorrections(
  storyboardId: string,
  sceneId: string,
  sourceImageId: string | undefined,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ preview: SceneCorrectionPreviewResponse } | { error: ServiceError }> {
  const scene = await prisma.studioScene.findFirst({
    where: { id: sceneId, storyboardId },
    include: { sceneImages: { orderBy: { createdAt: "desc" } }, storyboard: true },
  });
  if (!scene) {
    return { error: serviceError("NOT_FOUND", "Scene not found.", 404) };
  }
  if (!studioStoryboardViewerCanModify(viewer, scene.storyboard)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const source =
    (sourceImageId
      ? scene.sceneImages.find((img) => img.id === sourceImageId)
      : null) ??
    scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId) ??
    scene.sceneImages.find((img) => img.status === "completed");

  if (!source || source.status !== "completed" || !source.generatedPrompt.trim()) {
    return {
      error: serviceError(
        "NO_SOURCE_IMAGE",
        "Select a completed scene image to build corrections.",
        400
      ),
    };
  }

  let report = parseSceneConsistencyReport(source.consistencyReport);
  if (!report) {
    const analyzed = await analyzeAndPersistSceneImage(
      storyboardId,
      sceneId,
      source.id,
      viewer
    );
    if ("error" in analyzed) {
      return analyzed;
    }
    report = analyzed.report;
  }

  const visionReport = parseVisionConsistencyReport(source.visionReport);

  const bundle = buildSceneCorrectionBundle({
    basePrompt: source.generatedPrompt,
    consistencyReport: report,
    visionReport,
  });

  return {
    preview: {
      sourceImageId: source.id,
      basePrompt: bundle.basePrompt,
      correctedPrompt: bundle.correctedPrompt,
      recommendations: bundle.recommendations,
      patches: bundle.patches,
      consistencyReport: report,
    },
  };
}

export async function generateStoryboardCorrections(
  storyboardId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ summary: StoryboardCorrectionSummary } | { error: ServiceError }> {
  const analyzed = await analyzeStoryboardConsistency(storyboardId, viewer);
  if ("error" in analyzed) {
    return analyzed;
  }

  const summary = buildStoryboardCorrectionSummary({
    storyboardId,
    consistencyReport: analyzed.report,
  });

  return { summary };
}
