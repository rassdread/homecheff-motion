import { after } from "next/server";
import { buildStoryboardConsistencyReport } from "@/lib/studio-consistency-timeline";
import { buildStoryboardVisionReport } from "@/lib/studio-vision-timeline";
import { buildStoryboardCharacterConsistencyReport } from "@/lib/studio-character-timeline";
import { formatStudioJobStepLabel } from "@/lib/studio-job-progress";
import { getSelectedSceneImageProviderId } from "@/server/scene-image-providers";
import {
  analyzeSceneImageConsistency,
  persistSceneImageConsistency,
} from "@/server/studio/studio-consistency-service";
import { analyzeAndPersistSceneImageVision } from "@/server/studio/studio-vision-service";
import { generateStudioSceneImage } from "@/server/studio/studio-scene-image-service";
import { improveSceneImageWithApproval } from "@/server/studio/studio-improvement-service";
import {
  createStudioJob,
  finalizeStudioJob,
  getStudioJobRowForRunner,
  isStudioJobCancelled,
  markStudioJobRunning,
  updateStudioJobProgress,
} from "@/server/studio/studio-job-service";
import { planStudioJobScenes } from "@/server/studio/studio-job-plan";
import {
  STUDIO_SCENE_DETAIL_INCLUDE,
  type StudioStoryboardSceneRow,
} from "@/server/studio/studio-storyboard-service";
import { prisma } from "@/lib/prisma";
import { mapStudioSceneImageToListItem } from "@/lib/studio-scene-image-map";
import type {
  StudioJobCreateInput,
  StudioJobResult,
  StudioJobSceneStepResult,
  StudioJobType,
} from "@/types/studio-job";
import type { SessionUser } from "@/server/auth/session";

function viewerFromJob(ownerId: string): Pick<SessionUser, "id" | "role"> {
  return { id: ownerId, role: "user" };
}

function emptyResult(startedAt: Date): StudioJobResult {
  return {
    startedAt: startedAt.toISOString(),
    sceneIdsProcessed: [],
    imageIdsCreated: [],
    sceneResults: [],
    errors: [],
    completedSceneCount: 0,
    failedSceneCount: 0,
    skippedSceneCount: 0,
    provider: getSelectedSceneImageProviderId(),
  };
}

function resolveImageForAnalysis(scene: StudioStoryboardSceneRow) {
  const pick =
    (scene.selectedSceneImageId
      ? scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)
      : null) ?? scene.sceneImages.find((img) => img.status === "completed");

  if (!pick || pick.status !== "completed" || !pick.generatedPrompt.trim()) {
    return null;
  }
  return {
    imageId: pick.id,
    generatedPrompt: pick.generatedPrompt,
    consistencyScoreBefore: pick.consistencyScore,
    visionScoreBefore: pick.visionScore,
  };
}

export function scheduleStudioJobRun(jobId: string): void {
  after(async () => {
    await runStudioJob(jobId);
  });
}

