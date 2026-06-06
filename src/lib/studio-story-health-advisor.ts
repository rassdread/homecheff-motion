/**
 * Story Health Engine — advisory analysis (non-blocking).
 */

import { climaxSceneIndex } from "@/lib/studio-story-arc";
import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import { analyzeStoryIntelligence } from "@/lib/studio-story-intelligence";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StoryHealthFactors } from "@/lib/studio-story-health";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";

export type StoryHealthAdvisoryCode =
  | "story_too_short"
  | "story_too_long"
  | "missing_climax"
  | "similar_scenes"
  | "missing_emotion_variation"
  | "low_character_usage";

export type StoryHealthAdvisory = {
  code: StoryHealthAdvisoryCode | string;
  messageKey: string;
  severity: "info" | "warning";
};

export type StoryHealthAdvisorReport = {
  score: number;
  factors: StoryHealthFactors;
  advisories: StoryHealthAdvisory[];
};

const IDEAL_MIN_SCENES = 3;
const IDEAL_MAX_SCENES = 12;

function countSimilarScenePairs(scenes: StudioStoryboardDetail["scenes"]): number {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  let pairs = 0;
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]!;
    const cur = ordered[i]!;
    const sameShot = prev.shotType && prev.shotType === cur.shotType;
    const sameEmotion = prev.emotion && prev.emotion === cur.emotion;
    const sameCamera = prev.cameraMovement && prev.cameraMovement === cur.cameraMovement;
    if (sameShot && sameEmotion && sameCamera) {
      pairs++;
    }
  }
  return pairs;
}

function uniqueEmotionCount(scenes: StudioStoryboardDetail["scenes"]): number {
  return new Set(scenes.map((s) => s.emotion?.trim().toLowerCase()).filter(Boolean)).size;
}

function characterUsageRatio(
  storyboard: StudioStoryboardDetail,
  cast: StudioCharacterListItem[]
): number {
  if (cast.length === 0 || storyboard.scenes.length === 0) {
    return 1;
  }
  const usedIds = new Set<string>();
  for (const scene of storyboard.scenes) {
    for (const c of scene.characters ?? []) {
      usedIds.add(c.id);
    }
  }
  return usedIds.size / cast.length;
}

export function buildStoryHealthAdvisorReport(
  storyboard: StudioStoryboardDetail,
  cast: StudioCharacterListItem[] = []
): StoryHealthAdvisorReport {
  const directorProfile = normalizeStudioDirectorProfile(storyboard.directorProfile);
  const intelligence = analyzeStoryIntelligence(storyboardToFlowInput(storyboard), directorProfile);
  const advisories: StoryHealthAdvisory[] = [];

  for (const w of intelligence.warnings) {
    advisories.push({
      code: w.code,
      messageKey: w.messageKey,
      severity: "warning",
    });
  }

  const sceneCount = storyboard.scenes.length;
  if (sceneCount > 0 && sceneCount < IDEAL_MIN_SCENES) {
    advisories.push({
      code: "story_too_short",
      messageKey: "studio.aiAssistant.storyHealth.tooShort",
      severity: "warning",
    });
  }
  if (sceneCount > IDEAL_MAX_SCENES) {
    advisories.push({
      code: "story_too_long",
      messageKey: "studio.aiAssistant.storyHealth.tooLong",
      severity: "info",
    });
  }

  const climaxIdx = climaxSceneIndex(storyboardToFlowInput(storyboard));
  if (sceneCount >= 4 && climaxIdx < 0) {
    advisories.push({
      code: "missing_climax",
      messageKey: "studio.aiAssistant.storyHealth.missingClimax",
      severity: "warning",
    });
  }

  const similarPairs = countSimilarScenePairs(storyboard.scenes);
  if (similarPairs >= 2) {
    advisories.push({
      code: "similar_scenes",
      messageKey: "studio.aiAssistant.storyHealth.similarScenes",
      severity: "warning",
    });
  }

  if (sceneCount >= 3 && uniqueEmotionCount(storyboard.scenes) < 2) {
    advisories.push({
      code: "missing_emotion_variation",
      messageKey: "studio.aiAssistant.storyHealth.missingEmotionVariation",
      severity: "warning",
    });
  }

  const usage = characterUsageRatio(storyboard, cast);
  if (cast.length >= 2 && usage < 0.5) {
    advisories.push({
      code: "low_character_usage",
      messageKey: "studio.aiAssistant.storyHealth.lowCharacterUsage",
      severity: "info",
    });
  }

  return {
    score: intelligence.storyHealthScore,
    factors: intelligence.healthFactors,
    advisories,
  };
}
