/**
 * Studio V25 — story intelligence orchestrator (arc, plan, energy, health, warnings).
 */

import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import { buildAutoShotPlan, type ShotPlanRecommendation } from "@/lib/studio-auto-shot-planner";
import {
  analyzeEnergyCurve,
  buildEnergyCurve,
  type EnergyCurvePoint,
  type EnergyCurveWarning,
} from "@/lib/studio-energy-curve";
import {
  analyzeStoryFlow,
  buildCameraTimeline,
  type StoryFlowAnalysis,
  type StoryFlowSceneInput,
} from "@/lib/studio-story-flow-analyzer";
import { buildStoryArc, climaxSceneIndex, type StoryArcEntry } from "@/lib/studio-story-arc";
import { computeStoryHealthScore, type StoryHealthFactors } from "@/lib/studio-story-health";
import {
  resolveSceneShotType,
  type StudioCameraMovement,
  type StudioShotType,
} from "@/lib/studio-scene-director";

export type StoryIntelligenceWarningCode =
  | "close_up_streak"
  | "early_climax_position"
  | "final_lacks_resolution"
  | "static_shot_engagement"
  | "flat_pacing"
  | "early_climax_energy"
  | "no_emotional_build"
  | "repetitive_energy";

export type StoryIntelligenceWarning = {
  code: StoryIntelligenceWarningCode | string;
  messageKey: string;
  sceneIds: string[];
};

export type TimelineChip = {
  sceneId: string;
  order: number;
  shotChipKey: string;
  movementChipKey: string;
  shotValue: string;
  movementValue: string;
};

export type StoryIntelligenceReport = {
  arc: StoryArcEntry[];
  flow: StoryFlowAnalysis;
  plan: ShotPlanRecommendation[];
  energyCurve: EnergyCurvePoint[];
  energyWarnings: EnergyCurveWarning[];
  timeline: ReturnType<typeof buildCameraTimeline>;
  chips: TimelineChip[];
  warnings: StoryIntelligenceWarning[];
  storyHealthScore: number;
  healthFactors: StoryHealthFactors;
  shotDiversityScore: number;
};

function shotChipKey(shot: StudioShotType | ""): string {
  if (!shot) {
    return "studio.intelligence.chip.unset";
  }
  return `studio.intelligence.chip.shot.${shot}`;
}

function movementChipKey(movement: StudioCameraMovement | ""): string {
  if (!movement) {
    return "studio.intelligence.chip.static";
  }
  return `studio.intelligence.chip.movement.${movement}`;
}

function findCloseUpStreak(scenes: StoryFlowSceneInput[]): { sceneIds: string[] } | null {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  const closeTypes = new Set(["close_up", "extreme_close_up", "medium_close_up"]);
  let streak: string[] = [];
  for (const scene of ordered) {
    const shot = resolveSceneShotType(scene.shotType, scene.camera);
    if (shot && closeTypes.has(shot)) {
      streak.push(scene.sceneId);
    } else {
      if (streak.length >= 3) {
        return { sceneIds: [...streak] };
      }
      streak = [];
    }
  }
  return streak.length >= 3 ? { sceneIds: streak } : null;
}

function findStaticStreak(scenes: StoryFlowSceneInput[]): { sceneIds: string[] } | null {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  let streak: string[] = [];
  for (const scene of ordered) {
    const movement = (scene.cameraMovement?.trim().toLowerCase() || "static") as string;
    if (movement === "static" || !scene.cameraMovement?.trim()) {
      streak.push(scene.sceneId);
    } else {
      if (streak.length >= 5) {
        return { sceneIds: [...streak] };
      }
      streak = [];
    }
  }
  return streak.length >= 5 ? { sceneIds: streak } : null;
}

function buildIntelligenceWarnings(
  scenes: StoryFlowSceneInput[],
  flow: StoryFlowAnalysis,
  energyWarnings: EnergyCurveWarning[]
): StoryIntelligenceWarning[] {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  const warnings: StoryIntelligenceWarning[] = [];

  for (const w of flow.warnings) {
    warnings.push({
      code: w.code,
      messageKey: w.messageKey,
      sceneIds: w.sceneIds,
    });
  }

  for (const w of energyWarnings) {
    warnings.push({
      code: w.code,
      messageKey: w.messageKey,
      sceneIds: w.sceneIds,
    });
  }

  const closeStreak = findCloseUpStreak(ordered);
  if (closeStreak) {
    warnings.push({
      code: "close_up_streak",
      messageKey: "studio.intelligence.warning.threeCloseUps",
      sceneIds: closeStreak.sceneIds,
    });
  }

  const climaxIdx = climaxSceneIndex(ordered);
  if (climaxIdx >= 0 && ordered.length >= 4 && climaxIdx < Math.floor(ordered.length * 0.35)) {
    warnings.push({
      code: "early_climax_position",
      messageKey: "studio.intelligence.warning.earlyClimaxPosition",
      sceneIds: ordered.slice(climaxIdx).map((s) => s.sceneId),
    });
  }

  if (ordered.length >= 2) {
    const lastArc = buildStoryArc(ordered);
    const lastPhase = lastArc[lastArc.length - 1]?.phase;
    if (lastPhase && lastPhase !== "resolution" && lastPhase !== "outro") {
      warnings.push({
        code: "final_lacks_resolution",
        messageKey: "studio.intelligence.warning.finalResolution",
        sceneIds: [ordered[ordered.length - 1]!.sceneId],
      });
    }
  }

  const staticStreak = findStaticStreak(ordered);
  if (staticStreak) {
    warnings.push({
      code: "static_shot_engagement",
      messageKey: "studio.intelligence.warning.fiveStatic",
      sceneIds: staticStreak.sceneIds,
    });
  }

  return warnings;
}

export function analyzeStoryIntelligence(
  scenes: StoryFlowSceneInput[],
  directorProfile: StudioDirectorProfile
): StoryIntelligenceReport {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  const arc = buildStoryArc(ordered);
  const plan = buildAutoShotPlan(ordered, directorProfile);
  const flow = analyzeStoryFlow(ordered);
  const energyCurve = buildEnergyCurve(ordered, plan);
  const energyWarnings = analyzeEnergyCurve(energyCurve);
  const warnings = buildIntelligenceWarnings(ordered, flow, energyWarnings);
  const uniquePhases = new Set(arc.map((a) => a.phase)).size;
  const { score, factors } = computeStoryHealthScore({
    flow,
    arcPhaseCount: uniquePhases,
    sceneCount: ordered.length,
    intelligenceWarnings: warnings,
    energyWarnings,
  });

  const chips: TimelineChip[] = flow.timeline.map((entry) => ({
    sceneId: entry.sceneId,
    order: entry.order,
    shotChipKey: shotChipKey(entry.shotValue as StudioShotType | ""),
    movementChipKey: movementChipKey(entry.movementValue as StudioCameraMovement | ""),
    shotValue: entry.shotValue,
    movementValue: entry.movementValue,
  }));

  return {
    arc,
    flow,
    plan,
    energyCurve,
    energyWarnings,
    timeline: flow.timeline,
    chips,
    warnings,
    storyHealthScore: score,
    healthFactors: factors,
    shotDiversityScore: flow.shotDiversityScore,
  };
}
