import type { AnimationPresetId } from "@/lib/animation-presets";
import type { BakedTextProtectionPayload } from "@/lib/baked-text-detection";
import type {
  ProjectStudioExportMetadata,
  ProjectStudioQaResponse,
} from "@/types/studio-project-persistence";

export type CreateAnimationProjectImageInput = {
  fileName: string;
  previewUrl: string;
  storageKey?: string;
  workingImageUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  /** When enabled, server masks baked-in text before Vidu and adds locked overlay layers. */
  bakedTextProtection?: BakedTextProtectionPayload;
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
  /** User-facing project name (Motion gallery bundle title). */
  title?: string | null;
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

export type ImageUploadErrorCode =
  | "IMAGE_UPLOAD_FAILED"
  | "BLOB_UPLOAD_FAILED"
  | "IMAGE_PROCESSING_FAILED"
  | "DB_WRITE_FAILED";

export type ImageUploadErrorBody = {
  ok: false;
  code: ImageUploadErrorCode;
  message: string;
  requestId: string;
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
  /** classic | instant_premium */
  projectType?: string | null;
  stylePreset?: string | null;
  instantOutputDurationSeconds?: number | null;
  instantSelectedChips?: unknown;
  instantUserIntent?: string | null;
  /** Unified export lifecycle for progress UIs */
  exportLifecycleStatus?: "queued" | "running" | "finalizing" | "completed" | "failed";
  exportPhase?:
    | "generating_clips"
    | "merging_clips"
    | "uploading_final"
    | "completed"
    | "failed";
  exportProgressPercent?: number;
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

export type DraftLineageResponse = {
  sourceProjectId: string;
  sourceProjectTitle: string;
  sourceLanguage: string;
  sourceLanguageLabel: string;
  sourceVersion: number;
  sourceVersionDisplay: string;
  nextVersionNumber: number;
  nextVersionDisplay: string;
  bundleDisplayName: string | null;
  copiedAt: string | null;
};

export type ProjectBundleListItemResponse = {
  bundleKey: string;
  displayTitle: string;
  bundleName: string | null;
  normalizedTitle: string;
  projectType: string;
  memberProjectIds: string[];
  languagesLabel: string;
  latestVersionLabel: string | null;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  status: string;
  sourceProjectId: string | null;
  /** Active member for card actions (newest by default). */
  activeProjectId: string;
  catalog: {
    languages: Array<{ code: string; label: string }>;
    slotsByLanguage: Record<
      string,
      Array<{
        selectionKey: string;
        projectId: string;
        languageCode: string;
        languageLabel: string;
        versionNumber: number;
        versionNote: string | null;
        displayLabel: string;
        status: string;
        finalVideoUrl: string | null;
        cleanVideoUrl: string | null;
        kind: string;
      }>
    >;
    defaultLanguageCode: string;
    defaultSelectionKey: string | null;
  };
};

export type AnimationProjectListItem = {
  id: string;
  title?: string | null;
  displayTitle?: string;
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
  /** classic | instant_premium */
  projectType?: string | null;
  /** Archived final URL during full rerender (export URL cleared). */
  previousFinalVideoUrl?: string | null;
  /** Present when listing section=concepts. */
  fullRerenderDraft?: {
    updatedAt: string;
    sceneCount: number;
    versionNote: string | null;
  };
  /** Draft copy lineage when status=draft and copied from a completed project. */
  sourceProjectId?: string | null;
  draftLineage?: DraftLineageResponse | null;
};

export type AnimationProjectListResponse = {
  projects: AnimationProjectListItem[];
  /** Present when gallerySection=completed — grouped by normalized project name. */
  bundles?: ProjectBundleListItemResponse[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  gallerySection?: "completed" | "concepts";
};

export type UpdateProjectBundleSettingsRequest = {
  title?: string;
  bundleName?: string;
  bundleKey?: string | null;
};

export type UpdateProjectBundleSettingsResponse = {
  ok: true;
  id: string;
  title: string | null;
  bundleName: string | null;
  bundleKey: string | null;
  displayTitle: string;
  bundlePreview: {
    willJoinExisting: boolean;
    bundleDisplayTitle: string;
    existingVersionCount: number;
  };
};

/** @deprecated Use UpdateProjectBundleSettingsRequest */
export type RenameAnimationProjectRequest = UpdateProjectBundleSettingsRequest & {
  title: string;
};

/** @deprecated Use UpdateProjectBundleSettingsResponse */
export type RenameAnimationProjectResponse = UpdateProjectBundleSettingsResponse;

/** GET /api/animations/projects/[id] — full snapshot for gallery detail. */
export type VideoLanguageExportSummary = {
  id: string;
  languageCode: string;
  languageLabel: string;
  status: string;
  outputVideoUrl: string | null;
  sourceFinalVideoUrl: string;
  sourceCleanVideoUrl?: string | null;
  overlayRenderMode?: string;
  sceneTextsJson?: unknown;
  textLayerJson: unknown;
  translationProvider: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  version: number;
  isDefault: boolean;
  versionNote?: string | null;
};

export type ProjectPlaybackDebugSummary = {
  finalVideoUrl: string | null;
  selectedPlaybackUrl: string | null;
  selectedPlaybackSource: string;
  exportOutputVideoUrl: string | null;
  exportOutputVideoUrlRaw: string | null;
  latestExport: {
    id: string;
    status: string;
    progress: number;
    outputVideoUrl: string | null;
    updatedAt: string;
    createdAt: string;
  } | null;
  rebuildCount: number;
  rebuiltAt: string | null;
  previousFinalVideoUrl: string | null;
  previousFinalVideoUrlRaw: string | null;
  cacheBust: string;
  latestRebuildStatus?: string | null;
  exportTimeoutMs?: number;
  activeExportStage?: string | null;
  activeExportStageElapsedMs?: number | null;
  activeFfmpegCommand?: string | null;
  activeSegment?: number | null;
  latestExportError?: string | null;
  rebuildId?: string | null;
  rebuildWorkspace?: string | null;
  segmentHashes?: string[];
  finalHash?: string | null;
  previousFinalHash?: string | null;
  identicalOutputDetected?: boolean;
  rebuildCandidateVideoUrl?: string | null;
  validationOk?: boolean | null;
  rebuildCompareLinks?: {
    previousFinalVideoUrl: string | null;
    currentFinalVideoUrl: string | null;
    rebuildCandidateVideoUrl: string | null;
    segments: Array<{
      segmentIndex: number;
      label: string;
      providerVideoUrl: string | null;
      downloadedHash: string | null;
      concatHash: string | null;
    }>;
  };
};

export type ProjectRenderVersionSummary = {
  id: string;
  renderVersionNumber: number;
  kind: "initial" | "full_rerender";
  status: string;
  isDefault: boolean;
  versionNote: string | null;
  finalVideoUrl: string | null;
  cleanVideoUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  createdFromRenderId: string | null;
};

export type FullRerenderResponse = {
  fullRerender: {
    ok: boolean;
    code?: string;
    projectId: string;
    status?: "started";
    progressRoute?: string;
    startedSegmentCount?: number;
    message?: string;
  };
  status?: InstantPremiumStatusResponse;
};

export type AnimationProjectDetailResponse = ProjectSnapshotResponse & {
  createdAt: string;
  updatedAt: string;
  title?: string | null;
  bundleName?: string | null;
  bundleKey?: string | null;
  sourceProjectId?: string | null;
  sourceLanguage?: string | null;
  sourceVersion?: number | null;
  draftCopiedAt?: string | null;
  draftLineage?: DraftLineageResponse | null;
  advancedSettingsEnabled: boolean;
  instantCleanFinalVideoUrl?: string | null;
  instantSceneTexts?: unknown;
  instantMode?: string;
  instantTransitionSeconds?: number;
  instantFinalRebuildCount?: number;
  instantFinalRebuiltAt?: string | null;
  instantPreviousFinalVideoUrl?: string | null;
  instantFinalRebuildAuditJson?: unknown;
  instantTextVersionNotesJson?: unknown;
  latestExportId?: string | null;
  latestExportUpdatedAt?: string | null;
  /** Only when viewer is admin (e.g. inspecting another user’s project). */
  ownerEmail?: string;
  languageExports?: VideoLanguageExportSummary[];
  renderVersions?: ProjectRenderVersionSummary[];
  playback?: ProjectPlaybackDebugSummary;
  /** Studio V19: server-persisted QA (read-only). */
  studioQa?: ProjectStudioQaResponse | null;
  studioSource?: ProjectStudioExportMetadata["studioSource"];
  studioIntelligence?: ProjectStudioExportMetadata["studioIntelligence"];
  studioReadiness?: ProjectStudioExportMetadata["studioReadiness"];
  studioIntelligenceStatus?: ProjectStudioExportMetadata["studioIntelligenceStatus"];
};

export type InstantPremiumSegmentStatus = "queued" | "generating" | "completed" | "failed";

export type InstantPremiumRetryState = "retrying_segment" | "retrying_merge";

/** POST /api/instant-premium/create-and-generate — test mode (INSTANT_PREMIUM_MODE=test). */
export type InstantPremiumCreateAndGenerateOkBody = {
  ok: true;
  projectId: string;
  status: "started";
  progressRoute: string;
  jobTriggered: boolean;
  warnings?: string[];
};

export type InstantPremiumCreateAndGenerateErrorBody = {
  ok: false;
  error: string;
  code?: string;
};

export type InstantPremiumStatusAvailability =
  | "ok"
  | "not_found"
  | "temporary_unavailable"
  | "worker_unreachable"
  | "still_processing";

export type InstantPremiumStatusApiResponse =
  | (InstantPremiumStatusResponse & { availability: "ok" })
  | {
      availability: "not_found" | "temporary_unavailable" | "worker_unreachable";
      projectId: string;
      error?: string;
      workerJobStatus?: string | null;
    };

export type InstantPremiumProgressStage =
  | "segment_rendering"
  | "foreground_segmentation"
  | "merge_clips"
  | "poster_compositing"
  | "export_video"
  | "upload_storage"
  | "finalize"
  | "completed"
  | "failed";

export type InstantPremiumActiveOperation =
  | "segment_rendering"
  | "repair"
  | "rebuild"
  | "merge_export"
  | "upload"
  | "idle";

export type InstantPremiumFailureReason =
  | "overlay_failed"
  | "merge_failed"
  | "export_upload_auth_failed";

export type InstantPremiumStatusResponse = {
  projectId: string;
  projectType: "instant_premium";
  status: "queued" | "running" | "finalizing" | "completed" | "failed";
  phase: "generating_clips" | "merging_clips" | "uploading_final" | "completed" | "failed";
  progressPercent: number;
  currentStage?: InstantPremiumProgressStage;
  activeOperation?: InstantPremiumActiveOperation;
  exportProvider?: string | null;
  rebuildCount?: number;
  segmentCount?: number;
  progressUpdatedAt?: string;
  instantTextRenderMode?: string | null;
  segments: Array<{
    index: number;
    status: InstantPremiumSegmentStatus;
    sourceImageId: string;
    sourceImageUrl: string | null;
    videoUrl: string | null;
    durationSeconds: number | null;
    providerTaskId: string | null;
    error: string | null;
    errorCode?: string | null;
    canRetry?: boolean;
  }>;
  retryState?: InstantPremiumRetryState | null;
  retryingSegmentIndex?: number | null;
  segmentsMergeFailed?: boolean;
  canRetryMerge?: boolean;
  hasFailedSegment?: boolean;
  finalVideoUrl: string | null;
  finalDurationSeconds: number | null;
  downloadable: boolean;
  errorMessage: string | null;
  missingSegments?: number[];
  queuedWithoutJobCount?: number;
  lockedTextLayerCount?: number;
  lockedTextMode?: boolean;
  overlayFailed?: boolean;
  canRetryOverlay?: boolean;
  failureReason?: InstantPremiumFailureReason | null;
  exportId?: string | null;
  exportStatus?: string | null;
  exportFailureReason?: InstantPremiumFailureReason | null;
  exportLastError?: string | null;
  workerError?: string | null;
  failedAtStage?: InstantPremiumProgressStage;
  finalRebuildFailed?: boolean;
  userExportErrorKey?: string | null;
  workerJobStatus?: string | null;
  finalizationStuck?: boolean;
  canRepairFinalVideo?: boolean;
  isRestoringFinalVideo?: boolean;
  canRebuildFinalVideo?: boolean;
  isRebuildingFinalVideo?: boolean;
  /** Active FFmpeg merge/export stage during text rerender rebuild. */
  finalExportStage?: string | null;
  videoRepairStage?: string | null;
  videoRepairStatus?: "running" | "completed" | "failed" | null;
  videoRepairUpdatedAt?: string | null;
  videoRepairUserMessageKey?: string | null;
  repairAdminDetail?: {
    stage: string | null;
    status: string | null;
    errorCode: string | null;
    workerError: string | null;
    exportLastError: string | null;
    failureReason: string | null;
    exportStatus: string | null;
    exportProgress: number | null;
    workerJobStatus: string | null;
    finalExportStage: string | null;
    updatedAt: string | null;
    startedAt: string | null;
  } | null;
  /** Studio V19: summary during generation / after completion. */
  studioQa?: ProjectStudioQaResponse | null;
};
