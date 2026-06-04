import type { StudioSceneImageListItem } from "@/types/studio-scene-image";
import type { StudioConsistencyStatus } from "@/types/studio-consistency";

export const STUDIO_VISION_STATUSES = [
  "excellent",
  "good",
  "needs_review",
  "poor",
] as const;

export type StudioVisionStatus = (typeof STUDIO_VISION_STATUSES)[number];

export type CharacterVisionResult = {
  characterId: string;
  name: string;
  score: number;
  warnings: string[];
  recommendations: string[];
  detectedElements: string[];
  referenceCompared: boolean;
};

export type LocationVisionResult = {
  score: number;
  warnings: string[];
  recommendations: string[];
  detectedElements: string[];
  referenceCompared: boolean;
};

export type PropVisionResult = {
  propId: string;
  name: string;
  score: number;
  warnings: string[];
  recommendations: string[];
  detectedElements: string[];
  referenceCompared: boolean;
};

export type BrandingVisionResult = {
  score: number;
  warnings: string[];
  recommendations: string[];
  detectedElements: string[];
};

export type WorldVisionResult = {
  score: number;
  warnings: string[];
  recommendations: string[];
  detectedElements: string[];
};

/** Full visual QA report for one completed scene image (V13). */
export type VisionConsistencyReport = {
  analyzedAt: string;
  overallVisionScore: number;
  visionStatus: StudioVisionStatus;
  characterVisionScore: number;
  locationVisionScore: number;
  propVisionScore: number;
  brandingVisionScore: number;
  worldVisionScore: number;
  visionWarnings: string[];
  visionRecommendations: string[];
  detectedElements: string[];
  characterResults: CharacterVisionResult[];
  locationResult: LocationVisionResult | null;
  propResults: PropVisionResult[];
  brandingResult: BrandingVisionResult;
  worldResult: WorldVisionResult | null;
  providerId: string;
  analysisMethod: "openai_vision" | "mock_vision_heuristic";
  referenceComparisonUsed: boolean;
};

export type VisionTimelineEntry = {
  sceneId: string;
  sceneTitle: string;
  order: number;
  overallVisionScore: number | null;
  visionStatus: StudioVisionStatus | null;
  imageId: string | null;
};

export type StoryboardVisionReport = {
  storyboardId: string;
  analyzedAt: string;
  overallVisionScore: number;
  timeline: VisionTimelineEntry[];
  sceneReports: Array<{
    sceneId: string;
    sceneTitle: string;
    order: number;
    imageId: string | null;
    report: VisionConsistencyReport | null;
  }>;
  visionWarnings: string[];
  visionRecommendations: string[];
};

export type StudioSceneVisionAnalyzeResponse = {
  image: StudioSceneImageListItem;
  report: VisionConsistencyReport;
};

export type StudioStoryboardVisionAnalyzeResponse = {
  report: StoryboardVisionReport;
};

/** Re-export status alias for vision panels (same thresholds as prompt consistency). */
export type { StudioConsistencyStatus as StudioVisionStatusAlias };
