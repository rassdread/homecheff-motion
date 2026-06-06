/**
 * Studio V2 — unified consistency overview adapter.
 * Aggregates existing readiness/quality helpers; no new scoring engine.
 */

import { buildStudioProductionInsights } from "@/lib/studio-production-insights";
import { buildStoryboardAssetEvolution } from "@/lib/studio-asset-evolution";
import {
  analyzeShotPlanConsistency,
  buildCurrentStoryboardShotPlan,
} from "@/lib/studio-shot-planner";
import {
  buildSceneImageReadiness,
  buildVisualProductionSummary,
  enrichVisualProductionSummary,
} from "@/lib/studio-visual-production-summary";
import { analyzeSceneImagePlanner } from "@/lib/studio-scene-image-planner";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import { buildMusicDirectorPlan, isMusicPlanReady } from "@/lib/studio-music-director";
import { buildSoundDirectorPlan, isSoundPlanReady } from "@/lib/studio-sound-director";
import {
  buildVoiceIdentityPlan,
  isVoiceIdentityPlanReady,
} from "@/lib/studio-voice-identity-director";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { RenderReadinessSummary } from "@/lib/studio-render-readiness-summary";
import type { StudioCharacterListItem, StudioLocationListItem, StudioPropListItem, StudioStoryboardDetail, StudioWorldProfileListItem } from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

export type ConsistencyLevel = "ready" | "almost_ready" | "needs_work";

export type ConsistencyDomainId =
  | "story"
  | "visual"
  | "characters"
  | "locations"
  | "props"
  | "voice"
  | "audio"
  | "render";

export type ConsistencyDomain = {
  id: ConsistencyDomainId;
  score: number;
  level: ConsistencyLevel;
  recommendationKeys: string[];
};

export type StudioConsistencyOverview = {
  overallScore: number;
  overallLevel: ConsistencyLevel;
  renderReadiness: RenderReadinessSummary;
  domains: ConsistencyDomain[];
};

const WARNING_TO_REC: Record<string, string> = {
  scene_missing_characters: "studio.consistency.rec.characters",
  location_unassigned: "studio.consistency.rec.locations",
  location_jump: "studio.consistency.rec.locationContinuity",
  prop_drops: "studio.consistency.rec.props",
  character_disappears: "studio.consistency.rec.characterContinuity",
  mascot_disappears: "studio.consistency.rec.mascot",
};

export function levelFromScore(score: number): ConsistencyLevel {
  if (score >= 85) {
    return "ready";
  }
  if (score >= 55) {
    return "almost_ready";
  }
  return "needs_work";
}

function audioLaneScore(enabled: boolean, ready: boolean, hasPartial: boolean): number {
  if (!enabled) {
    return 100;
  }
  if (ready) {
    return 100;
  }
  if (hasPartial) {
    return 65;
  }
  return 40;
}

