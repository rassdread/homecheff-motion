import { buildStoryboardImprovementSummary } from "@/lib/build-storyboard-improvement-summary";
import { buildMoviePrepareChecklist } from "@/lib/studio-movie-prepare-checklist";
import { computeMovieReadinessScore } from "@/lib/studio-movie-readiness-score";
import {
  resolveSceneDisplayImage,
  sceneHasCompletedImage,
} from "@/lib/studio-movie-scene-image";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import {
  MOVIE_BUILDER_STEPS,
  type MovieBuilderDashboard,
  type MovieBuilderStepId,
  type MovieBuilderStepState,
} from "@/types/studio-movie-builder";

export function isPrepareStepComplete(storyboard: StudioStoryboardDetail): boolean {
  return buildMoviePrepareChecklist(storyboard).ready;
}

export function isGenerateStepComplete(storyboard: StudioStoryboardDetail): boolean {
  if (storyboard.scenes.length === 0) {
    return false;
  }
  return storyboard.scenes.every((s) => sceneHasCompletedImage(s));
}

export function isAnalyzeStepComplete(storyboard: StudioStoryboardDetail): boolean {
  const scenesWithImages = storyboard.scenes.filter((s) => sceneHasCompletedImage(s));
  if (scenesWithImages.length === 0) {
    return false;
  }
  return scenesWithImages.every((scene) => {
    const img = resolveSceneDisplayImage(scene);
    return (
      img &&
      img.consistencyScore !== null &&
      img.visionScore !== null
    );
  });
}

export function isImproveStepComplete(storyboard: StudioStoryboardDetail): boolean {
  const summary = buildStoryboardImprovementSummary({
    storyboardId: storyboard.id,
    scenes: storyboard.scenes.map((scene) => {
      const img = resolveSceneDisplayImage(scene);
      return {
        sceneId: scene.id,
        sceneTitle: scene.title,
        order: scene.order,
        selectedSceneImageId: scene.selectedSceneImageId,
        image: img,
        consistencyReport: img?.consistencyReport ?? null,
        visionReport: img?.visionReport ?? null,
      };
    }),
  });
  return summary.scenesNeedingImprovement === 0;
}

export function isSelectStepComplete(storyboard: StudioStoryboardDetail): boolean {
  if (storyboard.scenes.length === 0) {
    return false;
  }
  return storyboard.scenes.every((s) => {
    if (!s.selectedSceneImageId) {
      return false;
    }
    const sel = s.sceneImages.find((img) => img.id === s.selectedSceneImageId);
    return sel?.status === "completed";
  });
}

export function isMotionStepComplete(_storyboard: StudioStoryboardDetail): boolean {
  return false;
}

export function getMovieBuilderStepCompletion(
  storyboard: StudioStoryboardDetail
): Record<MovieBuilderStepId, boolean> {
  return {
    prepare: isPrepareStepComplete(storyboard),
    generate: isGenerateStepComplete(storyboard),
    analyze: isAnalyzeStepComplete(storyboard),
    improve: isImproveStepComplete(storyboard),
    select: isSelectStepComplete(storyboard),
    motion: isMotionStepComplete(storyboard),
  };
}

export function resolveCurrentMovieBuilderStep(
  storyboard: StudioStoryboardDetail,
  preferred?: MovieBuilderStepId | null
): MovieBuilderStepId {
  const completion = getMovieBuilderStepCompletion(storyboard);
  if (preferred && MOVIE_BUILDER_STEPS.includes(preferred)) {
    return preferred;
  }
  for (const step of MOVIE_BUILDER_STEPS) {
    if (!completion[step] && step !== "motion") {
      return step;
    }
  }
  return completion.select ? "motion" : "select";
}

export function buildMovieBuilderStepStates(
  storyboard: StudioStoryboardDetail,
  activeStep: MovieBuilderStepId
): MovieBuilderStepState[] {
  const completion = getMovieBuilderStepCompletion(storyboard);
  return MOVIE_BUILDER_STEPS.map((id) => {
    const complete = completion[id];
    let status: MovieBuilderStepState["status"] = "pending";
    if (id === activeStep) {
      status = complete ? "complete" : "active";
    } else if (complete) {
      status = "complete";
    } else if (!complete && !completion.prepare && id !== "prepare") {
      status = "pending";
    } else if (!complete) {
      status = "attention";
    }
    return { id, status, complete };
  });
}

export function buildMovieBuilderDashboard(
  storyboard: StudioStoryboardDetail
): MovieBuilderDashboard {
  const scenes = storyboard.scenes;
  const imagesReady = scenes.filter((s) => sceneHasCompletedImage(s)).length;
  const readiness = computeMovieReadinessScore(storyboard);

  return {
    sceneCount: scenes.length,
    imagesReady,
    imagesReadyLabel: `${imagesReady}/${scenes.length}`,
    averageConsistencyScore: readiness.averageConsistencyScore,
    averageVisionScore: readiness.averageVisionScore,
    warningCount:
      readiness.criticalWarningCount +
      readiness.unresolvedWeakSceneCount +
      readiness.characterDriftWarningCount,
    readiness,
  };
}

export function getNextIncompleteMovieBuilderStep(
  storyboard: StudioStoryboardDetail,
  after?: MovieBuilderStepId
): MovieBuilderStepId | null {
  const completion = getMovieBuilderStepCompletion(storyboard);
  const startIdx = after ? MOVIE_BUILDER_STEPS.indexOf(after) + 1 : 0;
  for (let i = startIdx; i < MOVIE_BUILDER_STEPS.length; i += 1) {
    const step = MOVIE_BUILDER_STEPS[i]!;
    if (step === "motion") {
      if (completion.select) {
        return "motion";
      }
      continue;
    }
    if (!completion[step]) {
      return step;
    }
  }
  return "motion";
}
