/**
 * Studio V2 — Creative Review (project-level quality summary, advisory only).
 */

import type { UnifiedReadinessLevel } from "@/lib/studio-unified-readiness";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  ProductionAudioStatus,
  StoryStructurePhaseId,
  StoryStructurePhaseStatus,
} from "@/types/studio-production-plan";

export type CreativeReviewItemStatus =
  | "strong"
  | "weak"
  | "missing"
  | "partial"
  | "ready"
  | "info";

export type CreativeReviewItem = {
  id: string;
  messageKey: string;
  messageParams?: Record<string, string>;
  status: CreativeReviewItemStatus;
  toolId?: StudioToolId;
  priority?: "high" | "medium" | "low";
};

export type CreativeReviewStoryPhase = {
  phase: StoryStructurePhaseId;
  status: StoryStructurePhaseStatus;
  labelKey: string;
  sceneOrders: number[];
  reviewStatus: "strong" | "weak" | "missing";
};

export type CreativeReviewQualitySummary = {
  score: number;
  level: UnifiedReadinessLevel;
  summaryKey: string;
  summaryParams?: Record<string, string>;
};

export type CreativeReviewStoryReview = {
  score: number;
  phases: CreativeReviewStoryPhase[];
  advisories: CreativeReviewItem[];
};

export type CreativeReviewAssetReview = {
  missingCharacters: CreativeReviewItem[];
  missingLocations: CreativeReviewItem[];
  missingProps: CreativeReviewItem[];
  missingWorlds: CreativeReviewItem[];
  items: CreativeReviewItem[];
};

export type CreativeReviewActionReview = {
  items: CreativeReviewItem[];
};

export type CreativeReviewImageReview = {
  requiredPresent: number;
  requiredMissing: number;
  recommendedMissing: number;
  orderLogical: boolean;
  items: CreativeReviewItem[];
};

export type CreativeReviewAudioReview = {
  narration: ProductionAudioStatus;
  transcript: ProductionAudioStatus;
  music: ProductionAudioStatus;
  sound: ProductionAudioStatus;
  items: CreativeReviewItem[];
};

export type CreativeReviewRenderReview = {
  strategy: string;
  strategyLabelKey: string;
  confidence: string;
  fallbackActive: boolean;
  items: CreativeReviewItem[];
};

export type CreativeReviewMemoryReview = {
  similarProductionCount: number;
  patternLabelKey?: string;
  items: CreativeReviewItem[];
};

export type StudioCreativeReview = {
  version: 1;
  qualitySummary: CreativeReviewQualitySummary;
  strengths: CreativeReviewItem[];
  weaknesses: CreativeReviewItem[];
  opportunities: CreativeReviewItem[];
  missingElements: CreativeReviewItem[];
  improvementSuggestions: CreativeReviewItem[];
  storyReview: CreativeReviewStoryReview;
  assetReview: CreativeReviewAssetReview;
  actionReview: CreativeReviewActionReview;
  imageReview: CreativeReviewImageReview;
  audioReview: CreativeReviewAudioReview;
  renderReview: CreativeReviewRenderReview;
  memoryReview: CreativeReviewMemoryReview;
  directorContextLines: string[];
};

export type CreativeReviewContext = {
  review: StudioCreativeReview;
  contextLines: string[];
  recommendationKeys: string[];
};

export type StudioCreativeReviewInput = {
  storyboard: import("@/types/studio-api").StudioStoryboardDetail;
  characters?: import("@/types/studio-api").StudioCharacterListItem[];
  locations?: import("@/types/studio-api").StudioLocationListItem[];
  props?: import("@/types/studio-api").StudioPropListItem[];
  worlds?: import("@/types/studio-api").StudioWorldProfileListItem[];
  projectMemory?: import("@/types/studio-project-memory").StudioProjectMemorySnapshot;
  styleProfile?: string;
  directorProfile?: string;
  currentIdea?: string;
};
