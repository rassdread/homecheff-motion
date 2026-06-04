import type { MouthMovementState, VoiceAmplitudeSample } from "@/types/studio-character-performance";

export type VoiceSegmentAmplitudeInput = {
  text: string;
  startSeconds: number;
  endSeconds: number;
  /** Optional precomputed samples per second; when absent, derived from text rhythm. */
  sampleIntervalSeconds?: number;
};

const MOUTH_ORDER: MouthMovementState[] = ["closed", "small", "medium", "wide"];

/**
 * Audio-driven mouth animation proxy — no phonemes, no AI lip sync.
 * Uses segment duration and text rhythm to emit openness samples over time.
 */
export function analyzeVoiceSegmentAmplitude(
  segment: VoiceSegmentAmplitudeInput
): VoiceAmplitudeSample[] {
  const duration = Math.max(0.1, segment.endSeconds - segment.startSeconds);
  const interval = segment.sampleIntervalSeconds ?? 0.25;
  const words = segment.text.trim().split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);
  const samples: VoiceAmplitudeSample[] = [];
  const steps = Math.max(1, Math.ceil(duration / interval));

  for (let i = 0; i < steps; i++) {
    const offset = Math.min(duration, i * interval);
    const progress = duration > 0 ? offset / duration : 0;
    const wordIndex = Math.floor(progress * wordCount);
    const word = words[Math.min(wordIndex, wordCount - 1)] ?? "";
    const syllableProxy = Math.max(1, Math.ceil(word.length / 3));
    const pulse = (Math.sin(progress * Math.PI * syllableProxy * 2) + 1) / 2;
    const base = 0.25 + pulse * 0.65;
    const mouthState = amplitudeToMouthState(base);
    samples.push({
      offsetSeconds: segment.startSeconds + offset,
      mouthState,
      amplitude: Math.round(base * 100) / 100,
    });
  }

  if (samples.length === 0) {
    samples.push({
      offsetSeconds: segment.startSeconds,
      mouthState: "closed",
      amplitude: 0,
    });
  }

  return samples;
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
