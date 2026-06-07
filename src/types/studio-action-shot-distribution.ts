/**
 * Studio V2 — Action To Shot Distribution (planning only, no DB).
 */

import type { ActionComplexityLevel } from "@/types/studio-render-strategy";
import type { CharacterCapabilityId } from "@/types/studio-character-capabilities";

export type ActionChainStepId =
  | "ball_control"
  | "juggle"
  | "shoot"
  | "celebrate"
  | "run"
  | "opening"
  | "setup"
  | "cook"
  | "stir"
  | "taste"
  | "serve"
  | "pickup"
  | "travel"
  | "handoff"
  | "plant"
  | "water"
  | "harvest"
  | "present"
  | "explain"
  | "greet"
  | "work"
  | "generic_action";

export type ActionChainStep = {
  id: ActionChainStepId;
  capabilityId: CharacterCapabilityId | null;
  sourceFragment: string;
  labelKey: string;
};

export type MissingSupportingAsset = {
  kind: "prop" | "character" | "location";
  reasonKey: string;
  reasonParams?: Record<string, string>;
};

export type SceneActionChain = {
  sceneId: string;
  sceneOrder: number;
  actionText: string;
  steps: ActionChainStep[];
  complexity: ActionComplexityLevel;
  recommendedShotCount: number;
  actionLabelKeys: string[];
  missingSupportingAssets: MissingSupportingAsset[];
};

export type ActionDistributionBeatRole =
  | "opening"
  | "setup"
  | "action"
  | "payoff"
  | "closing";

export type ActionDistributionImageRole =
  | "scene_still"
  | "start_pose"
  | "action_pose"
  | "payoff_pose"
  | "end_pose";

export type ActionDistributionImageStatus = "present" | "missing" | "recommended";

export type ActionDistributionBeat = {
  role: ActionDistributionBeatRole;
  order: number;
  stepId: ActionChainStepId;
  labelKey: string;
  actionHint: string;
  imageRole: ActionDistributionImageRole;
  imageStatus: ActionDistributionImageStatus;
};

export type DurationAdviceLevel = "too_short" | "good" | "too_long";

export type SceneDurationAdvice = {
  level: DurationAdviceLevel;
  currentSeconds: number;
  recommendedMinSeconds: number;
  recommendedMaxSeconds: number;
  stepCount: number;
  adviceKey: string;
  adviceParams?: Record<string, string>;
};

export type SceneActionShotDistribution = {
  sceneId: string;
  sceneOrder: number;
  sceneTitle: string;
  actionChain: SceneActionChain;
  beats: ActionDistributionBeat[];
  recommendedShotCount: number;
  durationAdvice: SceneDurationAdvice;
  suggestsMultipleShots: boolean;
  distributionReasonKey?: string;
};

export type StoryboardActionShotDistribution = {
  scenes: SceneActionShotDistribution[];
  totalRecommendedMinSeconds: number;
  totalRecommendedMaxSeconds: number;
  scenesNeedingSplit: number;
};