export function buildStudioConsistencyOverview(params: {
  storyboard: StudioStoryboardDetail;
  characters?: StudioCharacterListItem[];
  locations?: StudioLocationListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
  memory?: StudioProjectMemorySnapshot;
  styleProfile?: string;
  directorProfile?: string;
}): StudioConsistencyOverview {
  const cast = params.characters ?? [];
  const locations = params.locations ?? [];
  const propsList = params.props ?? [];
  const worlds = params.worlds ?? [];
  const styleProfile = normalizeStudioPromptStyleProfile(
    params.styleProfile ?? params.storyboard.promptStyleProfile
  );
  const directorProfile = normalizeStudioDirectorProfile(
    params.directorProfile ?? params.storyboard.directorProfile
  );

  const insights = buildStudioProductionInsights(params.storyboard, cast);
  const imageReadiness = buildSceneImageReadiness({
    storyboard: params.storyboard,
    styleProfile,
    directorProfile,
  });
  const visualSummary = enrichVisualProductionSummary(
    buildVisualProductionSummary(params.storyboard),
    params.storyboard,
    styleProfile,
    directorProfile
  );
  const imagePlan = analyzeSceneImagePlanner({
    storyboard: params.storyboard,
    styleProfile,
    directorProfile,
  });

  const sceneCount = visualSummary.sceneCount;
  const locationWarnings = imagePlan.warnings.filter(
    (w) => w.code === "location_jump" || w.code === "location_unassigned"
  );
  const propWarnings = imagePlan.warnings.filter((w) => w.code === "prop_drops");
  const characterWarnings = imagePlan.warnings.filter(
    (w) =>
      w.code === "scene_missing_characters" ||
      w.code === "character_disappears" ||
      w.code === "mascot_disappears"
  );

  let locationScore = 100;
  if (sceneCount > 0) {
    locationScore = Math.round(
      ((sceneCount - visualSummary.scenesMissingLocation) / sceneCount) * 100
    );
    locationScore = Math.max(0, locationScore - locationWarnings.length * 12);
  }

  let propsScore = 100;
  if (sceneCount > 0 && propWarnings.length > 0) {
    propsScore = Math.max(35, 100 - propWarnings.length * 15);
  }

  let characterScore = insights.consistency.overallScore;
  if (visualSummary.scenesMissingCharacters > 0 && sceneCount > 0) {
    const coverage = Math.round(
      ((sceneCount - visualSummary.scenesMissingCharacters) / sceneCount) * 100
    );
    characterScore = Math.round((characterScore + coverage) / 2);
  }
  if (characterWarnings.length > 0) {
    characterScore = Math.max(40, characterScore - characterWarnings.length * 10);
  }

  const voiceReport = analyzeVoiceDirector(params.storyboard);
  const voiceIdentityPlan = buildVoiceIdentityPlan(params.storyboard);
  let voiceScore = !params.storyboard.voiceEnabled ? 100 : voiceReport.voiceScore;
  if (params.storyboard.voiceEnabled && !isVoiceIdentityPlanReady(voiceIdentityPlan)) {
    voiceScore = Math.min(voiceScore, 65);
  }

  const musicPlan = buildMusicDirectorPlan(params.storyboard);
  const soundPlan = buildSoundDirectorPlan(params.storyboard);
  const musicScore = audioLaneScore(
    musicPlan.enabled,
    isMusicPlanReady(musicPlan),
    musicPlan.sceneCues.length > 0
  );
  const soundScore = audioLaneScore(
    soundPlan.enabled,
    isSoundPlanReady(soundPlan),
    soundPlan.sceneCues.length > 0
  );
  const audioScore = Math.round((musicScore + soundScore) / 2);

  const visualScore = Math.round(
    (imageReadiness.score + Math.min(100, visualSummary.visualConsistencyScore || imageReadiness.score)) /
      2
  );

  const storyRecs = insights.storyHealth.advisories
    .slice(0, 3)
    .map((a) => a.messageKey);
  const shotAdvice = analyzeShotPlanConsistency(buildCurrentStoryboardShotPlan(params.storyboard));
  for (const item of shotAdvice.slice(0, 2)) {
    storyRecs.push(item.messageKey);
  }

  const assetEvolution = buildStoryboardAssetEvolution({
    storyboard: params.storyboard,
    characters: cast,
    locations,
    props: propsList,
    worlds,
    memory: params.memory,
  });
  for (const section of assetEvolution.sections) {
    for (const entry of section.recommended.slice(0, 1)) {
      storyRecs.push(entry.reasonKeys[0] ?? "studio.assetEvolution.reuseRecommended");
    }
    for (const entry of section.missing.slice(0, 1)) {
      storyRecs.push(entry.reasonKeys[0] ?? "studio.assetEvolution.stillMissing");
    }
  }

  const domains: ConsistencyDomain[] = [
    {
      id: "story",
      score: insights.storyHealth.score,
      level: levelFromScore(insights.storyHealth.score),
      recommendationKeys: storyRecs,
    },
    {
      id: "visual",
      score: visualScore,
      level: imageReadiness.level,
      recommendationKeys: imageReadiness.recommendationKeys.slice(0, 4),
    },
    {
      id: "characters",
      score: characterScore,
      level: levelFromScore(characterScore),
      recommendationKeys: [
        ...characterWarnings
          .map((w) => WARNING_TO_REC[w.code])
          .filter((k): k is string => Boolean(k)),
        ...(insights.consistency.characters.some((c) => c.score < 75)
          ? ["studio.consistency.rec.characterProfiles"]
          : []),
      ].slice(0, 4),
    },
    {
      id: "locations",
      score: locationScore,
      level: levelFromScore(locationScore),
      recommendationKeys: locationWarnings
        .map((w) => WARNING_TO_REC[w.code])
        .filter((k): k is string => Boolean(k))
        .slice(0, 4),
    },
    {
      id: "props",
      score: propsScore,
      level: levelFromScore(propsScore),
      recommendationKeys: propWarnings.length > 0 ? ["studio.consistency.rec.props"] : [],
    },
    {
      id: "voice",
      score: voiceScore,
      level: levelFromScore(voiceScore),
      recommendationKeys:
        params.storyboard.voiceEnabled && voiceScore < 85
          ? ["studio.consistency.rec.voice"]
          : [],
    },
    {
      id: "audio",
      score: audioScore,
      level: levelFromScore(audioScore),
      recommendationKeys:
        audioScore < 85 ? ["studio.consistency.rec.audio"] : [],
    },
    {
      id: "render",
      score: insights.readiness.score,
      level: insights.readiness.level,
      recommendationKeys: insights.readiness.checks
        .filter((c) => !c.passed)
        .map((c) => {
          const map: Record<string, string> = {
            scenes: "studio.consistency.rec.scenes",
            images: "studio.consistency.rec.images",
            voice: "studio.consistency.rec.renderVoice",
            text_beats: "studio.consistency.rec.textBeats",
            emotion: "studio.consistency.rec.emotion",
          };
          return map[c.id];
        })
        .filter((k): k is string => Boolean(k)),
    },
  ];

  const overallScore = Math.round(
    domains.reduce((sum, d) => sum + d.score, 0) / domains.length
  );

  return {
    overallScore,
    overallLevel: levelFromScore(overallScore),
    renderReadiness: insights.readiness,
    domains,
  };
}
