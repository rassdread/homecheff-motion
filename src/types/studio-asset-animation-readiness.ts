/** Animation-ready character preparation — persisted in Asset Semantic Record. */

export type BodyVisibilityLevel =
  | "full_body"
  | "half_body"
  | "portrait"
  | "head_only"
  | "partial"
  | "unknown"
  | "mascot";

export type CharacterConstructionProfile = {
  bodyVisibility: BodyVisibilityLevel;
  requiresConstruction: boolean;
  bodyType?: string;
  bodyTypeCustom?: string;
  heightProfile?: string;
  heightExact?: string;
  postureProfile?: string;
  postureCustom?: string;
  walkStyleProfile?: string;
  walkStyleCustom?: string;
  ageGroup?: string;
  preserveSilhouette?: boolean;
  preserveHeadShape?: boolean;
  preserveProportions?: boolean;
  standardPose?: string;
  limbProportions?: string;
  tailBehavior?: string;
  defaultStance?: string;
  scaleProfile?: string;
  presentationAngle?: string;
  heroView?: boolean;
};

export type AnimationReadinessIssue = {
  id: string;
  messageKey: string;
  severity: "info" | "warning";
};

export type AnimationPreparationActionId =
  | "remove_background"
  | "transparent_png"
  | "center_character"
  | "expand_canvas"
  | "reconstruct_full_body"
  | "standard_pose"
  | "expression_base"
  | "animation_ready_reference";

export type AnimationReadinessAnalysis = {
  score: number;
  bodyVisibility: BodyVisibilityLevel;
  issues: AnimationReadinessIssue[];
  recommendedActions: AnimationPreparationActionId[];
  checks: {
    hasBackground: boolean;
    fullBodyVisible: boolean;
    armsVisible: boolean;
    legsVisible: boolean;
    clearSilhouette: boolean;
    usablePose: boolean;
    consistentColors: boolean;
    identityConfidence: number;
  };
};
