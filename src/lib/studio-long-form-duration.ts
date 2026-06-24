/**
 * Long-form duration planner — extends 30/60/90s to 3/5/10 min.
 */

import type { LongFormDurationTarget, LongFormProductionPlan } from "@/types/studio-video-production";

export const LONG_FORM_DURATION_SECONDS: Record<LongFormDurationTarget, number> = {
  "30s": 30,
  "60s": 60,
  "90s": 90,
  "3min": 180,
  "5min": 300,
  "10min": 600,
};

const ACT_LABELS = ["Act 1", "Act 2", "Act 3", "Act 4", "Act 5"];

function actCountForDuration(seconds: number): number {
  if (seconds <= 60) return 2;
  if (seconds <= 90) return 3;
  if (seconds <= 180) return 4;
  if (seconds <= 300) return 5;
  return 6;
}

function sceneCountForDuration(seconds: number): number {
  if (seconds <= 30) return 4;
  if (seconds <= 60) return 6;
  if (seconds <= 90) return 8;
  if (seconds <= 180) return 12;
  if (seconds <= 300) return 20;
  return 36;
}

const MOTION_BATCH_SIZE = 6;
const DEFAULT_SCENE_DURATION = 20;

export function buildLongFormProductionPlan(target: LongFormDurationTarget): LongFormProductionPlan {
  const targetSeconds = LONG_FORM_DURATION_SECONDS[target];
  const actCount = actCountForDuration(targetSeconds);
  const sceneCount = sceneCountForDuration(targetSeconds);
  const sceneDurationSeconds = Math.max(
    5,
    Math.min(DEFAULT_SCENE_DURATION, Math.floor(targetSeconds / sceneCount))
  );
  const transitionCount = Math.max(0, sceneCount - 1);
  const renderBatchCount = Math.ceil(sceneCount / MOTION_BATCH_SIZE);
  const scenesPerBatch = MOTION_BATCH_SIZE;

  const actDuration = targetSeconds / actCount;
  const acts = Array.from({ length: actCount }, (_, i) => {
    const startSeconds = Math.floor(i * actDuration);
    const endSeconds = i === actCount - 1 ? targetSeconds : Math.floor((i + 1) * actDuration);
    const actSceneCount = Math.max(1, Math.round(sceneCount / actCount));
    return {
      id: `act_${i + 1}`,
      label: ACT_LABELS[i] ?? `Act ${i + 1}`,
      startSeconds,
      endSeconds,
      sceneCount: actSceneCount,
    };
  });

  const imageCredits = sceneCount * 4;
  const renderCredits = sceneCount * 8;
  const publishCredits = 5;
  const estimatedCredits = imageCredits + renderCredits + publishCredits;
  const estimatedRenderMinutes = Math.ceil((sceneCount * sceneDurationSeconds) / 60) + renderBatchCount;

  return {
    target,
    targetSeconds,
    actCount,
    sceneCount,
    renderBatchCount,
    scenesPerBatch,
    sceneDurationSeconds,
    transitionCount,
    estimatedCredits,
    estimatedRenderMinutes,
    ffmpegMergeRequired: sceneCount > 1,
    acts,
  };
}

export function resolveLongFormTargetFromSeconds(seconds: number): LongFormDurationTarget {
  if (seconds <= 30) return "30s";
  if (seconds <= 60) return "60s";
  if (seconds <= 90) return "90s";
  if (seconds <= 180) return "3min";
  if (seconds <= 300) return "5min";
  return "10min";
}

export function extendDirectorDurationOptions(): Array<{ key: string; label: string; seconds: number }> {
  return [
    { key: "short", label: "30 sec", seconds: 30 },
    { key: "medium", label: "60 sec", seconds: 60 },
    { key: "long", label: "90 sec", seconds: 90 },
    { key: "extended_3", label: "3 min", seconds: 180 },
    { key: "extended_5", label: "5 min", seconds: 300 },
    { key: "extended_10", label: "10 min", seconds: 600 },
  ];
}
