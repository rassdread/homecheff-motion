import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { IdentityAssetType } from "@/types/studio-asset-identity-profile";
import type {
  AnimationPreparationActionId,
  AnimationReadinessAnalysis,
  AnimationReadinessIssue,
  BodyVisibilityLevel,
  CharacterConstructionProfile,
} from "@/types/studio-asset-animation-readiness";

export const ANIMATION_PREPARATION_ACTIONS: Array<{
  id: AnimationPreparationActionId;
  labelKey: string;
}> = [
  { id: "remove_background", labelKey: "studio.assetCreation.animationPrep.action.removeBackground" },
  { id: "transparent_png", labelKey: "studio.assetCreation.animationPrep.action.transparentPng" },
  { id: "center_character", labelKey: "studio.assetCreation.animationPrep.action.centerCharacter" },
  { id: "expand_canvas", labelKey: "studio.assetCreation.animationPrep.action.expandCanvas" },
  { id: "reconstruct_full_body", labelKey: "studio.assetCreation.animationPrep.action.reconstructFullBody" },
  { id: "standard_pose", labelKey: "studio.assetCreation.animationPrep.action.standardPose" },
  { id: "expression_base", labelKey: "studio.assetCreation.animationPrep.action.expressionBase" },
  {
    id: "animation_ready_reference",
    labelKey: "studio.assetCreation.animationPrep.action.animationReadyReference",
  },
];

function visionText(vision: AssetVisionAnalysis): string {
  return [
    vision.objectTypeLabel,
    vision.visualStyle,
    vision.environmentHints,
    vision.materialHints,
    vision.identityFingerprint.silhouette,
    vision.identityFingerprint.proportions,
    vision.identityFingerprint.faceStructure,
    ...vision.keyFeatures,
    ...vision.suggestedPreserve,
    ...vision.shapeLanguage,
  ]
    .join(" ")
    .toLowerCase();
}

export function detectBodyVisibilityFromVision(vision: AssetVisionAnalysis): BodyVisibilityLevel {
  const text = visionText(vision);
  if (/head only|face only|icon only|emoji/.test(text)) {
    return "head_only";
  }
  if (/half body|waist up|upper body|torso only|bust/.test(text)) {
    return "half_body";
  }
  if (/portrait|head and shoulders|shoulders up/.test(text)) {
    return "portrait";
  }
  if (/full body|head to toe|standing full|full figure|full length/.test(text)) {
    return "full_body";
  }
  if (vision.objectType === "vehicle" || vision.objectType === "logo" || vision.objectType === "packaging") {
    return "partial";
  }
  if (vision.objectType === "human" || vision.objectType === "character" || vision.objectType === "mascot") {
    return "partial";
  }
  return "partial";
}

export function bodyVisibilityRequiresConstruction(level: BodyVisibilityLevel): boolean {
  return level !== "full_body";
}

