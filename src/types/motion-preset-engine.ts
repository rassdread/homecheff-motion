import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";

export type MotionVisualRequirementId =
  | "face_visible"
  | "full_body_visible"
  | "upper_body_visible"
  | "legs_visible"
  | "shoes_visible"
  | "standing_pose"
  | "product_reference"
  | "mascot_reference"
  | "logo_reference";

export type MotionConfidenceLevel = "low" | "medium" | "high";

export type MotionPresetVisualRequirements = {
  presetId: MotionActionPresetId;
  required: MotionVisualRequirementId[];
  preferred: MotionVisualRequirementId[];
  analysisRequirements: Array<
    "style_dna" | "identity_fingerprint" | "motion_readiness" | "brand_detection" | "mascot_detection" | "text_risk"
  >;
  identityRequirements: Array<
    "face" | "hair" | "body" | "clothing" | "mascot_traits" | "brand_colors" | "logo"
  >;
};

export type MotionPresetIntelligenceProfile = {
  presetId: MotionActionPresetId;
  environment: string;
  motion: string;
  expression: string;
  camera: string;
  sceneProgression?: string;
  ending?: string;
  expectedOutcome?: string;
  structuredPromptBlock: string;
};

export type MotionUploadedReference = {
  id: string;
  fileName?: string;
  role?: "primary_identity" | "secondary_identity" | "outfit" | "style" | "brand" | "environment" | "product";
  assetType?: string | null;
  assetName?: string | null;
  motionReady?: boolean | null;
  width?: number;
  height?: number;
  styleDna?: AssetStyleDna | null;
  visionAnalysis?: AssetVisionAnalysis | null;
};

export type MotionRequirementEvaluation = {
  presetId: MotionActionPresetId;
  requirementScore: number;
  missingRequirements: MotionVisualRequirementId[];
  missingPreferred: MotionVisualRequirementId[];
  confidenceLevel: MotionConfidenceLevel;
  canProceed: boolean;
  canRender: boolean;
  guidanceKeys: string[];
};

export type MotionComplexityEstimate = {
  presetId: MotionActionPresetId | null;
  referenceCount: number;
  cachedAnalysisCount: number;
  uncachedAnalysisCount: number;
  estimatedAnalysisCredits: number;
  estimatedRenderCredits: number;
  estimatedTotalCredits: number;
  analysisCached: boolean;
  complexityTier: "low" | "medium" | "high";
  /** Vision-derived workload breakdown */
  faceCount?: number;
  mascotCount?: number;
  logoCount?: number;
  productCount?: number;
  sceneCount?: number;
  requiredAnalysisPasses?: number;
  cacheReusePercent?: number;
};

export type MotionQualityScore = {
  overall: number;
  identityConfidence: number;
  referenceQuality: number;
  bodyVisibility: number;
  faceVisibility: number;
  mascotConsistency: number;
  logoQuality: number;
  productQuality: number;
  styleDnaStrength: number;
  renderSuitability: number;
};

export type MotionIdentityProfileSource =
  | "motion_identity_profile"
  | "motion_ready"
  | "character_studio"
  | "asset_style_dna"
  | "reference_analysis"
  | "character_record"
  | "mascot_record"
  | "brand_record"
  | "heuristic";

export type MotionIdentityProfile = {
  version: 1;
  presetId: MotionActionPresetId | null;
  primaryReferenceId: string | null;
  sources: MotionIdentityProfileSource[];
  face: string[];
  hair: string[];
  beard: string[];
  bodyProportions: string[];
  skinTone: string[];
  clothing: string[];
  accessories: string[];
  jewelry: string[];
  glasses: string[];
  mascotTraits: string[];
  logoTraits: string[];
  brandColors: string[];
  styleDnaSummary: string[];
  environmentHints: string[];
  motionSuitability: string[];
  identityPromptBlock: string;
  intelligencePromptBlock: string;
  analysisCached: boolean;
};

export type MotionMultiReferenceIntelligence = {
  referenceCount: number;
  primaryIdentityReferenceId: string | null;
  secondaryIdentityReferenceId: string | null;
  outfitReferenceId: string | null;
  brandReferenceId: string | null;
  environmentReferenceId: string | null;
  productReferenceId: string | null;
  identityConfidence: number;
  referenceConflictScore: number;
  analysisComplexity: "low" | "medium" | "high";
  conflicts: string[];
};

export type MotionQualityValidation = {
  passed: boolean;
  qualityScore: MotionQualityScore;
  identityConfidence: number;
  referenceQuality: number;
  presetSuitability: number;
  environmentConfidence: number;
  brandConfidence: number;
  mascotConfidence: number;
  warnings: string[];
  blockRender: boolean;
};

export type MotionPresetStoryboardSnapshot = {
  presetId: MotionActionPresetId;
  sceneCount: number;
  structuredPromptBlock: string;
};

export type MotionVisionPipelineSnapshot = {
  signalsReady: boolean;
  strongestSource: string;
  averageIdentityConfidence: number;
  workloadFaceCount: number;
  workloadMascotCount: number;
  workloadProductCount: number;
};

export type MotionPresetEngineSnapshot = {
  version: 1;
  evaluatedAt: string;
  requirementEvaluation: MotionRequirementEvaluation;
  complexityEstimate: MotionComplexityEstimate;
  identityProfile: MotionIdentityProfile;
  multiReference: MotionMultiReferenceIntelligence;
  qualityValidation: MotionQualityValidation;
  intelligenceProfile: MotionPresetIntelligenceProfile | null;
  storyboard?: MotionPresetStoryboardSnapshot | null;
  visionPipeline?: MotionVisionPipelineSnapshot | null;
  /** True when billed premium analysis finished (or was cached). */
  premiumAnalysisComplete?: boolean;
};
