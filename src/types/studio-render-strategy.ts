/**
 * Studio V2 — Render Strategy Planner (user-facing strategy names, no provider jargon).
 */

export type StudioRenderStrategy = "story" | "action_chain" | "hybrid";

export type RenderStrategyConfidence = "high" | "medium" | "low";

export type ActionComplexityLevel = "low" | "medium" | "high";

export type RenderStrategyReason = {
  id: string;
  reasonKey: string;
  reasonParams?: Record<string, string>;
};

export type RenderStrategyShotSplitSuggestion = {
  sceneId: string;
  sceneOrder: number;
  sceneTitle: string;
  originalAction: string;
  suggestedShotCount: number;
  suggestedShots: Array<{
    order: number;
    labelKey: string;
    actionHint: string;
  }>;
  reasonKey: string;
  previewOnly: true;
};

export type RenderStrategyImageRequirementRole =
  | "scene_still"
  | "start_frame"
  | "end_frame";

export type RenderStrategyImageRequirementStatus = "present" | "missing" | "recommended";

export type RenderStrategyImageRequirement = {
  sceneId: string;
  sceneOrder: number;
  sceneTitle: string;
  role: RenderStrategyImageRequirementRole;
  status: RenderStrategyImageRequirementStatus;
  labelKey: string;
};

export type RenderStrategySceneAssignment = {
  sceneId: string;
  order: number;
  title: string;
  strategy: StudioRenderStrategy;
  actionComplexity: ActionComplexityLevel;
};

/** Maps to Instant Premium instantMode for handoff metadata (internal). */
export type RenderStrategyInternalInstantMode = "story" | "transition";

export type StudioRenderStrategyPlan = {
  recommendedStrategy: StudioRenderStrategy;
  confidence: RenderStrategyConfidence;
  confidenceScore: number;
  reasons: RenderStrategyReason[];
  warnings: RenderStrategyReason[];
  actionComplexity: ActionComplexityLevel;
  actionComplexityScore: number;
  estimatedProviderDurationSeconds: number;
  estimatedFinalDurationSeconds: number;
  suggestedSpeedAdjustment: number | null;
  speedAdviceOnly: boolean;
  suggestedShotSplitting: RenderStrategyShotSplitSuggestion[];
  imageRequirements: RenderStrategyImageRequirement[];
  requiredImageCount: number;
  presentImageCount: number;
  missingImageCount: number;
  sceneAssignments: RenderStrategySceneAssignment[];
  /** Handoff metadata — Motion may ignore until P1. */
  internalInstantMode: RenderStrategyInternalInstantMode;
  strategyLabelKey: string;
  strategyExplanationKey: string;
  /** Per-scene action → shot beat distribution (planning only). */
  actionShotDistributions?: import("@/types/studio-action-shot-distribution").SceneActionShotDistribution[];
};

export type StudioRenderStrategyPlanInput = {
  storyboard: import("@/types/studio-api").StudioStoryboardDetail;
  characters?: import("@/types/studio-api").StudioCharacterListItem[];
  locations?: import("@/types/studio-api").StudioLocationListItem[];
  props?: import("@/types/studio-api").StudioPropListItem[];
  worlds?: import("@/types/studio-api").StudioWorldProfileListItem[];
  desiredFinalDurationSeconds?: number;
};
