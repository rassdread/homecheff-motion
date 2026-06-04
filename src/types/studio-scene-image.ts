import type { PromptVersionMetadata } from "@/types/studio-prompt-builder";
import type { SceneConsistencyReport, StudioConsistencyStatus } from "@/types/studio-consistency";

export const STUDIO_SCENE_IMAGE_STATUSES = [
  "queued",
  "generating",
  "completed",
  "failed",
] as const;

export type StudioSceneImageStatus = (typeof STUDIO_SCENE_IMAGE_STATUSES)[number];

export type StudioSceneImageGenerationSettings = {
  styleProfile: string;
  promptVersion: number;
  generationVersion: number;
  referenceAssets?: {
    characters: Array<{ id: string; name: string; referenceImageUrl: string | null }>;
    location: { id: string; name: string; referenceImageUrl: string | null } | null;
    props: Array<{ id: string; name: string; referenceImageUrl: string | null }>;
  };
  model?: string;
  size?: string;
};

/** Lightweight version metadata stored on each image row (no separate table in V8). */
export type StudioSceneImageVersionMetadata = {
  promptVersion: number;
  generationVersion: number;
  generatedAt: string;
  promptMetadata?: PromptVersionMetadata;
};

export type StudioSceneImageListItem = {
  id: string;
  sceneId: string;
  status: StudioSceneImageStatus;
  promptVersion: number;
  generationVersion: number;
  generatedPrompt: string;
  imageUrl: string;
  storageKey: string;
  thumbnailUrl: string;
  provider: string;
  seed: string | null;
  generationSettings: StudioSceneImageGenerationSettings | null;
  consistencyScore: number | null;
  consistencyStatus: StudioConsistencyStatus | null;
  consistencyReport: SceneConsistencyReport | null;
  consistencyRecommendations: string[];
  consistencyAnalyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudioSceneImageDetail = StudioSceneImageListItem;

export type StudioSceneImageHealthTier = "weak" | "good" | "strong";

export type StudioSceneImageHealth = {
  score: number;
  tier: StudioSceneImageHealthTier;
  promptQualityScore: number;
  generationSucceeded: boolean;
};
