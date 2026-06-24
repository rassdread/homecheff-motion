/** Unified Studio video production orchestration types. */

export const STUDIO_VIDEO_INTENTS = [
  "music_video",
  "travel_vlog",
  "product_commercial",
  "social_campaign",
  "podcast_video",
  "restaurant_promo",
  "cooking_show",
  "fashion_reel",
  "documentary",
  "event_video",
  "presentation_video",
  "slideshow",
  "photo_story",
  "brand_story",
  "company_video",
] as const;

export type StudioVideoIntent = (typeof STUDIO_VIDEO_INTENTS)[number];

/** User-facing production phases — never expose Motion/Publish/Storyboard. */
export const STUDIO_USER_PHASES = ["collect", "analyze", "plan", "generate", "finish"] as const;

export type StudioUserPhase = (typeof STUDIO_USER_PHASES)[number];

export type StudioOrchestratorStatus =
  | "planning"
  | "generating_assets"
  | "preparing_motion"
  | "rendering"
  | "merging"
  | "publishing"
  | "completed"
  | "failed";

export type MusicVideoSectionId =
  | "intro"
  | "verse_1"
  | "chorus_1"
  | "verse_2"
  | "chorus_2"
  | "bridge"
  | "finale";

export type MusicVideoSection = {
  id: MusicVideoSectionId;
  label: string;
  startSeconds: number;
  endSeconds: number;
  energy: "low" | "medium" | "high" | "peak";
  sceneCount: number;
};

export type AudioAnalysisProfile = {
  durationSeconds: number;
  tempoBpm: number | null;
  energyProfile: "low" | "medium" | "high" | "dynamic";
  sections: Array<{
    id: string;
    label: string;
    startSeconds: number;
    endSeconds: number;
    energy: "low" | "medium" | "high" | "peak";
  }>;
  silenceRegions: Array<{ startSeconds: number; endSeconds: number }>;
  peakMoments: Array<{ seconds: number; intensity: number }>;
  chorusMoments: Array<{ startSeconds: number; endSeconds: number }>;
  dropMoments: Array<{ seconds: number }>;
  analyzedAt: string;
  sourceFormat: string;
};

export type VideoAnalysisProfile = {
  durationSeconds: number;
  width: number | null;
  height: number | null;
  frameRate: number | null;
  hasSpeech: boolean;
  hasMusic: boolean;
  hasSubtitles: boolean;
  estimatedSceneCount: number;
  estimatedCutCount: number;
  estimatedSpeakerCount: number;
  analyzedAt: string;
};

export type StudioAnalysisType =
  | "image_analysis"
  | "audio_analysis"
  | "video_analysis"
  | "style_dna"
  | "motion_identity"
  | "character_intelligence"
  | "motion_ready"
  | "brand_protection"
  | "subtitle_analysis"
  | "speaker_analysis";

export type StudioRequiredAnalysis = {
  type: StudioAnalysisType;
  labelKey: string;
  credits: number;
  cached: boolean;
  reusableFrom?: string;
};

export type StudioAnalysisPlan = {
  intent: StudioVideoIntent;
  requiredAnalyses: StudioRequiredAnalysis[];
  cachedAnalyses: StudioRequiredAnalysis[];
  analysisCredits: number;
  renderCredits: number;
  publishCredits: number;
  totalCredits: number;
  estimatedRenderMinutes: number;
  estimatedVideoSeconds: number;
  sceneCount: number;
  batchCount: number;
  userCostLines: Array<{ labelKey: string; credits: number }>;
  /** Video Plan Contract — source of truth for this quote. */
  videoPlanContract?: import("@/types/studio-video-plan-contract").VideoPlanContract;
  /** Internal — observed COGS + margin metadata (not shown in UI). */
  pricingEstimate?: {
    estimatedCogsUsd: number;
    viduUsd: number;
    openaiUsd: number;
    analysisUsd: number;
    blobUsd: number;
    mergeUsd?: number;
    exportUsd?: number;
    retryBufferUsd?: number;
    targetGrossMargin: number;
    grossMarginAtWorstPack: number;
    cacheSavingsUsd?: number;
  };
};

export type MusicVideoProductionPlan = {
  intent: "music_video";
  audioProfile: AudioAnalysisProfile;
  sections: MusicVideoSection[];
  sceneCount: number;
  renderCount: number;
  sceneDurationSeconds: number;
  estimatedCredits: number;
  estimatedRenderMinutes: number;
  estimatedDurationSeconds: number;
  requiredAssets: Array<{ kind: string; required: boolean; satisfied: boolean }>;
  mergePlan: {
    batchCount: number;
    segmentsPerBatch: number;
    ffmpegMergeRequired: boolean;
  };
};

export type LongFormDurationTarget = "30s" | "60s" | "90s" | "3min" | "5min" | "10min";

export type LongFormProductionPlan = {
  target: LongFormDurationTarget;
  targetSeconds: number;
  actCount: number;
  sceneCount: number;
  renderBatchCount: number;
  scenesPerBatch: number;
  sceneDurationSeconds: number;
  transitionCount: number;
  estimatedCredits: number;
  estimatedRenderMinutes: number;
  ffmpegMergeRequired: boolean;
  acts: Array<{
    id: string;
    label: string;
    startSeconds: number;
    endSeconds: number;
    sceneCount: number;
  }>;
};

