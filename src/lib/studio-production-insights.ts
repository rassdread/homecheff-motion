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
import {
  buildRenderReadinessSummary,
  type RenderReadinessSummary,
} from "@/lib/studio-render-readiness-summary";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import {
  buildStoryHealthAdvisorReport,
  type StoryHealthAdvisorReport,
} from "@/lib/studio-story-health-advisor";
import { analyzeStoryIntelligence } from "@/lib/studio-story-intelligence";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";
export type StudioProductionInsights = {
  storyHealth: StoryHealthAdvisorReport;
  readiness: RenderReadinessSummary;
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
  const readiness = buildRenderReadinessSummary(storyboard);
  const consistency = buildCharacterConsistencySummary(cast);
  const quality = predictMotionQuality(storyboard, cast, { storyHealth });

  return { storyHealth, readiness, consistency, quality };
}
