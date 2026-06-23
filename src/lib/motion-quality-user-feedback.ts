import type { MotionQualityScore } from "@/types/motion-preset-engine";
import type { MotionReferenceVisionSignals } from "@/lib/motion-reference-vision-signals";

export type MotionQualityUserFeedback = {
  identityMessageKey: string;
  motionMessageKey: string;
  presetMessageKey: string;
  overallMessageKey: string;
  tips: string[];
};

export function buildMotionQualityUserFeedback(input: {
  qualityScore: MotionQualityScore;
  visionSignals?: MotionReferenceVisionSignals[];
  presetId?: string | null;
  analysisCached?: boolean;
}): MotionQualityUserFeedback {
  const tips: string[] = [];
  const primary = input.visionSignals?.[0];

  let identityMessageKey = "motionEngine.feedback.identity.recognizable";
  if (input.qualityScore.identityConfidence >= 80) {
    identityMessageKey = "motionEngine.feedback.identity.recognizable";
  } else if (input.qualityScore.identityConfidence >= 55) {
    identityMessageKey = "motionEngine.feedback.identity.partial";
    tips.push("motionEngine.feedback.tip.clearerPhoto");
  } else {
    identityMessageKey = "motionEngine.feedback.identity.unclear";
    tips.push("motionEngine.feedback.tip.clearerPhoto");
  }

  if (primary?.mascotDetected && input.qualityScore.mascotConsistency >= 70) {
    identityMessageKey = "motionEngine.feedback.mascot.suitable";
  }
  if (primary?.productDetected && input.qualityScore.productQuality >= 70) {
    identityMessageKey = "motionEngine.feedback.product.suitable";
  }

  let motionMessageKey = "motionEngine.feedback.motion.ready";
  if (input.qualityScore.bodyVisibility < 55) {
    motionMessageKey = "motionEngine.feedback.motion.needFullBody";
    tips.push("motionEngine.feedback.tip.fullBody");
  } else if (input.qualityScore.faceVisibility < 55) {
    motionMessageKey = "motionEngine.feedback.motion.needFace";
    tips.push("motionEngine.feedback.tip.faceVisible");
  }

  let presetMessageKey = "motionEngine.feedback.preset.match";
  if (input.qualityScore.renderSuitability < 55) {
    presetMessageKey = "motionEngine.feedback.preset.weakMatch";
  }

  let overallMessageKey = "motionEngine.feedback.overall.great";
  if (input.qualityScore.overall < 55) {
    overallMessageKey = "motionEngine.feedback.overall.needsWork";
  } else if (input.qualityScore.overall < 75) {
    overallMessageKey = "motionEngine.feedback.overall.good";
  }

  if (input.analysisCached) {
    tips.push("motionEngine.feedback.tip.cachedCharacter");
  }

  return {
    identityMessageKey,
    motionMessageKey,
    presetMessageKey,
    overallMessageKey,
    tips: [...new Set(tips)],
  };
}
