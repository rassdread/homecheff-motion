/** Studio V30 — per-scene execution payload for Motion / Vidu. */

export type StudioSceneExecutionPackage = {
  sceneId: string;
  /** Studio Prompt Builder output (primary narrative). */
  prompt: string;
  shotType: string;
  cameraMovement: string;
  sceneEnergy: string;
  worldRules: string;
  characterRules: string;
  locationRules: string;
  propRules: string;
  continuityRules: string;
  aiDirectorNotes: string;
};

/** Story-level execution summary for import UI. */
export type StudioStoryExecutionPackage = {
  worldName: string | null;
  directorProfile: string;
  promptStyleProfile: string;
  characterCount: number;
  locationName: string | null;
  propCount: number;
  sceneCount: number;
  aiDirectorNotes: string;
};

export type StudioExecutionReadinessTier =
  | "poor"
  | "needs_review"
  | "good"
  | "strong";

export type StudioExecutionReadiness = {
  score: number;
  tier: StudioExecutionReadinessTier;
  promptQuality: number;
  continuity: number;
  directorCompleteness: number;
  characterCompleteness: number;
  worldCompleteness: number;
};

export type StudioExecutionWarning = {
  code: string;
  message: string;
  severity: "low" | "medium" | "high";
  sceneId?: string;
};
