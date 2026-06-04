/**
 * Studio V25 — composite story health score (0–100).
 */

import type { StoryFlowAnalysis } from "@/lib/studio-story-flow-analyzer";
import type { EnergyCurveWarning } from "@/lib/studio-energy-curve";
import type { StoryIntelligenceWarning } from "@/lib/studio-story-intelligence";

export type StoryHealthFactors = {
  shotDiversity: number;
  movementDiversity: number;
  narrativeProgression: number;
  energyFlow: number;
  sceneVariety: number;
};

export function computeMovementDiversityScore(
  uniqueMovements: number,
  sceneCount: number,
  definedMovementCount: number
): number {
  if (sceneCount === 0 || definedMovementCount === 0) {
    return 0;
  }
  const ratio = uniqueMovements / definedMovementCount;
  const coverage = definedMovementCount / sceneCount;
  return Math.round(Math.min(100, ratio * 85 + coverage * 15));
}

export function computeNarrativeProgressionScore(arcPhaseCount: number, sceneCount: number): number {
  if (sceneCount <= 1) {
    return 50;
  }
  const ideal = Math.min(5, sceneCount);
  const ratio = Math.min(1, arcPhaseCount / ideal);
  return Math.round(40 + ratio * 60);
}

export function computeEnergyFlowScore(
  energyWarnings: Array<EnergyCurveWarning | StoryIntelligenceWarning>
): number {
  const penalty =
    energyWarnings.filter((w) =>
      ["flat_pacing", "early_climax_energy", "no_emotional_build", "repetitive_energy"].includes(
        w.code
      )
    ).length * 18;
  return Math.max(0, 100 - penalty);
}

export function computeSceneVarietyScore(
  uniqueShots: number,
  uniqueMovements: number,
  uniqueEnergies: number,
  sceneCount: number
): number {
  if (sceneCount === 0) {
    return 0;
  }
  const combined = uniqueShots + uniqueMovements + uniqueEnergies;
  const maxCombined = sceneCount * 3;
  return Math.round((combined / Math.max(1, maxCombined)) * 100);
}

export function computeStoryHealthScore(params: {
  flow: StoryFlowAnalysis;
  arcPhaseCount: number;
  sceneCount: number;
  intelligenceWarnings: StoryIntelligenceWarning[];
  energyWarnings: EnergyCurveWarning[];
}): { score: number; factors: StoryHealthFactors } {
  const { flow, arcPhaseCount, sceneCount, intelligenceWarnings, energyWarnings } = params;
  const definedMovements = flow.timeline.filter((e) => e.movementValue).length;

  const factors: StoryHealthFactors = {
    shotDiversity: flow.shotDiversityScore,
    movementDiversity: computeMovementDiversityScore(
      flow.uniqueMovements,
      sceneCount,
      definedMovements
    ),
    narrativeProgression: computeNarrativeProgressionScore(arcPhaseCount, sceneCount),
    energyFlow: computeEnergyFlowScore([...energyWarnings, ...intelligenceWarnings]),
    sceneVariety: computeSceneVarietyScore(
      flow.uniqueShots,
      flow.uniqueMovements,
      flow.uniqueEnergies,
      sceneCount
    ),
  };

  const warningPenalty = Math.min(35, intelligenceWarnings.length * 8);
  const raw =
    factors.shotDiversity * 0.25 +
    factors.movementDiversity * 0.2 +
    factors.narrativeProgression * 0.2 +
    factors.energyFlow * 0.2 +
    factors.sceneVariety * 0.15 -
    warningPenalty;

  return {
    score: Math.max(0, Math.min(100, Math.round(raw))),
    factors,
  };
}
