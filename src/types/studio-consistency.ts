import type { StudioContinuityStrength } from "@/lib/studio-continuity-strength";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";
import type {
  CharacterMemorySnapshot,
  LocationMemorySnapshot,
  PropMemorySnapshot,
  WorldMemorySnapshot,
} from "@/types/studio-memory-snapshots";

export const STUDIO_CONSISTENCY_STATUSES = [
  "excellent",
  "good",
  "needs_review",
  "poor",
] as const;

export type StudioConsistencyStatus = (typeof STUDIO_CONSISTENCY_STATUSES)[number];

/** Aggregated category scores for a single scene image analysis. */
export type ConsistencyAnalysis = {
  characterScore: number;
  locationScore: number;
  propScore: number;
  worldScore: number;
  overallScore: number;
  driftWarnings: string[];
};

export type CharacterConsistencyResult = {
  characterId: string;
  name: string;
  score: number;
  warnings: string[];
  recommendations: string[];
};

export type LocationConsistencyResult = {
  score: number;
  warnings: string[];
  recommendations: string[];
};

export type PropConsistencyResult = {
  propId: string;
  name: string;
  score: number;
  warnings: string[];
  recommendations: string[];
};

export type WorldConsistencyResult = {
  score: number;
  warnings: string[];
  recommendations: string[];
};

/** Full persisted report for one completed scene image. */
export type SceneConsistencyReport = {
  analyzedAt: string;
  overallScore: number;
  consistencyStatus: StudioConsistencyStatus;
  analysis: ConsistencyAnalysis;
  characterResults: CharacterConsistencyResult[];
  locationResult: LocationConsistencyResult | null;
  propResults: PropConsistencyResult[];
  worldResult: WorldConsistencyResult | null;
  warnings: string[];
  recommendations: string[];
  memoryReferences: {
    characters: Array<{ id: string; name: string }>;
    location: { id: string; name: string } | null;
    props: Array<{ id: string; name: string }>;
    world: { id: string; name: string } | null;
  };
  /** Prompt-memory alignment (V11); pixel vision can extend later. */
  analysisMethod: "prompt_memory_alignment";
};

export type ConsistencyTimelineEntry = {
  sceneId: string;
  sceneTitle: string;
  order: number;
  overallScore: number | null;
  consistencyStatus: StudioConsistencyStatus | null;
  imageId: string | null;
};

export type StoryboardConsistencyReport = {
  storyboardId: string;
  analyzedAt: string;
  overallScore: number;
  timeline: ConsistencyTimelineEntry[];
  sceneReports: Array<{
    sceneId: string;
    sceneTitle: string;
    order: number;
    imageId: string | null;
    report: SceneConsistencyReport | null;
  }>;
  driftWarnings: string[];
  recommendations: string[];
};

/** Input context: generated still metadata (prompt as proxy until vision). */
export type SceneImageConsistencyInput = {
  generatedPrompt: string;
  sceneTitle: string;
  sceneDescription: string;
  sceneAction: string;
};

export type StudioSceneConsistencyAnalyzeResponse = {
  image: StudioSceneImageListItem;
  report: SceneConsistencyReport;
};

export type StudioStoryboardConsistencyAnalyzeResponse = {
  report: StoryboardConsistencyReport;
};

export type SceneConsistencyMemoryInput = {
  characters: CharacterMemorySnapshot[];
  location: LocationMemorySnapshot | null;
  props: PropMemorySnapshot[];
  world: WorldMemorySnapshot | null;
  continuityStrength: StudioContinuityStrength;
};
