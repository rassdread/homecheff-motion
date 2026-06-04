export const MOVIE_BUILDER_STEPS = [
  "prepare",
  "generate",
  "analyze",
  "improve",
  "select",
  "motion",
] as const;

export type MovieBuilderStepId = (typeof MOVIE_BUILDER_STEPS)[number];

export type MovieReadinessTier = "not_ready" | "needs_review" | "ready" | "strong";

export type MoviePrepareCheckItemId =
  | "storyboard_title"
  | "min_scenes"
  | "scene_location"
  | "scene_action"
  | "scene_emotion"
  | "scene_camera"
  | "scene_cast";

export type MoviePrepareCheckLabelKey =
  | "studio.movieBuilder.prepare.check.title"
  | "studio.movieBuilder.prepare.check.minScenes"
  | "studio.movieBuilder.prepare.check.location"
  | "studio.movieBuilder.prepare.check.action"
  | "studio.movieBuilder.prepare.check.emotion"
  | "studio.movieBuilder.prepare.check.camera"
  | "studio.movieBuilder.prepare.check.cast";

export type MoviePrepareCheckItem = {
  id: MoviePrepareCheckItemId;
  labelKey: MoviePrepareCheckLabelKey;
  passed: boolean;
  sceneIds?: string[];
};

export type MoviePrepareChecklist = {
  ready: boolean;
  items: MoviePrepareCheckItem[];
  scenesNeedingAttention: number;
};

export type MovieBuilderStepStatus = "pending" | "active" | "complete" | "attention";

export type MovieBuilderStepState = {
  id: MovieBuilderStepId;
  status: MovieBuilderStepStatus;
  complete: boolean;
};

export type MovieReadinessScore = {
  tier: MovieReadinessTier;
  score: number;
  sceneCompletenessScore: number;
  imageAvailabilityScore: number;
  averageVisionScore: number | null;
  averageConsistencyScore: number | null;
  selectedImagesCount: number;
  scenesWithSelectedImage: number;
  totalScenes: number;
  criticalWarningCount: number;
  unresolvedWeakSceneCount: number;
};

export type MovieBuilderDashboard = {
  sceneCount: number;
  imagesReady: number;
  imagesReadyLabel: string;
  averageConsistencyScore: number | null;
  averageVisionScore: number | null;
  warningCount: number;
  readiness: MovieReadinessScore;
};

export type MovieBuilderSceneBundle = {
  sceneId: string;
  order: number;
  title: string;
  hasCompletedImage: boolean;
  selectedImageId: string | null;
  selectedImageReady: boolean;
  visionScore: number | null;
  consistencyScore: number | null;
  regenerationAction: "ok" | "review" | "regenerate";
};
