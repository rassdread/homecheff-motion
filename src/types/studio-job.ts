export const STUDIO_JOB_TYPES = [
  "generate_scene_images",
  "analyze_consistency",
  "analyze_vision",
  "improve_weak_scenes",
] as const;

export type StudioJobType = (typeof STUDIO_JOB_TYPES)[number];

export const STUDIO_JOB_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export type StudioJobStatus = (typeof STUDIO_JOB_STATUSES)[number];

export type StudioJobCreateInput = {
  sceneIds?: string[];
  imageIds?: string[];
  options?: {
    autoSelect?: boolean;
  };
};

export type StudioJobSceneStepResult = {
  sceneId: string;
  sceneTitle: string;
  order: number;
  ok: boolean;
  error?: string;
  imageId?: string;
  consistencyScoreBefore?: number | null;
  consistencyScoreAfter?: number | null;
  visionScoreBefore?: number | null;
  visionScoreAfter?: number | null;
  overallImprovementScore?: number | null;
  autoSelected?: boolean;
};

export type StudioJobAuditTrail = {
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  provider?: string;
  sceneIdsProcessed: string[];
  imageIdsCreated: string[];
  sceneResults: StudioJobSceneStepResult[];
  errors: Array<{ sceneId: string; sceneTitle?: string; message: string }>;
  completedSceneCount: number;
  failedSceneCount: number;
  skippedSceneCount: number;
};

export type StudioJobResult = StudioJobAuditTrail & {
  /** Present for analyze_consistency */
  overallConsistencyScore?: number;
  driftWarnings?: string[];
  /** Present for analyze_vision */
  overallVisionScore?: number;
  visionWarnings?: string[];
};

export type StudioJobListItem = {
  id: string;
  storyboardId: string;
  type: StudioJobType;
  status: StudioJobStatus;
  progress: number;
  currentStep: string;
  totalSteps: number;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
};

export type StudioJobDetail = StudioJobListItem & {
  input: StudioJobCreateInput;
  result: StudioJobResult | null;
};

export type StudioJobCreateResponse = {
  job: StudioJobListItem;
};

export type StudioJobListResponse = {
  jobs: StudioJobListItem[];
};

export type StudioJobDetailResponse = {
  job: StudioJobDetail;
};

export type StudioJobCancelResponse = {
  job: StudioJobListItem;
};
