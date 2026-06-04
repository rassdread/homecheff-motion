/**
 * Studio V25 — story energy curve (LOW / MEDIUM / HIGH) and pacing warnings.
 */

import type { StoryFlowSceneInput } from "@/lib/studio-story-flow-analyzer";
import {
  normalizeStudioSceneEnergy,
  type StudioSceneEnergy,
} from "@/lib/studio-scene-director";
import type { ShotPlanRecommendation } from "@/lib/studio-auto-shot-planner";
import { detectArcPhaseForIndex } from "@/lib/studio-story-arc";

export const ENERGY_LEVELS = ["low", "medium", "high"] as const;
export type EnergyLevel = (typeof ENERGY_LEVELS)[number];

export type EnergyCurvePoint = {
  sceneId: string;
  order: number;
  title: string;
  level: EnergyLevel;
  sceneEnergy: StudioSceneEnergy;
};

export type EnergyCurveWarningCode =
  | "flat_pacing"
  | "early_climax_energy"
  | "no_emotional_build"
  | "repetitive_energy";

export type EnergyCurveWarning = {
  code: EnergyCurveWarningCode;
  messageKey: string;
  sceneIds: string[];
};

export function energyLevelFromSceneEnergy(energy: StudioSceneEnergy): EnergyLevel {
  switch (energy) {
    case "calm":
      return "low";
    case "neutral":
      return "medium";
    case "dynamic":
      return "medium";
    case "intense":
      return "high";
    default:
      return "medium";
  }
}

export function energyFromArcPhase(index: number, sceneCount: number): StudioSceneEnergy {
  const phase = detectArcPhaseForIndex(index, sceneCount);
  switch (phase) {
    case "opening":
    case "resolution":
    case "outro":
      return "calm";
    case "discovery":
    case "build_up":
      return "neutral";
    case "transition":
      return "dynamic";
    case "climax":
      return "intense";
    default:
      return "neutral";
  }
}

export function buildEnergyCurve(
  scenes: StoryFlowSceneInput[],
  plan?: ShotPlanRecommendation[]
): EnergyCurvePoint[] {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  const planById = new Map(plan?.map((row) => [row.sceneId, row]) ?? []);
  return ordered.map((scene, index) => {
    const planned = planById.get(scene.sceneId);
    const sceneEnergy = planned
      ? planned.sceneEnergy
      : normalizeStudioSceneEnergy(scene.sceneEnergy);
    return {
      sceneId: scene.sceneId,
      order: scene.order,
      title: scene.title,
      level: energyLevelFromSceneEnergy(sceneEnergy),
      sceneEnergy,
    };
  });
}

export function analyzeEnergyCurve(points: EnergyCurvePoint[]): EnergyCurveWarning[] {
  const warnings: EnergyCurveWarning[] = [];
  if (points.length < 2) {
    return warnings;
  }

  const levels = points.map((p) => p.level);
  const uniqueLevels = new Set(levels);
  if (uniqueLevels.size <= 1) {
    warnings.push({
      code: "flat_pacing",
      messageKey: "studio.intelligence.warning.flatPacing",
      sceneIds: points.map((p) => p.sceneId),
    });
  }

  const firstHigh = points.findIndex((p) => p.level === "high");
  if (firstHigh >= 0 && firstHigh < Math.floor(points.length * 0.35)) {
    warnings.push({
      code: "early_climax_energy",
      messageKey: "studio.intelligence.warning.earlyClimax",
      sceneIds: points.slice(firstHigh).map((p) => p.sceneId),
    });
  }

  const hasBuild =
    levels.slice(0, Math.max(1, Math.floor(points.length * 0.5))).some((l) => l === "medium") ||
    levels.some((l, i) => i > 0 && l === "medium" && levels[i - 1] === "low");
  const hasHigh = levels.includes("high");
  if (points.length >= 4 && hasHigh && !hasBuild) {
    warnings.push({
      code: "no_emotional_build",
      messageKey: "studio.intelligence.warning.noBuildUp",
      sceneIds: points.map((p) => p.sceneId),
    });
  }

  const energyStreak = (() => {
    let streak = 1;
    let streakEnergy = points[0]!.sceneEnergy;
    const streakIds = [points[0]!.sceneId];
    for (let i = 1; i < points.length; i++) {
      const point = points[i]!;
      if (point.sceneEnergy === streakEnergy) {
        streak += 1;
        streakIds.push(point.sceneId);
      } else {
        if (streak >= 3) {
          return streakIds;
        }
        streak = 1;
        streakEnergy = point.sceneEnergy;
        streakIds.length = 0;
        streakIds.push(point.sceneId);
      }
    }
    return streak >= 3 ? streakIds : null;
  })();
  if (energyStreak) {
    warnings.push({
      code: "repetitive_energy",
      messageKey: "studio.intelligence.warning.repetitiveEnergy",
      sceneIds: energyStreak,
    });
  }

  return warnings;
}
