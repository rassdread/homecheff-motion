/**
 * Studio V2 — Animation Planner (planning only, no render execution).
 */

import type { StudioRenderStrategy } from "@/types/studio-render-strategy";

export type AnimationMotionIntent =
  | "slow_push"
  | "tracking"
  | "handheld_energy"
  | "quick_cut"
  | "hold"
  | "reveal"
  | "action_follow";

export type AnimationShotRole =
  | "opening"
  | "setup"
  | "action"
  | "payoff"
  | "closing"
  | "scene";

export type AnimationRequiredImageRole =
  | "scene_still"
  | "start_pose"
  | "action_pose"
  | "payoff_pose"
  | "end_pose"
  | "start_frame"
  | "end_frame";

export type AnimationRenderModeHint =
  | "story"
  | "action_chain"
  | "hybrid_story"
  | "hybrid_action";

export type AnimationPlanShot = {
  shotRole: AnimationShotRole;
  actionBeat: string;
  actionBeatKey?: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  motionIntent: AnimationMotionIntent;
  motionIntentKey: string;
  cameraIntent: string;
  cameraIntentKey?: string;
  requiredImageRole: AnimationRequiredImageRole;
  missingImage: boolean;
  renderModeHint: AnimationRenderModeHint;
};

export type AnimationPlanScene = {
  sceneId: string;
  sceneOrder: number;
  sceneTitle: string;
  targetDuration: number;
  startTime: number;
  endTime: number;
  shots: AnimationPlanShot[];
};

export type AnimationSpeedAdvice = {
  providerDurationSeconds: number;
  finalDurationSeconds: number;
  suggestedSpeedAdjustment: number | null;
  speedAdviceOnly: true;
  speedLabelKey: string;
  speedSummaryKey: string;
  speedSummaryParams?: Record<string, string>;
};

export type AnimationPlanReadiness = {
  planPresent: boolean;
  timingLogical: boolean;
  imagesComplete: boolean;
  actionStructureComplete: boolean;
};

export type StudioAnimationPlan = {
  totalTargetDuration: number;
  providerDurationEstimate: number;
  finalDurationEstimate: number;
  totalShotCount: number;
  missingImageCount: number;
  speedAdvice: AnimationSpeedAdvice;
  readiness: AnimationPlanReadiness;
  recommendedStrategy: StudioRenderStrategy;
  scenes: AnimationPlanScene[];
  directorContextLines: string[];
};

export type StudioAnimationPlanInput = {
  storyboard: import("@/types/studio-api").StudioStoryboardDetail;
  productionPlan?: import("@/types/studio-production-plan").StudioProductionPlan;
  renderStrategyPlan?: import("@/types/studio-render-strategy").StudioRenderStrategyPlan;
  actionShotDistributions?: import("@/types/studio-action-shot-distribution").StoryboardActionShotDistribution;
  characters?: import("@/types/studio-api").StudioCharacterListItem[];
  locations?: import("@/types/studio-api").StudioLocationListItem[];
  props?: import("@/types/studio-api").StudioPropListItem[];
  worlds?: import("@/types/studio-api").StudioWorldProfileListItem[];
  projectMemory?: import("@/types/studio-project-memory").StudioProjectMemorySnapshot;
  styleProfile?: string;
  directorProfile?: string;
};
