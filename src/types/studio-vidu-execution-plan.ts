/**
 * Studio V2 — Vidu Execution Planner (planning only, no render start).
 */

export type ViduExecutionMode = "story_video" | "action_chain" | "hybrid";

export type ViduExecutionJobKind =
  | "story_multiframe"
  | "action_start_end"
  | "hybrid_story_segment"
  | "hybrid_action_segment";

export type ViduExecutionImageRole =
  | "scene_still"
  | "start_frame"
  | "end_frame"
  | "start_pose"
  | "end_pose";

export type ViduExecutionInputImage = {
  sceneId: string;
  sceneOrder: number;
  sceneTitle: string;
  imageUrl: string | null;
  imageRole: ViduExecutionImageRole;
  missing: boolean;
  shotRole?: string;
  beatLabel?: string;
};

export type ViduExecutionOutputRole =
  | "full_story"
  | "segment"
  | "transition"
  | "action_beat";

export type ViduExecutionJob = {
  id: string;
  jobKind: ViduExecutionJobKind;
  sceneIds: string[];
  beatLabels: string[];
  inputImages: ViduExecutionInputImage[];
  durationSeconds: number;
  promptIntent: string;
  promptIntentKey?: string;
  outputRole: ViduExecutionOutputRole;
  continuityHintKey?: string;
};

export type ViduExecutionMissingRequirement = {
  id: string;
  kind: "image" | "duration" | "audio" | "scene";
  reasonKey: string;
  reasonParams?: Record<string, string>;
  sceneOrder?: number;
  suggestedActionKey?: string;
};

export type ViduExecutionWarning = {
  id: string;
  messageKey: string;
  messageParams?: Record<string, string>;
};

export type ViduExecutionFallbackMode =
  | "story_video"
  | "generate_images_first"
  | "preview_only";

export type ViduExecutionFallbackPlan = {
  active: boolean;
  fallbackMode: ViduExecutionFallbackMode | null;
  reasonKey: string;
  reasonParams?: Record<string, string>;
};

export type ViduExecutionReadiness = {
  planPresent: boolean;
  readyToRender: boolean;
  missingStartEndImages: boolean;
  unsupportedHybridPieces: boolean;
  fallbackActive: boolean;
};

export type ViduExecutionPlan = {
  executionMode: ViduExecutionMode;
  executionModeLabelKey: string;
  approachSummaryKey: string;
  usesMultipleSteps: boolean;
  jobs: ViduExecutionJob[];
  missingRequirements: ViduExecutionMissingRequirement[];
  warnings: ViduExecutionWarning[];
  fallbackPlan: ViduExecutionFallbackPlan;
  readiness: ViduExecutionReadiness;
  audioMixIncluded: boolean;
  audioMixReady: boolean;
  totalJobCount: number;
  estimatedDurationSeconds: number;
  directorContextLines: string[];
};

export type ViduExecutionPlanInput = {
  storyboard: import("@/types/studio-api").StudioStoryboardDetail;
  renderStrategyPlan?: import("@/types/studio-render-strategy").StudioRenderStrategyPlan;
  animationPlan?: import("@/types/studio-animation-plan").StudioAnimationPlan;
  audioMixPlan?: import("@/lib/studio-audio-mix-timeline").StudioAudioMixHandoffPlan | null;
  characters?: import("@/types/studio-api").StudioCharacterListItem[];
  locations?: import("@/types/studio-api").StudioLocationListItem[];
  props?: import("@/types/studio-api").StudioPropListItem[];
  worlds?: import("@/types/studio-api").StudioWorldProfileListItem[];
  projectMemory?: import("@/types/studio-project-memory").StudioProjectMemorySnapshot;
  styleProfile?: string;
  directorProfile?: string;
};
