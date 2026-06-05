import { generateSpeakingMouthSamples } from "@/lib/speaking-mouth-cycle";
import type { MouthMovementState, VoiceAmplitudeSample } from "@/types/studio-character-performance";

export type VoiceSegmentAmplitudeInput = {
  text: string;
  startSeconds: number;
  endSeconds: number;
  sampleIntervalSeconds?: number;
  emotion?: string;
  sceneEnergy?: string;
};

const MOUTH_ORDER: MouthMovementState[] = ["closed", "small", "medium", "wide"];

/** V34.6 — predefined speaking mouth cycle during voice segments (no phonemes / AI). */
export function analyzeVoiceSegmentAmplitude(
  segment: VoiceSegmentAmplitudeInput
): VoiceAmplitudeSample[] {
  return generateSpeakingMouthSamples({
    text: segment.text,
    startSeconds: segment.startSeconds,
    endSeconds: segment.endSeconds,
    emotion: segment.emotion ?? "neutral",
    sceneEnergy: segment.sceneEnergy ?? "neutral",
    sampleIntervalSeconds: segment.sampleIntervalSeconds,
  });
}

export function amplitudeToMouthState(amplitude: number): MouthMovementState {
  if (amplitude < 0.2) {
    return "closed";
  }
  if (amplitude < 0.45) {
    return "small";
  }
  if (amplitude < 0.7) {
    return "medium";
  }
  return "wide";
}

export function dominantMouthStateFromSamples(
  samples: VoiceAmplitudeSample[]
): MouthMovementState {
  if (samples.length === 0) {
    return "closed";
  }
  const counts = new Map<MouthMovementState, number>();
  for (const s of samples) {
    counts.set(s.mouthState, (counts.get(s.mouthState) ?? 0) + 1);
  }
  let best: MouthMovementState = "closed";
  let bestCount = 0;
  for (const state of MOUTH_ORDER) {
    const c = counts.get(state) ?? 0;
    if (c > bestCount) {
      bestCount = c;
      best = state;
    }
  }
  return best;
}

export function mouthStateToIntensity(state: MouthMovementState): number {
  switch (state) {
    case "closed":
      return 0.1;
    case "small":
      return 0.35;
    case "medium":
      return 0.6;
    case "wide":
      return 1;
    default:
      return 0.35;
  }
}
