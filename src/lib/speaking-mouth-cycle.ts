import { normalizeSceneEmotion } from "@/lib/studio-character-performance";
import {
  DEFAULT_STUDIO_SCENE_ENERGY,
  normalizeStudioSceneEnergy,
  type StudioSceneEnergy,
} from "@/lib/studio-scene-director";
import type {
  MouthMovementState,
  VoiceAmplitudeSample,
} from "@/types/studio-character-performance";

export const SPEAKING_MOUTH_CYCLES = {
  default: ["closed", "small", "medium", "wide", "medium", "small"],
  calm: ["closed", "small", "medium", "small"],
  excited: ["small", "medium", "wide", "medium", "wide", "small"],
  sad: ["closed", "small", "medium", "small", "closed"],
  angry: ["medium", "wide", "medium", "wide", "medium"],
} as const satisfies Record<string, readonly MouthMovementState[]>;

export type SpeakingMouthCycleKey = keyof typeof SPEAKING_MOUTH_CYCLES;

/** Seconds per mouth-state step at neutral energy. */
export const BASE_SPEAKING_CYCLE_STEP_SECONDS = 0.35;

export const ENERGY_CYCLE_STEP_SECONDS: Record<StudioSceneEnergy, number> = {
  calm: BASE_SPEAKING_CYCLE_STEP_SECONDS * 1.45,
  neutral: BASE_SPEAKING_CYCLE_STEP_SECONDS,
  dynamic: BASE_SPEAKING_CYCLE_STEP_SECONDS * 0.62,
  intense: BASE_SPEAKING_CYCLE_STEP_SECONDS * 0.4,
};

export function resolveSpeakingMouthCycleKey(emotion: string): SpeakingMouthCycleKey {
  const key = normalizeSceneEmotion(emotion);
  if (key === "calm") {
    return "calm";
  }
  if (key === "excited") {
    return "excited";
  }
  if (key === "sad") {
    return "sad";
  }
  if (key === "angry") {
    return "angry";
  }
  return "default";
}

export function speakingCycleStepSeconds(sceneEnergy: string | undefined | null): number {
  const energy = normalizeStudioSceneEnergy(sceneEnergy ?? DEFAULT_STUDIO_SCENE_ENERGY);
  return ENERGY_CYCLE_STEP_SECONDS[energy];
}

export function speakingMouthStateAtTime(params: {
  segmentStartSeconds: number;
  segmentEndSeconds: number;
  absoluteTimeSeconds: number;
  emotion: string;
  sceneEnergy: string;
}): MouthMovementState {
  if (
    params.absoluteTimeSeconds < params.segmentStartSeconds ||
    params.absoluteTimeSeconds >= params.segmentEndSeconds
  ) {
    return "closed";
  }
  const elapsed = params.absoluteTimeSeconds - params.segmentStartSeconds;
  const cycle = SPEAKING_MOUTH_CYCLES[resolveSpeakingMouthCycleKey(params.emotion)];
  const stepSec = speakingCycleStepSeconds(params.sceneEnergy);
  const index = Math.floor(elapsed / Math.max(0.08, stepSec)) % cycle.length;
  return cycle[index] ?? "closed";
}

export function generateSpeakingMouthSamples(params: {
  text: string;
  startSeconds: number;
  endSeconds: number;
  emotion: string;
  sceneEnergy: string;
  sampleIntervalSeconds?: number;
}): VoiceAmplitudeSample[] {
  const duration = Math.max(0.1, params.endSeconds - params.startSeconds);
  const interval = params.sampleIntervalSeconds ?? 0.25;
  const samples: VoiceAmplitudeSample[] = [];
  const steps = Math.max(1, Math.ceil(duration / interval));

  for (let i = 0; i < steps; i++) {
    const offset = Math.min(duration, i * interval);
    const absoluteTime = params.startSeconds + offset;
    const mouthState = speakingMouthStateAtTime({
      segmentStartSeconds: params.startSeconds,
      segmentEndSeconds: params.endSeconds,
      absoluteTimeSeconds: absoluteTime,
      emotion: params.emotion,
      sceneEnergy: params.sceneEnergy,
    });
    samples.push({
      offsetSeconds: absoluteTime,
      mouthState,
      amplitude: mouthState === "closed" ? 0 : mouthState === "wide" ? 1 : 0.5,
    });
  }

  if (samples.length === 0) {
    samples.push({
      offsetSeconds: params.startSeconds,
      mouthState: "closed",
      amplitude: 0,
    });
  }

  return samples;
}

/** One full speaking cycle for UI preview (emotion + energy). */
export function previewSpeakingMouthCycleFrames(params: {
  emotion: string;
  sceneEnergy: string;
}): MouthMovementState[] {
  const cycle = [...SPEAKING_MOUTH_CYCLES[resolveSpeakingMouthCycleKey(params.emotion)]];
  return cycle;
}
