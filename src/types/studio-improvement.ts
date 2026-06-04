import type { CorrectionRecommendation, PromptPatch } from "@/types/studio-correction";
import type { SceneConsistencyReport } from "@/types/studio-consistency";
import type { VisionConsistencyReport } from "@/types/studio-vision-consistency";
import type { CorrectionSeverity } from "@/types/studio-correction";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";
import type { ImprovementScore } from "@/types/studio-correction";

export type RegenerationRecommendationAction = "regenerate" | "review" | "ok";

export type RegenerationRecommendation = {
  shouldRegenerate: boolean;
  reason: string;
  severity: CorrectionSeverity;
  confidence: number;
  suggestedPromptPatches: string[];
  action: RegenerationRecommendationAction;
};

export type CombinedImprovementScore = {
  consistency: ImprovementScore;
  vision: ImprovementScore;
  overallDelta: number;
  improved: boolean;
};

export type ImproveSceneImageResponse = {
  image: StudioSceneImageListItem;
  scene: import("@/types/studio-api").StudioSceneDetail;
  regeneration: RegenerationRecommendation;
  correction: import("@/types/studio-correction").SceneCorrectionBundle;
  improvement: CombinedImprovementScore;
  consistencyReport: SceneConsistencyReport;
  visionReport: VisionConsistencyReport | null;
  autoSelected: boolean;
};

export type StoryboardImprovementSceneEntry = {
  sceneId: string;
  sceneTitle: string;
  order: number;
  imageId: string | null;
  consistencyScore: number | null;
  visionScore: number | null;
  combinedScore: number | null;
  regeneration: RegenerationRecommendation;
  recommendationCount: number;
};

export type StoryboardImprovementSummary = {
  storyboardId: string;
  analyzedAt: string;
  scenes: StoryboardImprovementSceneEntry[];
  scenesNeedingImprovement: number;
};

export type BulkImproveSceneResult = {
  sceneId: string;
  ok: boolean;
  imageId?: string;
  autoSelected?: boolean;
  error?: string;
};

export type BulkImproveScenesResponse = {
  results: BulkImproveSceneResult[];
  processed: number;
  total: number;
};

export type SceneImageHistoryEntry = {
  imageId: string;
  generationVersion: number;
  thumbnailUrl: string;
  imageUrl: string;
  consistencyScore: number | null;
  visionScore: number | null;
  combinedScore: number | null;
  improvementScore: number | null;
  visionImprovementScore: number | null;
  overallImprovementScore: number | null;
  isRecommended: boolean;
  isSelected: boolean;
  createdAt: string;
  status: string;
};
