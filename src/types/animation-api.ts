import type { AnimationPresetId } from "@/lib/animation-presets";

export type CreateAnimationProjectImageInput = {
  fileName: string;
  previewUrl: string;
  storageKey?: string;
  workingImageUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type CreateAnimationProjectAdvancedPayload = {
  enabled?: boolean;
  model?: string;
  resolution?: string;
  /** Seconds per transition; server validates and persists this (not total duration). */
  durationSeconds?: number;
  /** Ignored by the API if sent; UI-only convenience. Never used as source of truth. */
  targetTotalDuration?: number;
};

export type CreateAnimationProjectRequest = {
  images: CreateAnimationProjectImageInput[];
  /** When omitted, server uses `standard`. */
  presetId?: AnimationPresetId;
  /** morph | cinematic | product | dynamic — combined with preset prompt server-side. */
  intent?: string;
  /** Optional; max length enforced server-side. */
  userPrompt?: string;
  stylePreset?: string;
  aspectRatio?: string;
  /** Admin-only overrides; server validates and ignores for other roles. */
  advancedSettings?: CreateAnimationProjectAdvancedPayload;
};

export type CreateProjectErrorCode =
  | "PRESET_INVALID"
  | "PRESET_MAX_IMAGES"
  | "PRESET_MAX_TRANSITIONS"
  | "ANIMATION_DAILY_LIMIT"
  | "ANIMATION_MONTHLY_LIMIT"
  | "ANIMATION_CREDIT_LIMIT"
  | "ANIMATION_PRESET_DAILY_LIMIT"
  | "USER_INACTIVE"
  | "PRESET_NOT_ALLOWED"
  | "USER_PROMPT_TOO_LONG"
  | "USER_PROMPT_INVALID"
  | "ADVANCED_SETTINGS_NOT_ALLOWED"
  | "ADVANCED_MODEL_NOT_ALLOWED"
  | "ADVANCED_RESOLUTION_NOT_ALLOWED"
  | "ADVANCED_DURATION_NOT_ALLOWED"
  | "ADVANCED_IMAGE_LIMIT"
  | "ADVANCED_TRANSITION_LIMIT"
  | "ADVANCED_CREDIT_LIMIT";

export type CreateAnimationProjectErrorBody = {
  error: string;
  code?: CreateProjectErrorCode;
  maxImages?: number;
  maxTransitions?: number;
  maxLength?: number;
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
      smooth: number;
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
      smooth: number;
    };
  };
  remaining: {
    dailyVideosRemaining: number;
    monthlyVideosRemaining: number;
    dailyCreditsRemaining: number;
    monthlyCreditsRemaining: number;
  };
  /** Present on GET /api/animations/usage when authenticated. */
  allowedPresets?: AnimationPresetId[];
  canUseAdvancedAnimationControls?: boolean;
  advancedLimits?: {
    advancedControls: boolean;
    maxDurationSeconds: number;
    maxImages: number;
    maxTransitions: number;
    allowedResolutions: string[];
    allowedModels: string[];
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
  /** transitions × seconds per transition (server-computed). */
  estimatedTotalDurationSeconds?: number;
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
  provider?: string | null;
  providerJobId?: string | null;
  outputVideoUrl?: string | null;
  errorMessage?: string | null;
};

/** Response from POST .../export/start, .../export/poll, or .../export/retry */
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
  intent?: string | null;
  presetId?: string | null;
  viduModel?: string | null;
  viduResolution?: string | null;
  viduDurationSeconds?: number | null;
  estimatedCredits?: number | null;
  userPrompt?: string | null;
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

export type AnimationProjectListItemLatestExport = {
  status: string;
  progress: number;
  outputVideoUrl: string | null;
  errorMessage: string | null;
};

export type AnimationProjectListItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  presetId: string;
  intent: string | null;
  advancedSettingsEnabled: boolean;
  viduResolution: string | null;
  viduDurationSeconds: number | null;
  estimatedCredits: number | null;
  estimatedTotalDurationSeconds: number | null;
  imageCount: number;
  transitionCount: number;
  latestExport: AnimationProjectListItemLatestExport | null;
  thumbnailUrl: string | null;
  thumbnailFallbackUrl: string | null;
  /** First transition clip URL when fragments exist (final merge may still be pending). */
  firstTransitionVideoUrl: string | null;
  /** True when every transition has status completed and a non-empty output URL. */
  allTransitionsCompleted: boolean;
  /** Present when listing with admin `all=true`. */
  ownerEmail?: string;
};

export type AnimationProjectListResponse = {
  projects: AnimationProjectListItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

/** GET /api/animations/projects/[id] — full snapshot for gallery detail. */
export type AnimationProjectDetailResponse = ProjectSnapshotResponse & {
  createdAt: string;
  updatedAt: string;
  advancedSettingsEnabled: boolean;
  /** Only when viewer is admin (e.g. inspecting another user’s project). */
  ownerEmail?: string;
};