export async function runStudioJob(jobId: string): Promise<void> {
  const job = await getStudioJobRowForRunner(jobId);
  if (!job || job.status === "cancelled" || job.status === "completed" || job.status === "failed") {
    return;
  }

  const startedAt = new Date();
  const input = job.inputJson as StudioJobCreateInput;
  const viewer = viewerFromJob(job.ownerId);
  const planned = await planStudioJobScenes(job.storyboardId, job.type as StudioJobType, input);

  if (planned.length === 0) {
    await finalizeStudioJob(jobId, {
      status: "failed",
      errorMessage: "No scenes to process for this job.",
      result: emptyResult(startedAt),
    });
    return;
  }

  const running = await markStudioJobRunning(jobId);
  if (!running) {
    return;
  }

  const result = emptyResult(startedAt);
  const total = planned.length;

  for (let index = 0; index < planned.length; index += 1) {
    if (await isStudioJobCancelled(jobId)) {
      result.completedAt = new Date().toISOString();
      result.durationMs = Date.now() - startedAt.getTime();
      await finalizeStudioJob(jobId, {
        status: "cancelled",
        result,
      });
      return;
    }

    const step = planned[index]!;
    const actionLabel =
      job.type === "generate_scene_images"
        ? "Generating image"
        : job.type === "analyze_consistency"
          ? "Analyzing consistency"
          : job.type === "analyze_vision"
            ? "Analyzing vision"
            : job.type === "analyze_character_consistency"
              ? "Analyzing character identity"
              : "Improving scene";

    const stepLabel = formatStudioJobStepLabel({
      sceneIndex: index,
      totalScenes: total,
      sceneTitle: step.sceneTitle,
      action: actionLabel,
    });

    await updateStudioJobProgress(jobId, {
      currentStep: index,
      totalSteps: total,
      currentStepLabel: stepLabel,
      partialResult: result,
    });

    result.sceneIdsProcessed.push(step.sceneId);

    const stepResult: StudioJobSceneStepResult = {
      sceneId: step.sceneId,
      sceneTitle: step.sceneTitle,
      order: step.order,
      ok: false,
    };

    try {
      if (job.type === "generate_scene_images") {
        const gen = await generateStudioSceneImage(job.storyboardId, step.sceneId, viewer);
        if ("error" in gen) {
          stepResult.error = gen.error.message;
          result.errors.push({ sceneId: step.sceneId, sceneTitle: step.sceneTitle, message: gen.error.message });
          result.failedSceneCount += 1;
        } else {
          stepResult.ok = true;
          stepResult.imageId = gen.image.id;
          result.imageIdsCreated.push(gen.image.id);
          result.completedSceneCount += 1;
        }
      } else if (job.type === "analyze_consistency") {
        const scene = await prisma.studioScene.findFirst({
          where: { id: step.sceneId, storyboardId: job.storyboardId },
          include: STUDIO_SCENE_DETAIL_INCLUDE,
        });
        const target = scene ? resolveImageForAnalysis(scene) : null;
        if (!scene || !target) {
          stepResult.error = "No completed scene image to analyze.";
          result.skippedSceneCount += 1;
        } else {
          stepResult.consistencyScoreBefore = target.consistencyScoreBefore;
          const report = analyzeSceneImageConsistency({
            scene,
            generatedPrompt: target.generatedPrompt,
          });
          const image = await persistSceneImageConsistency(target.imageId, report);
          stepResult.ok = true;
          stepResult.imageId = image.id;
          stepResult.consistencyScoreAfter = image.consistencyScore;
          result.completedSceneCount += 1;
        }
      } else if (job.type === "analyze_vision") {
        const scene = await prisma.studioScene.findFirst({
          where: { id: step.sceneId, storyboardId: job.storyboardId },
          include: STUDIO_SCENE_DETAIL_INCLUDE,
        });
        const pick =
          scene &&
          ((scene.selectedSceneImageId
            ? scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)
            : null) ??
            scene.sceneImages.find((img) => img.status === "completed"));
        if (!scene || !pick || pick.status !== "completed") {
          stepResult.error = "No completed scene image to analyze.";
          result.skippedSceneCount += 1;
        } else {
          stepResult.visionScoreBefore = pick.visionScore;
          try {
            const vision = await analyzeAndPersistSceneImageVision(
              job.storyboardId,
              step.sceneId,
              pick.id,
              viewer
            );
            if ("error" in vision) {
              stepResult.error = vision.error.message;
              result.errors.push({
                sceneId: step.sceneId,
                sceneTitle: step.sceneTitle,
                message: vision.error.message,
              });
              result.failedSceneCount += 1;
            } else {
              stepResult.ok = true;
              stepResult.imageId = vision.image.id;
              stepResult.visionScoreAfter = vision.image.visionScore;
              result.completedSceneCount += 1;
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "Vision analysis failed.";
            stepResult.error = message;
            result.errors.push({ sceneId: step.sceneId, sceneTitle: step.sceneTitle, message });
            result.failedSceneCount += 1;
          }
        }
      } else if (job.type === "analyze_character_consistency") {
        const scene = await prisma.studioScene.findFirst({
          where: { id: step.sceneId, storyboardId: job.storyboardId },
          include: STUDIO_SCENE_DETAIL_INCLUDE,
        });
        const target = scene ? resolveImageForAnalysis(scene) : null;
        if (!scene || !target) {
          stepResult.error = "No completed scene image to analyze.";
          result.skippedSceneCount += 1;
        } else {
          try {
            const consistencyReport = analyzeSceneImageConsistency({
              scene,
              generatedPrompt: target.generatedPrompt,
            });
            await persistSceneImageConsistency(target.imageId, consistencyReport);
            const vision = await analyzeAndPersistSceneImageVision(
              job.storyboardId,
              step.sceneId,
              target.imageId,
              viewer
            );
            if ("error" in vision) {
              stepResult.error = vision.error.message;
              result.errors.push({
                sceneId: step.sceneId,
                sceneTitle: step.sceneTitle,
                message: vision.error.message,
              });
              result.failedSceneCount += 1;
            } else {
              stepResult.ok = true;
              stepResult.imageId = vision.image.id;
              stepResult.consistencyScoreAfter = vision.image.consistencyScore;
              stepResult.visionScoreAfter = vision.image.visionScore;
              result.completedSceneCount += 1;
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "Character analysis failed.";
            stepResult.error = message;
            result.errors.push({ sceneId: step.sceneId, sceneTitle: step.sceneTitle, message });
            result.failedSceneCount += 1;
          }
        }
      } else if (job.type === "improve_weak_scenes") {
        const improved = await improveSceneImageWithApproval(
          job.storyboardId,
          step.sceneId,
          undefined,
          viewer,
          {
            autoSelect:
              input.options?.autoSelect ?? job.storyboard.autoSelectImprovedImage,
          }
        );
        if ("error" in improved) {
          stepResult.error = improved.error.message;
          result.errors.push({
            sceneId: step.sceneId,
            sceneTitle: step.sceneTitle,
            message: improved.error.message,
          });
          result.failedSceneCount += 1;
        } else {
          stepResult.ok = true;
          stepResult.imageId = improved.image.id;
          stepResult.autoSelected = improved.autoSelected;
          stepResult.consistencyScoreAfter = improved.image.consistencyScore;
          stepResult.visionScoreAfter = improved.image.visionScore;
          stepResult.overallImprovementScore = improved.improvement.overallDelta;
          result.imageIdsCreated.push(improved.image.id);
          result.completedSceneCount += 1;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Step failed.";
      stepResult.error = message;
      result.errors.push({ sceneId: step.sceneId, sceneTitle: step.sceneTitle, message });
      result.failedSceneCount += 1;
    }

    result.sceneResults.push(stepResult);

    await updateStudioJobProgress(jobId, {
      currentStep: index + 1,
      totalSteps: total,
      currentStepLabel: stepLabel,
      partialResult: result,
    });
  }

  result.completedAt = new Date().toISOString();
  result.durationMs = Date.now() - startedAt.getTime();

  if (job.type === "analyze_consistency" && result.completedSceneCount > 0) {
    const scenes = await prisma.studioStoryboard.findUnique({
      where: { id: job.storyboardId },
      include: {
        scenes: { orderBy: { order: "asc" }, include: STUDIO_SCENE_DETAIL_INCLUDE },
      },
    });
    if (scenes) {
      const report = buildStoryboardConsistencyReport({
        storyboardId: job.storyboardId,
        scenes: scenes.scenes.map((scene) => {
          const pick =
            (scene.selectedSceneImageId
              ? scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)
              : null) ?? scene.sceneImages.find((img) => img.status === "completed");
          return {
            sceneId: scene.id,
            sceneTitle: scene.title,
            order: scene.order,
            imageId: pick?.id ?? null,
            report: pick
              ? mapStudioSceneImageToListItem(pick).consistencyReport
              : null,
          };
        }),
      });
      result.overallConsistencyScore = report.overallScore;
      result.driftWarnings = report.driftWarnings;
    }
  }

  if (job.type === "analyze_character_consistency" && result.completedSceneCount > 0) {
    const board = await prisma.studioStoryboard.findUnique({
      where: { id: job.storyboardId },
      include: {
        scenes: { orderBy: { order: "asc" }, include: STUDIO_SCENE_DETAIL_INCLUDE },
      },
    });
    if (board) {
      const report = buildStoryboardCharacterConsistencyReport({
        storyboardId: job.storyboardId,
        scenes: board.scenes.map((scene) => {
          const pick =
            (scene.selectedSceneImageId
              ? scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)
              : null) ?? scene.sceneImages.find((img) => img.status === "completed");
          return {
            sceneId: scene.id,
            sceneTitle: scene.title,
            order: scene.order,
            imageId: pick?.id ?? null,
            characters: scene.characters.map((link) => ({
              id: link.character.id,
              name: link.character.name,
              role: link.character.role,
              description: link.character.description,
              personality: link.character.personality,
              referenceImageUrl: link.character.referenceImageUrl,
              appearanceMemory: link.character.appearanceMemory,
              personalityMemory: link.character.personalityMemory,
              continuityNotes: link.character.continuityNotes,
              defaultClothing: link.character.defaultClothing,
              defaultAccessories: link.character.defaultAccessories,
              visualKeywords: link.character.visualKeywords,
              primaryReferenceImageId: link.character.primaryReferenceImageId,
              referenceNotes: link.character.referenceNotes,
              identityStrength: link.character.identityStrength,
              continuityStrength: link.character.continuityStrength,
              worldProfileId: link.character.worldProfileId,
              worldProfile: link.character.worldProfile,
            })),
            consistencyReportJson: pick?.consistencyReport ?? null,
            visionReportJson: pick?.visionReport ?? null,
          };
        }),
      });
      result.overallCharacterConsistencyScore = report.overallCharacterConsistencyScore;
      result.characterDriftWarnings = report.driftWarnings;
    }
  }

  if (job.type === "analyze_vision" && result.completedSceneCount > 0) {
    const scenes = await prisma.studioStoryboard.findUnique({
      where: { id: job.storyboardId },
      include: {
        scenes: { orderBy: { order: "asc" }, include: STUDIO_SCENE_DETAIL_INCLUDE },
      },
    });
    if (scenes) {
      const report = buildStoryboardVisionReport({
        storyboardId: job.storyboardId,
        scenes: scenes.scenes.map((scene) => {
          const pick =
            (scene.selectedSceneImageId
              ? scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)
              : null) ?? scene.sceneImages.find((img) => img.status === "completed");
          return {
            sceneId: scene.id,
            sceneTitle: scene.title,
            order: scene.order,
            imageId: pick?.id ?? null,
            report: pick ? mapStudioSceneImageToListItem(pick).visionReport : null,
          };
        }),
      });
      result.overallVisionScore = report.overallVisionScore;
      result.visionWarnings = report.visionWarnings;
    }
  }

  const status = result.completedSceneCount === 0 ? "failed" : "completed";

  await finalizeStudioJob(jobId, {
    status,
    errorMessage:
      status === "failed"
        ? result.errors[0]?.message ?? "All scenes failed."
        : result.failedSceneCount > 0
          ? `${result.failedSceneCount} scene(s) failed.`
          : "",
    result,
  });
}

export async function createAndScheduleStudioJob(
  storyboardId: string,
  type: StudioJobType,
  input: StudioJobCreateInput,
  viewer: Pick<SessionUser, "id" | "role">
) {
  const planned = await planStudioJobScenes(storyboardId, type, input);
  if (planned.length === 0) {
    return {
      error: {
        code: "NO_SCENES",
        message: "No scenes match this job.",
        httpStatus: 400,
      },
    } as const;
  }

  const created = await createStudioJob(
    storyboardId,
    type,
    input,
    viewer,
    planned.length
  );
  if ("error" in created) {
    return created;
  }

  scheduleStudioJobRun(created.job.id);
  return created;
}
