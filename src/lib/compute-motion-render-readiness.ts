import type { MotionRenderReadiness, MotionRenderReadinessSummaryKey } from "@/types/motion-studio-intelligence";
import type { MotionStudioIntelligenceSnapshot } from "@/types/motion-studio-intelligence";
import type { PersistedWizardSceneSlot } from "@/lib/instant-premium-wizard-storage";

function average(nums: number[]): number | null {
  if (nums.length === 0) {
    return null;
  }
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function summaryKeyForTier(tier: MotionRenderReadiness["tier"]): MotionRenderReadinessSummaryKey {
  switch (tier) {
    case "not_ready":
      return "motion.qa.readiness.notReady";
    case "needs_review":
      return "motion.qa.readiness.needsReview";
    case "ready":
      return "motion.qa.readiness.ready";
    default:
      return "motion.qa.readiness.strong";
  }
}

export function computeMotionRenderReadiness(params: {
  intelligence: MotionStudioIntelligenceSnapshot | null;
  sceneSlots: PersistedWizardSceneSlot[];
}): MotionRenderReadiness {
  const { intelligence, sceneSlots } = params;
  const studioSlots = sceneSlots.filter((s) => s.studioContext);
  const totalScenes = studioSlots.length > 0 ? studioSlots.length : sceneSlots.length;
  const withImage = sceneSlots.filter((s) => s.image?.remoteWorkingUrl || s.image?.remoteThumbnailUrl)
    .length;
  const imageAvailabilityScore =
    totalScenes === 0 ? 0 : Math.round((withImage / totalScenes) * 100);

  if (!intelligence || totalScenes === 0) {
    const tier = imageAvailabilityScore < 50 ? "not_ready" : "needs_review";
    return {
      tier,
      score: imageAvailabilityScore,
      imageAvailabilityScore,
      averageVisionScore: null,
      averageConsistencyScore: null,
      averageCharacterIdentityScore: null,
      criticalDriftCount: 0,
      scenesMissingImages: Math.max(0, totalScenes - withImage),
      scenesNeedingReview: 0,
      summaryMessageKey: summaryKeyForTier(tier),
    };
  }

  const visionScores = intelligence.sceneBreakdowns
    .map((s) => s.visionScore)
    .filter((v): v is number => typeof v === "number");
  const consistencyScores = intelligence.sceneBreakdowns
    .map((s) => s.consistencyScore)
    .filter((v): v is number => typeof v === "number");
  const averageVisionScore = average(visionScores);
  const averageConsistencyScore = average(consistencyScores);
  const averageCharacterIdentityScore = intelligence.overallCharacterIdentityScore;
  const criticalDriftCount = intelligence.driftWarnings.filter(
    (w) => w.severity === "critical"
  ).length;
  const scenesMissingImages = intelligence.sceneBreakdowns.filter((s) => !s.hasSelectedImage)
    .length;
  const scenesNeedingReview = intelligence.sceneBreakdowns.filter(
    (s) =>
      (s.consistencyScore !== null && s.consistencyScore < 65) ||
      (s.visionScore !== null && s.visionScore < 65) ||
      s.characters.some((c) => c.score < 65 || c.driftFlag)
  ).length;

  let tier: MotionRenderReadiness["tier"] = "strong";
  if (imageAvailabilityScore < 50 || scenesMissingImages > 0) {
    tier = "not_ready";
  } else if (
    scenesNeedingReview > 0 ||
    criticalDriftCount > 0 ||
    intelligence.driftWarnings.length > 2 ||
    (averageCharacterIdentityScore !== null && averageCharacterIdentityScore < 55) ||
    (averageVisionScore !== null && averageVisionScore < 65) ||
    (averageConsistencyScore !== null && averageConsistencyScore < 65)
  ) {
    tier = "needs_review";
  } else if (
    (averageCharacterIdentityScore !== null && averageCharacterIdentityScore < 80) ||
    intelligence.partialData
  ) {
    tier = "ready";
  }

  const score = Math.round(
    imageAvailabilityScore * 0.25 +
      (averageVisionScore ?? 70) * 0.2 +
      (averageConsistencyScore ?? 70) * 0.2 +
      (averageCharacterIdentityScore ?? 70) * 0.25 -
      criticalDriftCount * 8 -
      scenesNeedingReview * 4
  );

  return {
    tier,
    score: Math.min(100, Math.max(0, score)),
    imageAvailabilityScore,
    averageVisionScore,
    averageConsistencyScore,
    averageCharacterIdentityScore,
    criticalDriftCount,
    scenesMissingImages,
    scenesNeedingReview,
    summaryMessageKey: summaryKeyForTier(tier),
  };
}

export function motionReadinessShouldWarn(readiness: MotionRenderReadiness): boolean {
  return readiness.tier === "not_ready" || readiness.tier === "needs_review";
}
