/**
 * Single-pass production insights for workspace inspector rail.
 * Avoids duplicate analyzeStoryIntelligence / story health recomputation.
 */

import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import {
  buildCharacterConsistencySummary,
  type CharacterConsistencySummary,
} from "@/lib/studio-character-consistency-summary";
import {
  predictMotionQuality,
  type MotionQualityPrediction,
} from "@/lib/studio-motion-quality-prediction";
import { buildStudioUnifiedReadiness } from "@/lib/studio-unified-readiness";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import {
  buildStoryHealthAdvisorReport,
  type StoryHealthAdvisorReport,
} from "@/lib/studio-story-health-advisor";
import { analyzeStoryIntelligence } from "@/lib/studio-story-intelligence";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";
export type StudioProductionInsights = {
  storyHealth: StoryHealthAdvisorReport;
  readiness: {
    score: number;
    level: ReturnType<typeof buildStudioUnifiedReadiness>["level"];
    checks: Array<{
      id: "scenes" | "images" | "voice" | "text_beats" | "emotion";
      messageKey: string;
      passed: boolean;
    }>;
  };
  unifiedReadiness: ReturnType<typeof buildStudioUnifiedReadiness>;
  consistency: CharacterConsistencySummary;
  quality: MotionQualityPrediction;
};

export function buildStudioProductionInsights(
  storyboard: StudioStoryboardDetail,
  cast: StudioCharacterListItem[] = []
): StudioProductionInsights {
  const directorProfile = normalizeStudioDirectorProfile(storyboard.directorProfile);
  const flow = storyboardToFlowInput(storyboard);
  const intelligence = analyzeStoryIntelligence(flow, directorProfile);
  const storyHealth = buildStoryHealthAdvisorReport(storyboard, cast, { intelligence, flow });
  const unifiedReadiness = buildStudioUnifiedReadiness({ storyboard, characters: cast });
  const readiness = {
    score: unifiedReadiness.score,
    level: unifiedReadiness.level,
    checks: unifiedReadiness.checks
      .filter((c) =>
        ["scenes", "images", "voice", "text_beats", "emotion"].includes(c.id)
      )
      .map((c) => ({
        id: c.id as "scenes" | "images" | "voice" | "text_beats" | "emotion",
        messageKey: c.messageKey,
        passed: c.passed,
      })),
  };
  const consistency = buildCharacterConsistencySummary(cast);
  const quality = predictMotionQuality(storyboard, cast, { storyHealth });

  return { storyHealth, readiness, unifiedReadiness, consistency, quality };
}
