import type { AnimationPresetId } from "@/lib/animation-presets";

export type CreateAnimationProjectImageInput = {
  fileName: string;
  previewUrl: string;
  storageKey?: string;
  workingImageUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type CreateAnimationProjectRequest = {
  images: CreateAnimationProjectImageInput[];
  /** When omitted, server uses `standard`. */
  presetId?: AnimationPresetId;
  stylePreset?: string;
  aspectRatio?: string;
};

export type CreateProjectErrorCode =
  | "PRESET_INVALID"
  | "PRESET_MAX_IMAGES"
  | "PRESET_MAX_TRANSITIONS"
  | "ANIMATION_DAILY_LIMIT"
  | "ANIMATION_MONTHLY_LIMIT"
  | "ANIMATION_CREDIT_LIMIT"
  | "ANIMATION_PRESET_DAILY_LIMIT";

export type CreateAnimationProjectErrorBody = {
  error: string;
  code?: CreateProjectErrorCode;
  maxImages?: number;
  maxTransitions?: number;
  usage?: AnimationUsageResponse;
};

export type AnimationUsageResponse = {
  dayStart: string;
  monthStart: string;
  limits: {
    maxVideosPerDay: number;
    maxEstimatedCreditsPerDay: number;
    maxVideosPerMonth: number;
    maxEstimatedCreditsPerMonth: number;
    presetDailyMax: {
      basic: number;
      standard: number;
      pro: number;
    };
  };
  usage: {
    dailyVideosUsed: number;
    monthlyVideosUsed: number;
    dailyCreditsUsed: number;
    monthlyCreditsUsed: number;
    byPresetDaily: {
      basic: number;
      standard: number;
      pro: number;
    };
  };
  remaining: {
    dailyVideosRemaining: number;
    monthlyVideosRemaining: number;
    dailyCreditsRemaining: number;
    monthlyCreditsRemaining: number;
  };
};

export type CreatedAnimationTransition = {
  id: string;
  order: number;
};

export type CreateAnimationProjectResponse = {
  projectId: string;
  transitionsCount: number;
  transitions: CreatedAnimationTransition[];
};

export type PatchAnimationProjectStatusRequest = {
  projectStatus?: string;
  transition?: {
    id?: string;
    order?: number;
    status?: string;
    progress?: number;
  };
  exportStatus?: {
    status?: string;
    progress?: number;
    outputVideoUrl?: string | null;
    errorMessage?: string | null;
  };
};

export type UploadImageResponse = {
  workingImageUrl: string;
  thumbnailUrl: string;
  workingStorageKey: string;
  thumbnailStorageKey: string;
};

/** Minimal shape from GET /api/animations/projects/[id] for client sync */
export type ProjectSnapshotImage = {
  id: string;
  order: number;
  fileName: string;
  previewUrl: string | null;
};

export type ProjectSnapshotTransition = {
  id: string;
  order: number;
  startImageId: string;
  endImageId: string;
  status: string;
  progress: number;
  outputVideoUrl: string | null;
  errorMessage: string | null;
};

export type ProjectSnapshotExport = {
  status: string;
  progress: number;
  outputVideoUrl?: string | null;
  errorMessage?: string | null;
};

/** Response from POST .../export/start or .../export/poll */
export type ExportRouteResponse = {
  project?: ProjectSnapshotResponse;
  error?: string;
};

export type ProjectSnapshotResponse = {
  id: string;
  status: string;
  images: ProjectSnapshotImage[];
  transitions: ProjectSnapshotTransition[];
  exports: ProjectSnapshotExport[];
  presetId?: string | null;
  viduModel?: string | null;
  viduResolution?: string | null;
  viduDurationSeconds?: number | null;
  estimatedCredits?: number | null;
};

export type JobsStartResponse = {
  projectId: string;
  startedCount: number;
};

export type JobsPollResponse = {
  projectId: string;
  polledCount: number;
  anyFailed: boolean;
  allCompleted: boolean;
};
