import type { MotionActionPresetId } from "@/types/motion-action-presets";

export type AssistantRecommendationCategory =
  | "for_you"
  | "continue_working"
  | "trending"
  | "hidden_possibilities"
  | "quick_starts";

export type AssistantRecommendationPage =
  | "home"
  | "studio"
  | "editor"
  | "motion"
  | "projects"
  | "library"
  | "publish"
  | "usage";

export type AssistantRecommendationStatus = "ready" | "missing" | "start";

export type AssistantRecommendationCatalogEntry = {
  id: string;
  category: AssistantRecommendationCategory;
  pages: AssistantRecommendationPage[];
  emoji: string;
  titleKey: `assistant.recommendation.${string}.title`;
  descriptionKey: `assistant.recommendation.${string}.description`;
  whyKey: `assistant.recommendation.${string}.why`;
  statusReadyKey?: `assistant.recommendation.${string}.statusReady`;
  statusMissingKey?: `assistant.recommendation.${string}.statusMissing`;
  promptMessage: string;
  actionPresetId?: MotionActionPresetId;
  fusionIntent?: string;
  trendingScore?: number;
  requiresCharacter?: boolean;
  requiresMotionReady?: boolean;
  requiresFamilyPhotos?: boolean;
  hiddenFeature?: boolean;
};

export type AssistantRecommendation = {
  id: string;
  category: AssistantRecommendationCategory;
  emoji: string;
  titleKey: `assistant.recommendation.${string}.title`;
  descriptionKey: `assistant.recommendation.${string}.description`;
  whyKey: `assistant.recommendation.${string}.why`;
  promptMessage: string;
  status: AssistantRecommendationStatus;
  statusNoteKey?: `assistant.recommendation.${string}.statusReady` | `assistant.recommendation.${string}.statusMissing` | `assistant.recommendation.status.${string}`;
  actionPresetId?: MotionActionPresetId;
  fusionIntent?: string;
  score: number;
  characterName?: string;
};

export type AssistantRecommendationEngineInput = {
  pathname: string;
  snapshot: import("@/lib/assistant-context-layer").AssistantContextSnapshot;
  activeProject?: import("@/lib/assistant-context-layer").AssistantProjectContext | null;
  recentRecommendationIds?: string[];
  sessionSeed?: string;
  minCount?: number;
  maxCount?: number;
};

export type AssistantRecommendationEngineResult = {
  page: AssistantRecommendationPage;
  recommendations: AssistantRecommendation[];
  byCategory: Partial<Record<AssistantRecommendationCategory, AssistantRecommendation[]>>;
};
