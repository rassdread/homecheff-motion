import type { CorrectionRecommendation } from "@/types/studio-correction";
import type { StudioConsistencyStatus } from "@/types/studio-consistency";

/** V17: per-character identity quality (0–100). */
export const CHARACTER_IDENTITY_STATUSES = [
  "excellent",
  "good",
  "needs_review",
  "poor",
] as const;

export type CharacterIdentityStatus = (typeof CHARACTER_IDENTITY_STATUSES)[number];

export type CharacterIdentityScoreFactors = {
  consistencyScore: number | null;
  visionScore: number | null;
  memoryMatchScore: number | null;
  referenceAnchored: boolean;
  expectedInScene: boolean;
  presentInScene: boolean;
};

export type CharacterIdentityScore = {
  characterId: string;
  name: string;
  score: number;
  status: CharacterIdentityStatus;
  factors: CharacterIdentityScoreFactors;
  warnings: string[];
};

export type CharacterIdentityTimelineEntry = {
  sceneId: string;
  sceneTitle: string;
  order: number;
  imageId: string | null;
  score: number | null;
  status: CharacterIdentityStatus | null;
  warnings: string[];
  driftFlag: boolean;
};

export type CharacterIdentityTimeline = {
  characterId: string;
  name: string;
  role: string;
  averageScore: number | null;
  worstSceneOrder: number | null;
  worstScore: number | null;
  warningCount: number;
  entries: CharacterIdentityTimelineEntry[];
};

export type SceneCharacterIdentityScore = {
  sceneId: string;
  sceneTitle: string;
  order: number;
  imageId: string | null;
  characters: CharacterIdentityScore[];
};

export type StoryboardCharacterConsistencyReport = {
  storyboardId: string;
  analyzedAt: string;
  overallCharacterConsistencyScore: number;
  perCharacterScores: Array<{
    characterId: string;
    name: string;
    averageScore: number;
    status: CharacterIdentityStatus;
    warningCount: number;
  }>;
  perSceneCharacterScores: SceneCharacterIdentityScore[];
  characterTimelines: CharacterIdentityTimeline[];
  driftWarnings: string[];
  recommendedCorrections: CorrectionRecommendation[];
  /** Scenes with any poor / needs_review character identity. */
  scenesNeedingCharacterReview: number;
};

export type StudioStoryboardCharacterConsistencyResponse = {
  report: StoryboardCharacterConsistencyReport;
};