function hasFeature(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function analyzeAnimationReadiness(params: {
  vision: AssetVisionAnalysis;
  construction?: CharacterConstructionProfile | null;
}): AnimationReadinessAnalysis {
  const { vision } = params;
  const text = visionText(vision);
  const bodyVisibility = params.construction?.bodyVisibility ?? detectBodyVisibilityFromVision(vision);

  const hasBackground = hasFeature(text, [
    /background/,
    /scene/,
    /environment/,
    /kitchen/,
    /outdoor/,
    /indoor/,
    /room/,
    /street/,
    /busy/,
    /clutter/,
  ]);
  const armsVisible = hasFeature(text, [/arm/, /hand/, /gesture/]) || bodyVisibility === "full_body";
  const legsVisible =
    hasFeature(text, [/leg/, /feet/, /foot/, /stance/, /walking/]) || bodyVisibility === "full_body";
  const fullBodyVisible = bodyVisibility === "full_body";
  const clearSilhouette = Boolean(
    vision.identityFingerprint.silhouette?.trim() || vision.shapeLanguage.length > 0
  );
  const usablePose = hasFeature(text, [/standing/, /neutral/, /front/, /pose/, /presenting/]) || fullBodyVisible;
  const consistentColors = vision.colors.length >= 2 || vision.brandRecognitionConfidence >= 0.5;
  const identityConfidence = Math.round(
    Math.min(100, vision.confidence * 60 + vision.brandRecognitionConfidence * 40)
  );

  let score = 100;
  const issues: AnimationReadinessIssue[] = [];
  const recommendedActions: AnimationPreparationActionId[] = [];

  if (hasBackground) {
    score -= 12;
    issues.push({
      id: "background_present",
      messageKey: "studio.assetCreation.animationPrep.issue.backgroundPresent",
      severity: "warning",
    });
    recommendedActions.push("remove_background", "transparent_png");
  }
  if (!fullBodyVisible) {
    score -= bodyVisibility === "head_only" ? 25 : bodyVisibility === "portrait" ? 18 : 12;
    issues.push({
      id: "incomplete_body",
      messageKey: "studio.assetCreation.animationPrep.issue.incompleteBody",
      severity: "warning",
    });
    recommendedActions.push("reconstruct_full_body", "standard_pose");
  }
  if (!armsVisible) {
    score -= 8;
    issues.push({
      id: "arms_hidden",
      messageKey: "studio.assetCreation.animationPrep.issue.armsHidden",
      severity: "warning",
    });
    recommendedActions.push("reconstruct_full_body");
  }
  if (!legsVisible && (vision.objectType === "human" || vision.objectType === "mascot" || vision.objectType === "character")) {
    score -= 8;
    issues.push({
      id: "legs_hidden",
      messageKey: "studio.assetCreation.animationPrep.issue.legsHidden",
      severity: "warning",
    });
    recommendedActions.push("reconstruct_full_body");
  }
  if (!clearSilhouette) {
    score -= 6;
    issues.push({
      id: "unclear_silhouette",
      messageKey: "studio.assetCreation.animationPrep.issue.unclearSilhouette",
      severity: "info",
    });
    recommendedActions.push("center_character");
  }
  if (!usablePose) {
    score -= 5;
    issues.push({
      id: "pose_not_neutral",
      messageKey: "studio.assetCreation.animationPrep.issue.poseNotNeutral",
      severity: "info",
    });
    recommendedActions.push("standard_pose");
  }
  if (!consistentColors) {
    score -= 4;
    issues.push({
      id: "weak_color_consistency",
      messageKey: "studio.assetCreation.animationPrep.issue.weakColors",
      severity: "info",
    });
  }
  if (identityConfidence < 60) {
    score -= 10;
    issues.push({
      id: "low_identity_confidence",
      messageKey: "studio.assetCreation.animationPrep.issue.lowIdentityConfidence",
      severity: "warning",
    });
    recommendedActions.push("animation_ready_reference");
  }

  const uniqueActions = [...new Set(recommendedActions)];

  return {
    score: Math.max(0, Math.min(100, score)),
    bodyVisibility,
    issues,
    recommendedActions: uniqueActions,
    checks: {
      hasBackground,
      fullBodyVisible,
      armsVisible,
      legsVisible,
      clearSilhouette,
      usablePose,
      consistentColors,
      identityConfidence,
    },
  };
}

export function defaultConstructionForAssetType(
  assetType: IdentityAssetType | "",
  vision: AssetVisionAnalysis
): Partial<CharacterConstructionProfile> {
  const bodyVisibility = detectBodyVisibilityFromVision(vision);
  const base: Partial<CharacterConstructionProfile> = {
    bodyVisibility,
    requiresConstruction: bodyVisibilityRequiresConstruction(bodyVisibility),
  };

  if (assetType === "mascot" || assetType === "character") {
    return {
      ...base,
      preserveSilhouette: true,
      preserveHeadShape: true,
      preserveProportions: true,
      standardPose: "neutral",
    };
  }
  if (assetType === "person") {
    return {
      ...base,
      bodyType: "average",
      heightProfile: "average",
      postureProfile: "upright",
      walkStyleProfile: "neutral",
      ageGroup: "adult",
    };
  }
  if (assetType === "animal") {
    return {
      ...base,
      bodyType: "natural",
      limbProportions: "natural",
      tailBehavior: "natural",
      defaultStance: "standing",
    };
  }
  if (assetType === "vehicle") {
    return {
      ...base,
      scaleProfile: "hero",
      presentationAngle: "three_quarter",
      heroView: true,
    };
  }
  return base;
}

export function buildCharacterConstructionProfile(
  draft: Pick<
    AssetWizardDraft,
    | "characterConstruction"
    | "sourceVisionAnalysis"
    | "identityAssetType"
  >
): CharacterConstructionProfile | null {
  if (!draft.sourceVisionAnalysis) {
    return null;
  }
  const defaults = defaultConstructionForAssetType(
    draft.identityAssetType,
    draft.sourceVisionAnalysis
  );
  return {
    ...defaults,
    ...draft.characterConstruction,
    bodyVisibility:
      draft.characterConstruction?.bodyVisibility ??
      defaults.bodyVisibility ??
      detectBodyVisibilityFromVision(draft.sourceVisionAnalysis),
    requiresConstruction: bodyVisibilityRequiresConstruction(
      draft.characterConstruction?.bodyVisibility ??
        defaults.bodyVisibility ??
        detectBodyVisibilityFromVision(draft.sourceVisionAnalysis)
    ),
  };
}

export function formatCharacterConstructionSummary(
  profile: CharacterConstructionProfile | null | undefined
): string {
  if (!profile) {
    return "";
  }
  const parts = [
    profile.bodyType ? `Body: ${profile.bodyType}` : "",
    profile.heightProfile ? `Height: ${profile.heightProfile}` : "",
    profile.postureProfile ? `Posture: ${profile.postureProfile}` : "",
    profile.walkStyleProfile ? `Walk: ${profile.walkStyleProfile}` : "",
    profile.standardPose ? `Pose: ${profile.standardPose}` : "",
    profile.preserveSilhouette ? "Preserve silhouette" : "",
    profile.preserveHeadShape ? "Preserve head shape" : "",
    profile.preserveProportions ? "Preserve proportions" : "",
    profile.scaleProfile ? `Scale: ${profile.scaleProfile}` : "",
    profile.presentationAngle ? `Angle: ${profile.presentationAngle}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

export function formatPostureSummary(profile: CharacterConstructionProfile | null | undefined): string {
  if (!profile) {
    return "";
  }
  return [profile.postureProfile, profile.postureCustom, profile.standardPose, profile.defaultStance]
    .filter(Boolean)
    .join(" · ");
}

export function formatBodySummary(profile: CharacterConstructionProfile | null | undefined): string {
  if (!profile) {
    return "";
  }
  return [
    profile.bodyType,
    profile.bodyTypeCustom,
    profile.heightProfile,
    profile.heightExact,
    profile.limbProportions,
    profile.bodyVisibility.replace(/_/g, " "),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function buildAnimationReadinessMotionGuidance(params: {
  score?: number;
  construction?: CharacterConstructionProfile | null;
  preparationActions?: string[];
}): string {
  const lines: string[] = [];
  if (typeof params.score === "number") {
    lines.push(`Animation readiness: ${params.score}%`);
  }
  const body = formatBodySummary(params.construction);
  const posture = formatPostureSummary(params.construction);
  if (body) {
    lines.push(`Body summary: ${body}`);
  }
  if (posture) {
    lines.push(`Posture summary: ${posture}`);
  }
  if (params.construction?.requiresConstruction) {
    lines.push("Use stored character construction profile — do not invent new body proportions.");
  }
  if (params.preparationActions?.length) {
    lines.push(`Preparation applied: ${params.preparationActions.join(", ")}`);
  }
  return lines.join(" ");
}

export function hasAnimationReadyCharacterProfile(
  record: { animationReadinessScore?: number; characterConstructionProfile?: CharacterConstructionProfile } | null | undefined
): boolean {
  return Boolean(
    record?.characterConstructionProfile &&
      typeof record.animationReadinessScore === "number" &&
      record.animationReadinessScore >= 70
  );
}

export function buildConstructionContinuityPromptBlock(
  profile: CharacterConstructionProfile | null | undefined
): string {
  if (!profile) {
    return "";
  }
  const parts = [
    formatBodySummary(profile),
    formatPostureSummary(profile),
    profile.preserveSilhouette ? "Preserve silhouette from construction profile." : "",
    profile.preserveHeadShape ? "Preserve head shape from construction profile." : "",
    profile.preserveProportions ? "Preserve proportions from construction profile." : "",
  ].filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  return `Character construction lock: ${parts.join(" ")}`;
}
