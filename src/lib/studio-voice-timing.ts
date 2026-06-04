/**
 * Studio V28 — voice timing vs scene duration (planning only).
 */

import {
  countWords,
  estimateSecondsFromWords,
  type VoiceScriptBundle,
} from "@/lib/studio-voice-script-builder";
import type { StudioVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

export type VoiceTimingWarningCode =
  | "narration_too_long"
  | "narration_too_short"
  | "exceeds_scene_duration";

export type VoiceTimingWarning = {
  code: VoiceTimingWarningCode;
  messageKey: string;
  sceneIds: string[];
  params?: Record<string, string | number>;
};

export type SceneVoiceTiming = {
  sceneId: string;
  order: number;
  words: number;
  estimatedSeconds: number;
  sceneDurationSeconds: number;
  fitScore: number;
};

export type VoiceTimingReport = {
  totalWords: number;
  estimatedSeconds: number;
  speakingSpeedWpm: number;
  sceneTimings: SceneVoiceTiming[];
  warnings: VoiceTimingWarning[];
};

const MIN_FIT_SCORE = 35;
const MAX_FIT_SCORE = 100;

function fitScoreForRatio(ratio: number): number {
  if (ratio <= 0) {
    return 0;
  }
  if (ratio >= 0.65 && ratio <= 1.05) {
    return MAX_FIT_SCORE;
  }
  if (ratio < 0.65) {
    return Math.max(MIN_FIT_SCORE, Math.round(ratio / 0.65 * MAX_FIT_SCORE));
  }
  return Math.max(MIN_FIT_SCORE, Math.round((1.05 / ratio) * MAX_FIT_SCORE));
}

export function planVoiceTiming(params: {
  storyboard: StudioStoryboardDetail;
  script: VoiceScriptBundle;
  profile: StudioVoiceProfilePreset;
}): VoiceTimingReport {
  const scenes = [...params.storyboard.scenes].sort((a, b) => a.order - b.order);
  const wpm = params.profile.speakingPaceWpm;
  const warnings: VoiceTimingWarning[] = [];

  const sceneTimings: SceneVoiceTiming[] = params.script.sceneNarrations.map((row) => {
    const scene = scenes.find((s) => s.id === row.sceneId);
    const words = countWords(row.text);
    const estimatedSeconds = estimateSecondsFromWords(words, wpm);
    const sceneDurationSeconds = scene?.durationSeconds ?? 5;
    const ratio = estimatedSeconds / Math.max(1, sceneDurationSeconds);
    const fitScore = fitScoreForRatio(ratio);

    if (estimatedSeconds > sceneDurationSeconds * 1.15) {
      warnings.push({
        code: "exceeds_scene_duration",
        messageKey: "studio.voice.warning.exceedsScene",
        sceneIds: [row.sceneId],
        params: {
          scene: row.order + 1,
          seconds: estimatedSeconds,
          limit: sceneDurationSeconds,
        },
      });
    } else if (ratio < 0.35 && words > 0) {
      warnings.push({
        code: "narration_too_short",
        messageKey: "studio.voice.warning.tooShort",
        sceneIds: [row.sceneId],
        params: { scene: row.order + 1 },
      });
    } else if (ratio > 1.2) {
      warnings.push({
        code: "narration_too_long",
        messageKey: "studio.voice.warning.tooLong",
        sceneIds: [row.sceneId],
        params: { scene: row.order + 1 },
      });
    }

    return {
      sceneId: row.sceneId,
      order: row.order,
      words,
      estimatedSeconds,
      sceneDurationSeconds,
      fitScore,
    };
  });

  const totalWords = countWords(params.script.fullNarration);
  const estimatedSeconds = estimateSecondsFromWords(totalWords, wpm);

  const totalSceneDuration = scenes.reduce((sum, s) => sum + (s.durationSeconds || 5), 0);
  if (estimatedSeconds > totalSceneDuration * 1.1 && scenes.length > 0) {
    warnings.push({
      code: "narration_too_long",
      messageKey: "studio.voice.warning.totalTooLong",
      sceneIds: scenes.map((s) => s.id),
      params: { seconds: estimatedSeconds, limit: totalSceneDuration },
    });
  }
  if (estimatedSeconds < totalSceneDuration * 0.25 && totalWords > 0 && scenes.length >= 3) {
    warnings.push({
      code: "narration_too_short",
      messageKey: "studio.voice.warning.totalTooShort",
      sceneIds: [],
      params: { seconds: estimatedSeconds },
    });
  }

  return {
    totalWords,
    estimatedSeconds,
    speakingSpeedWpm: wpm,
    sceneTimings,
    warnings,
  };
}

export function averageSceneFitScore(timings: SceneVoiceTiming[]): number {
  if (timings.length === 0) {
    return 0;
  }
  const sum = timings.reduce((acc, row) => acc + row.fitScore, 0);
  return Math.round(sum / timings.length);
}