export type StudioWorkflowTransactionPhase =
  | "created"
  | "reserved"
  | "analysis_running"
  | "analysis_complete"
  | "generation_running"
  | "generation_complete"
  | "publish_running"
  | "completed"
  | "failed"
  | "refunded";

export type StudioWorkflowTransaction = {
  id: string;
  hcProjectId: string;
  intent: StudioVideoIntent;
  phase: StudioWorkflowTransactionPhase;
  analysisPlan: StudioAnalysisPlan;
  reservedCredits: number;
  storyboardId?: string;
  motionProjectId?: string;
  publishProjectId?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudioWorkflowReservation = {
  id: string;
  reservationId: string;
  hcProjectId: string;
  intent: StudioVideoIntent;
  phase: StudioWorkflowTransactionPhase;
  analysisCredits: number;
  renderCredits: number;
  publishCredits: number;
  totalCredits: number;
  storyboardId?: string;
  motionProjectId?: string;
  publishProjectId?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudioOrchestratorRunPhase =
  | "collecting_assets"
  | "analyzing_content"
  | "planning_video"
  | "creating_scenes"
  | "rendering_video"
  | "merging_video"
  | "finalizing_video"
  | "completed";

/** Unified production lifecycle — user-facing project state. */
export type HcProductionLifecycleState =
  | "created"
  | "planning"
  | "analyzing"
  | "rendering"
  | "merging"
  | "finishing"
  | "completed"
  | "failed";

export type HcPersistedProductionAssetKind =
  | "photo"
  | "photos"
  | "music"
  | "voice"
  | "video"
  | "character"
  | "motion_ready_character"
  | "logo"
  | "product_image";

export type HcPersistedProductionAsset = {
  id: string;
  kind: HcPersistedProductionAssetKind;
  url: string;
  storageKey?: string;
  fileName?: string;
  mimeType?: string;
  durationSeconds?: number;
  analysisJson?: Record<string, unknown>;
  createdAt: string;
};

export type PhotoMoviePlan = {
  intent: "photo_story" | "travel_vlog" | "slideshow";
  photoCount: number;
  sceneCount: number;
  targetSeconds: number;
  sceneDurationSeconds: number;
  transitionCount: number;
  renderBatchCount: number;
  scenesPerBatch: number;
  ffmpegMergeRequired: boolean;
  estimatedCredits: number;
  estimatedRenderMinutes: number;
};

export type ProductionBatchExecutionState = {
  batchIndex: number;
  totalBatches: number;
  status: "pending" | "running" | "completed" | "failed";
  motionProjectId?: string;
  segmentVideoUrl?: string;
  error?: string;
};

export type ProductionExecutionState = {
  id: string;
  lifecycle: HcProductionLifecycleState;
  renderBatchPlan?: import("@/lib/studio-render-batch-planner").RenderBatchPlan;
  batches: ProductionBatchExecutionState[];
  mergedVideoUrl?: string;
  musicAudioUrl?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
};

/** Single billing chain for one production run. */
export type ProductionTransaction = {
  id: string;
  reservationId: string;
  hcProjectId: string;
  intent: StudioVideoIntent;
  phase: StudioWorkflowTransactionPhase;
  contractId?: string;
  analysisCredits: number;
  renderCredits: number;
  publishCredits: number;
  mergeCredits: number;
  audioCredits: number;
  finishingCredits?: number;
  totalCredits: number;
  consumedCredits?: number;
  consumedCogsUsd?: number;
  providerCostEventIds?: string[];
  captured: boolean;
  refunded: boolean;
  settledAt?: string;
  storyboardId?: string;
  motionProjectId?: string;
  publishProjectId?: string;
  createdAt: string;
  updatedAt: string;
};

export type HcOrchestratorState = {
  intent?: StudioVideoIntent;
  userPhase: StudioUserPhase;
  status: StudioOrchestratorStatus;
  idea?: string;
  audioAnalysis?: AudioAnalysisProfile;
  videoAnalysis?: VideoAnalysisProfile;
  musicVideoPlan?: MusicVideoProductionPlan;
  longFormPlan?: LongFormProductionPlan;
  analysisPlan?: StudioAnalysisPlan;
  /** Video Plan Contract — user-facing "Video Plan" source of truth. */
  videoPlanContract?: import("@/types/studio-video-plan-contract").VideoPlanContract;
  transaction?: StudioWorkflowTransaction;
  storyboardId?: string;
  motionHandoffReady?: boolean;
  motionImportUrl?: string;
  characterId?: string;
  approvedAt?: string;
  completedAt?: string | null;
  workflowReservation?: StudioWorkflowReservation;
  productionTransaction?: ProductionTransaction;
  productionExecution?: ProductionExecutionState;
  persistedAssets?: HcPersistedProductionAsset[];
  photoMoviePlan?: PhotoMoviePlan;
  lifecycle?: HcProductionLifecycleState;
  runPhase?: StudioOrchestratorRunPhase;
  motionProjectId?: string;
  finalVideoUrl?: string;
  musicAudioUrl?: string;
  logoAssetIds?: string[];
  productAssetIds?: string[];
  productionError?: string;
};
