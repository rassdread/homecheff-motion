/**
 * Motion — Studio handoff execution prefill (read-only planning metadata).
 */

import type { InstantMode, InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";

export type MotionHandoffPrefillWarning = {
  id: string;
  messageKey: string;
  messageParams?: Record<string, string>;
};

export type MotionHandoffPrefillMissingImage = {
  id: string;
  sceneOrder?: number;
  sceneTitle: string;
  roleLabelKey: string;
};

export type MotionHandoffSceneDurationPrefill = {
  sceneId: string;
  sceneOrder: number;
  durationSeconds: number;
};

export type MotionHandoffExecutionPrefill = {
  /** True when viduExecutionPlan or renderStrategyPlan metadata is present. */
  metadataAvailable: boolean;
  instantMode: InstantMode;
  instantModeSource: "execution_plan" | "render_strategy" | "default";
  executionMode: "story_video" | "action_chain" | "hybrid" | null;
  executionModeLabelKey: string;
  approachSummaryKey: string;
  warnings: MotionHandoffPrefillWarning[];
  missingImages: MotionHandoffPrefillMissingImage[];
  sceneDurations: MotionHandoffSceneDurationPrefill[];
  totalDurationSeconds: number;
  transitionSeconds: InstantTransitionSeconds;
  readyToRender: boolean;
  fallbackActive: boolean;
  fallbackLabelKey: string | null;
  usesMultipleSteps: boolean;
  audioMixReady: boolean;
  sceneImagePresentCount: number;
  sceneImageMissingCount: number;
};

export type MotionHandoffExecutionPrefillSummary = {
  executionModeLabelKey: string;
  instantMode: InstantMode;
  readyToRender: boolean;
  fallbackActive: boolean;
  fallbackLabelKey: string | null;
  warningCount: number;
  missingImageCount: number;
  totalDurationSeconds: number;
  usesMultipleSteps: boolean;
  confirmedAt: string;
};
