/**
 * Photo movie plan — scene count, batches, duration from photo count.
 */

import type { PhotoMoviePlan } from "@/types/studio-video-production";
import type { StudioVideoIntent } from "@/types/studio-video-production";

const MOTION_BATCH_SIZE = 6;
const CREDITS_PER_SCENE = 12;

function targetSecondsForPhotoCount(count: number): number {
  if (count <= 10) return Math.min(60, Math.max(30, count * 4));
  if (count <= 20) return Math.min(180, Math.max(90, count * 5));
  if (count <= 40) return Math.min(300, Math.max(180, count * 4));
  return Math.min(600, count * 5);
}

function sceneCountForPhotos(count: number): number {
  return Math.max(4, Math.min(count, Math.ceil(count * 0.9)));
}

export function buildPhotoMoviePlan(params: {
  photoCount: number;
  intent?: StudioVideoIntent;
}): PhotoMoviePlan {
  const photoCount = Math.max(1, params.photoCount);
  const sceneCount = sceneCountForPhotos(photoCount);
  const targetSeconds = targetSecondsForPhotoCount(photoCount);
  const sceneDurationSeconds = Math.max(3, Math.floor(targetSeconds / sceneCount));
  const renderBatchCount = Math.ceil(sceneCount / MOTION_BATCH_SIZE);
  const transitionCount = Math.max(0, sceneCount - 1);
  const estimatedCredits = sceneCount * CREDITS_PER_SCENE + 5;
  const estimatedRenderMinutes = Math.ceil(targetSeconds / 60) + renderBatchCount;

  const intent =
    params.intent === "slideshow" ? "slideshow"
    : params.intent === "travel_vlog" ? "travel_vlog"
    : "photo_story";

  return {
    intent,
    photoCount,
    sceneCount,
    targetSeconds,
    sceneDurationSeconds,
    transitionCount,
    renderBatchCount,
    scenesPerBatch: MOTION_BATCH_SIZE,
    ffmpegMergeRequired: sceneCount > MOTION_BATCH_SIZE,
    estimatedCredits,
    estimatedRenderMinutes,
  };
}
