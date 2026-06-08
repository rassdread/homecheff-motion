/**
 * Clone sample quality heuristics — duration only, no AI or audio processing.
 */

export type CloneSampleQualityTier = "basic" | "good" | "excellent";

export type CloneSampleQualityAnalysis = {
  durationSeconds: number;
  tier: CloneSampleQualityTier;
  filledBlocks: number;
  labelKey: string;
  hintKey: string;
};

const MIN_BASIC_SECONDS = 30;
const MIN_GOOD_SECONDS = 45;
const MIN_EXCELLENT_SECONDS = 60;

export function analyzeCloneSampleDuration(durationSeconds: number): CloneSampleQualityAnalysis {
  const duration = Math.max(0, durationSeconds);
  if (duration >= MIN_EXCELLENT_SECONDS) {
    return {
      durationSeconds: duration,
      tier: "excellent",
      filledBlocks: 5,
      labelKey: "studio.voiceClone.quality.excellent",
      hintKey: "studio.voiceClone.quality.excellentHint",
    };
  }
  if (duration >= MIN_GOOD_SECONDS) {
    return {
      durationSeconds: duration,
      tier: "good",
      filledBlocks: 3,
      labelKey: "studio.voiceClone.quality.good",
      hintKey: "studio.voiceClone.quality.goodHint",
    };
  }
  if (duration >= MIN_BASIC_SECONDS) {
    return {
      durationSeconds: duration,
      tier: "good",
      filledBlocks: 3,
      labelKey: "studio.voiceClone.quality.good",
      hintKey: "studio.voiceClone.quality.basicMetHint",
    };
  }
  return {
    durationSeconds: duration,
    tier: "basic",
    filledBlocks: Math.max(1, Math.round((duration / MIN_BASIC_SECONDS) * 2)),
    labelKey: "studio.voiceClone.quality.basic",
    hintKey: "studio.voiceClone.quality.basicHint",
  };
}

export function formatCloneDurationLabel(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins > 0) {
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }
  return `0:${String(secs).padStart(2, "0")}`;
}

export function qualityMeterBlocks(filled: number, total = 5): string {
  const clamped = Math.min(total, Math.max(0, filled));
  return `${"■".repeat(clamped)}${"□".repeat(total - clamped)}`;
}
