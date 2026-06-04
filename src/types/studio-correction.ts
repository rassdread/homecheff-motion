import type { SceneConsistencyReport, StoryboardConsistencyReport } from "@/types/studio-consistency";

export const CORRECTION_RECOMMENDATION_TYPES = [
  "MissingCharacterTrait",
  "MissingPropBranding",
  "WeakLocationIdentity",
  "WorldStyleMismatch",
  "LowConsistencyScore",
  "GeneralContinuity",
] as const;

export type CorrectionRecommendationType = (typeof CORRECTION_RECOMMENDATION_TYPES)[number];

export const CORRECTION_SEVERITIES = ["low", "medium", "high", "critical"] as const;

export type CorrectionSeverity = (typeof CORRECTION_SEVERITIES)[number];

export const PROMPT_PATCH_TYPES = [
  "character",
  "location",
  "prop",
  "world",
  "continuity",
  "general",
] as const;

export type PromptPatchType = (typeof PROMPT_PATCH_TYPES)[number];

export type CorrectionRecommendation = {
  id: string;
  type: CorrectionRecommendationType;
  severity: CorrectionSeverity;
  message: string;
  promptPatch: string;
  source: string;
};

export type PromptPatch = {
  id: string;
  type: PromptPatchType;
  priority: number;
  text: string;
  source: string;
};

export type ImprovementScore = {
  previousScore: number | null;
  newScore: number;
  delta: number;
  improved: boolean;
};

export type SceneCorrectionBundle = {
  recommendations: CorrectionRecommendation[];
  patches: PromptPatch[];
  correctedPrompt: string;
  basePrompt: string;
};

export type SceneCorrectionPreviewResponse = {
  sourceImageId: string;
  basePrompt: string;
  correctedPrompt: string;
  recommendations: CorrectionRecommendation[];
  patches: PromptPatch[];
  consistencyReport: SceneConsistencyReport;
};

export type RegenerateWithCorrectionsResponse = {
  image: import("@/types/studio-scene-image").StudioSceneImageListItem;
  correction: SceneCorrectionBundle;
  improvement: ImprovementScore;
  consistencyReport: SceneConsistencyReport;
};

export type StoryboardSceneCorrectionSuggestion = {
  sceneId: string;
  sceneTitle: string;
  order: number;
  imageId: string | null;
  consistencyScore: number | null;
  consistencyStatus: string | null;
  recommendationCount: number;
  action: "regenerate" | "review" | "ok";
  summary: string;
};

export type StoryboardCorrectionSummary = {
  storyboardId: string;
  analyzedAt: string;
  consistencyReport: StoryboardConsistencyReport;
  scenes: StoryboardSceneCorrectionSuggestion[];
  totalRecommendations: number;
  scenesNeedingCorrection: number;
};

export type StoryboardGenerateCorrectionsResponse = {
  summary: StoryboardCorrectionSummary;
};

export type ConsistencyHistoryEntry = {
  imageId: string;
  generationVersion: number;
  consistencyScore: number | null;
  consistencyStatus: string | null;
  improvementScore: number | null;
  correctionCount: number;
  createdAt: string;
};
