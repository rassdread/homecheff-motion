import type { CharacterIdentityTimeline } from "@/types/studio-character-consistency";
import type { CharacterIdentityStatus } from "@/types/studio-character-consistency";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";

export type MotionRenderReadinessTier = "not_ready" | "needs_review" | "ready" | "strong";

export type MotionRenderReadiness = {
  tier: MotionRenderReadinessTier;
  score: number;
  imageAvailabilityScore: number;
  averageVisionScore: number | null;
  averageConsistencyScore: number | null;
  averageCharacterIdentityScore: number | null;
  criticalDriftCount: number;
  scenesMissingImages: number;
  scenesNeedingReview: number;
  summaryMessageKey: MotionRenderReadinessSummaryKey;
};

export type MotionRenderReadinessSummaryKey =
  | "motion.qa.readiness.notReady"
  | "motion.qa.readiness.needsReview"
  | "motion.qa.readiness.ready"
  | "motion.qa.readiness.strong";

export type MotionDriftWarningDisplay = {
  id: string;
  message: string;
  severity: "critical" | "high" | "medium" | "low";
  affectedSceneOrders: number[];
};

export type MotionCharacterOverview = {
  characterId: string;
  name: string;
  identityScore: number | null;
  status: CharacterIdentityStatus | null;
};

export type MotionSceneBreakdown = {
  sceneId: string;
  order: number;
  title: string;
  visionScore: number | null;
  consistencyScore: number | null;
  combinedImageScore: number | null;
  hasSelectedImage: boolean;
  characters: Array<{
    characterId: string;
    name: string;
    score: number;
    status: CharacterIdentityStatus;
    driftFlag: boolean;
  }>;
  driftWarnings: string[];
};

/** Per-scene QA stored on wizard slots (V18). */
export type MotionSceneStudioQa = {
  sceneTitle: string;
  order: number;
  selectedSceneImageUrl: string | null;
  visionScore: number | null;
  consistencyScore: number | null;
  combinedImageScore: number | null;
  characterIdentities: Array<{
    characterId: string;
    name: string;
    score: number;
    status: CharacterIdentityStatus;
  }>;
  driftWarnings: string[];
  correctionRecommendations: Array<{ message: string; severity: string }>;
};

/** Storyboard-level Studio intelligence snapshot (persisted on import). */
export type MotionStudioIntelligenceSnapshot = {
  storyboardId: string;
  storyboardTitle: string;
  promptStyleProfile: StudioPromptStyleProfile | null;
  handoffVersion: number;
  importedAt: string;
  worldName: string | null;
  charactersUsed: string[];
  locationsUsed: string[];
  propsUsed: string[];
  overallConsistencyScore: number | null;
  overallVisionScore: number | null;
  overallCharacterIdentityScore: number | null;
  characterOverviews: MotionCharacterOverview[];
  characterTimelines: CharacterIdentityTimeline[];
  driftWarnings: MotionDriftWarningDisplay[];
  sceneBreakdowns: MotionSceneBreakdown[];
  sceneCount: number;
  /** True when handoff predates v9 character metadata. */
  legacyHandoff: boolean;
  /** True when scores/reports are incomplete. */
  partialData: boolean;
  /** V30: execution readiness from handoff v11. */
  executionReadiness?: import("@/types/studio-scene-execution").StudioExecutionReadiness;
  executionWarningCount?: number;
};
