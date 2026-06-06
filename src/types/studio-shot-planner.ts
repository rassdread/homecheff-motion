/**
 * Studio V2 — shared shot planner model (planning only, no DB migration).
 */

import type { StoryArcPhase } from "@/lib/studio-story-arc";
import type {
  StudioCameraMovement,
  StudioSceneEnergy,
  StudioShotType,
} from "@/lib/studio-scene-director";

export type ShotBeatRole = "opening" | "focus" | "detail" | "closing";

export type ShotBeat = {
  role: ShotBeatRole;
  present: boolean;
  shotType: StudioShotType;
  cameraMovement: StudioCameraMovement;
  /** Human-readable beat description (scene content or i18n-backed fallback). */
  label: string;
  labelKey?: string;
};

export type SceneShotPlan = {
  sceneId: string;
  order: number;
  title: string;
  arcPhase: StoryArcPhase;
  shotType: StudioShotType;
  cameraMovement: StudioCameraMovement;
  sceneEnergy: StudioSceneEnergy;
  durationSeconds: number;
  beats: ShotBeat[];
};

export type StoryboardShotPlan = {
  scenes: SceneShotPlan[];
  cameraFlow: Array<{
    sceneId: string;
    order: number;
    shotType: StudioShotType;
    cameraMovement: StudioCameraMovement;
    sceneEnergy: StudioSceneEnergy;
  }>;
  motionProgression: Array<{
    sceneId: string;
    order: number;
    movement: StudioCameraMovement;
    energy: StudioSceneEnergy;
  }>;
  pacingSeconds: number[];
  shotDiversityScore: number;
};

export type ShotPlanConsistencyAdviceCode =
  | "repeated_shot_streak"
  | "too_many_close_ups"
  | "too_many_wide_shots"
  | "low_shot_variety"
  | "missing_shot_flow";

export type ShotPlanConsistencyAdvice = {
  code: ShotPlanConsistencyAdviceCode;
  messageKey: string;
  sceneIds: string[];
};

export type ShotPlanContinuityInsight = {
  recurringShotType?: StudioShotType;
  recurringCameraMovement?: StudioCameraMovement;
  shotTypeStoryboardCount: number;
  movementStoryboardCount: number;
  messageKey: string;
};

export type ShotPlanReadiness = {
  hasShotFlow: boolean;
  hasPacing: boolean;
  motionLogical: boolean;
  recommendationKeys: string[];
};
