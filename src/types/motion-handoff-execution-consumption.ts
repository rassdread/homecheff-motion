/**
 * Motion — Studio execution plan consumption (wizard + project create).
 */

import type { InstantMode } from "@/lib/instant-premium-mode-types";

export type MotionExecutionImageRole = "scene" | "start" | "end";

export type MotionExecutionImageSlotPlan = {
  slotId: string;
  sceneId: string;
  sceneOrder: number;
  sceneTitle: string;
  beatLabel?: string;
  imageRole: MotionExecutionImageRole;
  imageUrl: string | null;
  missing: boolean;
};

export type MotionExecutionTransitionUnitPlan = {
  unitIndex: number;
  jobId: string | null;
  beatLabels: string[];
  durationSeconds: number;
  startSlotId: string;
  endSlotId: string;
  missingImages: boolean;
};

export type MotionExecutionReadinessStatus = "ok" | "warn" | "missing";

export type MotionExecutionReadinessItem = {
  id: string;
  labelKey: string;
  status: MotionExecutionReadinessStatus;
};

export type MotionDirectorMetadataConsumption = {
  hasMusicPlan: boolean;
  hasVoicePlan: boolean;
  hasSubtitleTrack: boolean;
  hasCharacterMemory: boolean;
  hasContinuityReport: boolean;
  cameraInstructionCount: number;
  emotionInstructionCount: number;
  transitionInstructionCount: number;
  directorNotesPresent: boolean;
};

export type MotionExecutionConsumption = {
  metadataAvailable: boolean;
  instantMode: InstantMode;
  executionMode: "story_video" | "action_chain" | "hybrid" | null;
  imageSlots: MotionExecutionImageSlotPlan[];
  transitionUnits: MotionExecutionTransitionUnitPlan[];
  expectedTransitionRowCount: number;
  plannedJobCount: number;
  jobCountMismatch: boolean;
  jobCountMismatchWarningKey: string | null;
  storySegmentCount: number;
  actionSegmentCount: number;
  totalDurationSeconds: number;
  transitionSeconds: number;
  readinessItems: MotionExecutionReadinessItem[];
  fallbackActive: boolean;
  readyToRender: boolean;
  directorMetadata: MotionDirectorMetadataConsumption;
};

export type MotionExecutionConsumptionSummary = {
  executionMode: MotionExecutionConsumption["executionMode"];
  instantMode: InstantMode;
  imageSlotCount: number;
  presentImageCount: number;
  missingImageCount: number;
  transitionUnitCount: number;
  expectedTransitionRowCount: number;
  plannedJobCount: number;
  jobCountMismatch: boolean;
  storySegmentCount: number;
  actionSegmentCount: number;
  totalDurationSeconds: number;
  readyToRender: boolean;
  fallbackActive: boolean;
  consumedAt: string;
};

export type MotionExecutionRefreshDiffItem = {
  id: string;
  kind: "new_shot" | "new_image" | "duration" | "mode" | "job_count";
  labelKey: string;
  labelParams?: Record<string, string>;
  before?: string;
  after?: string;
};

export type MotionExecutionRefreshDiff = {
  hasChanges: boolean;
  items: MotionExecutionRefreshDiffItem[];
};
