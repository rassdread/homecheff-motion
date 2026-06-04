import { recommendationsToPromptPatches } from "@/lib/build-corrected-prompt";
import type { CorrectionRecommendation } from "@/types/studio-correction";
import type { SceneConsistencyReport } from "@/types/studio-consistency";
import type { VisionConsistencyReport } from "@/types/studio-vision-consistency";
import type {
  RegenerationRecommendation,
  RegenerationRecommendationAction,
} from "@/types/studio-improvement";
import type { CorrectionSeverity } from "@/types/studio-correction";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

function maxSeverity(a: CorrectionSeverity, b: CorrectionSeverity): CorrectionSeverity {
  const order: CorrectionSeverity[] = ["low", "medium", "high", "critical"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

function actionFromSignals(params: {
  visionStatus: string | null;
  consistencyStatus: string | null;
  severity: CorrectionSeverity;
}): RegenerationRecommendationAction {
  if (params.visionStatus === "poor" || params.consistencyStatus === "poor") {
    return "regenerate";
  }
  if (
    params.visionStatus === "needs_review" ||
    params.consistencyStatus === "needs_review" ||
    params.severity === "high" ||
    params.severity === "critical"
  ) {
    return params.severity === "critical" ? "regenerate" : "review";
  }
  if (params.severity === "medium") {
    return "review";
  }
  return "ok";
}

export function buildRegenerationRecommendation(params: {
  image: Pick<
    StudioSceneImageListItem,
    "status" | "consistencyStatus" | "visionStatus" | "generatedPrompt"
  >;
  consistencyReport: SceneConsistencyReport | null;
  visionReport: VisionConsistencyReport | null;
  recommendations: CorrectionRecommendation[];
}): RegenerationRecommendation {
  const patches = recommendationsToPromptPatches(params.recommendations).map((p) => p.text);

  if (params.image.status !== "completed" || !params.image.generatedPrompt.trim()) {
    return {
      shouldRegenerate: false,
      reason: "Complete a scene image before improving.",
      severity: "low",
      confidence: 100,
      suggestedPromptPatches: [],
      action: "ok",
    };
  }

  if (params.recommendations.length === 0) {
    return {
      shouldRegenerate: false,
      reason: "No correction recommendations available.",
      severity: "low",
      confidence: 80,
      suggestedPromptPatches: [],
      action: "ok",
    };
  }

  let severity: CorrectionSeverity = "low";
  const reasons: string[] = [];

  const visionStatus = params.visionReport?.visionStatus ?? params.image.visionStatus;
  const consistencyStatus =
    params.consistencyReport?.consistencyStatus ?? params.image.consistencyStatus;

  if (visionStatus === "poor") {
    severity = maxSeverity(severity, "high");
    reasons.push("Vision quality is poor");
  } else if (visionStatus === "needs_review") {
    severity = maxSeverity(severity, "medium");
    reasons.push("Vision needs review");
  }

  if (consistencyStatus === "poor") {
    severity = maxSeverity(severity, "high");
    reasons.push("Prompt consistency is poor");
  } else if (consistencyStatus === "needs_review") {
    severity = maxSeverity(severity, "medium");
    reasons.push("Consistency needs review");
  }

  for (const rec of params.recommendations) {
    severity = maxSeverity(severity, rec.severity);
    if (rec.type === "MissingCharacterTrait" && /mascot|identity|wrong/i.test(rec.message)) {
      severity = "critical";
      reasons.push("Mascot identity issue detected");
    }
    if (rec.type === "MissingPropBranding" && /missing|not visible|not detected/i.test(rec.message)) {
      severity = maxSeverity(severity, "high");
      reasons.push("Required prop or branding missing");
    }
    if (/logo|branding|homecheff/i.test(rec.message + rec.promptPatch)) {
      severity = maxSeverity(severity, "medium");
      if (!reasons.some((r) => /logo|brand/i.test(r))) {
        reasons.push("Logo or branding issue");
      }
    }
    if (
      rec.type === "WeakLocationIdentity" ||
      rec.type === "WorldStyleMismatch"
    ) {
      severity = maxSeverity(severity, "medium");
      reasons.push("Location or world match is weak");
    }
  }

  const action = actionFromSignals({ visionStatus, consistencyStatus, severity });
  const shouldRegenerate = action === "regenerate";

  const confidence = Math.min(
    100,
    40 +
      (shouldRegenerate ? 35 : action === "review" ? 20 : 0) +
      Math.min(25, params.recommendations.length * 5) +
      (visionStatus === "poor" || consistencyStatus === "poor" ? 15 : 0)
  );

  return {
    shouldRegenerate,
    reason:
      reasons.length > 0
        ? reasons.join(". ")
        : shouldRegenerate
          ? "Scores indicate regeneration is recommended"
          : action === "review"
            ? "Review corrections before regenerating"
            : "Image meets quality targets",
    severity,
    confidence,
    suggestedPromptPatches: patches,
    action,
  };
}
