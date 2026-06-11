import type { EditorFusionIntent, EditorInstructionPrintPreset } from "@/types/editor-instruction-studio";

export type EditorUpscaleModeId = "safe" | "creative" | "maximum_detail";

export const EDITOR_SUBSCRIPTION_TIERS = ["free", "plus", "premium"] as const;

export type EditorSubscriptionTier = (typeof EDITOR_SUBSCRIPTION_TIERS)[number];

export type EditorGenerationWorkflow =
  | EditorFusionIntent
  | "export_print"
  | "export_upscale"
  | "transformation_sequence";

export type GenerationCostProfile = {
  workflow: EditorGenerationWorkflow;
  generationCount: number;
  estimatedProviderCostUsd: number;
  creditCost: number;
  adEligible: boolean;
  premiumRequired: boolean;
  subscriptionRequired: boolean;
  reason?: string;
};

export type EditorUserAccessSnapshot = {
  tier: EditorSubscriptionTier;
  credits: number;
  role?: string;
  billingFree?: boolean;
};

export type GenerationAccessPath = "free" | "ad" | "credits" | "subscription" | "premium";

export type GenerationAccessDecision = {
  allowed: boolean;
  blockedReason?:
    | "premium_required"
    | "subscription_required"
    | "insufficient_credits"
    | "not_ad_eligible"
    | "upgrade_required"
    | "blocked";
  cost: GenerationCostProfile;
  accessPath?: GenerationAccessPath;
  disclosureKey: string;
  disclosureParams?: Record<string, string | number>;
};

export type EditorGenerationAccountingRecord = {
  id: string;
  workflow: EditorGenerationWorkflow;
  generationCount: number;
  successfulOutputs: number;
  failedOutputs: number;
  providerCostEstimate: number;
  creditsCharged: number;
  adWatched: boolean;
  subscriptionTier: EditorSubscriptionTier;
  accessPath: GenerationAccessPath;
  createdAt: string;
};

export const EDITOR_TRANSFORMATION_SESSION_TYPES = [
  "AGE_TIMELINE",
  "HUMAN_TO_ANIMAL",
  "ANIMAL_TO_HUMAN",
  "HUMAN_TO_MASCOT",
  "MASCOT_TO_HUMAN",
  "FANTASY_CREATURE",
  "OUTFIT_TRANSFORMATION",
  "PRODUCT_EVOLUTION",
  "STYLE_EVOLUTION",
  "BRAND_EVOLUTION",
] as const;

export type EditorTransformationSessionType = (typeof EDITOR_TRANSFORMATION_SESSION_TYPES)[number];

export const EDITOR_TRANSFORMATION_STEP_COUNTS = [1, 3, 4, 6] as const;

export type EditorTransformationStepCount = (typeof EDITOR_TRANSFORMATION_STEP_COUNTS)[number];

export type EditorTransformationStepStatus = "pending" | "running" | "completed" | "failed";

export type EditorTransformationStep = {
  id: string;
  index: number;
  strength: number;
  instruction: string;
  resultUrl?: string;
  status: EditorTransformationStepStatus;
  provider?: string;
  costEstimate?: number;
  variantId?: string;
};

export type EditorTransformationPreserveRule =
  | "face_identity"
  | "hair"
  | "expression"
  | "body_proportions"
  | "pose"
  | "clothing"
  | "brand_colors"
  | "background"
  | "lighting"
  | "composition";

export type EditorTransformationSession = {
  id: string;
  type: EditorTransformationSessionType;
  sourceImageUrl: string;
  targetReferenceUrls: string[];
  steps: EditorTransformationStep[];
  stepCount: EditorTransformationStepCount;
  strengthCurve: number[];
  preserveRules: EditorTransformationPreserveRule[];
  motionReady: boolean;
  upscaleMode: "none" | "final_only" | "all_steps";
  createdAt: string;
  updatedAt: string;
};

export type EstimateEditorGenerationCostOptions = {
  selectedAges?: number[];
  selectedVariants?: string[];
  referenceCount?: number;
  stepCount?: number;
  outputMode?: "single" | "sequence";
  upscaleMode?: EditorUpscaleModeId;
  upscaleScope?: "none" | "final_only" | "all_steps";
  printPreset?: EditorInstructionPrintPreset;
  providerModel?: string;
};

export type SequenceConsistencyScore = {
  overall: number;
  faceConsistency: number;
  poseConsistency: number;
  backgroundConsistency: number;
  lightingConsistency: number;
  styleConsistency: number;
};
