/**
 * Studio V26 — full AI direction package with reasoning and strength modifiers.
 */

import type { InterpretedDirectorStyle, AiDirectorStyleStrength } from "@/lib/studio-ai-director-interpreter";
import { interpretAiDirectorPrompt } from "@/lib/studio-ai-director-interpreter";
import {
  buildAutoShotPlan,
  type ShotPlanRecommendation,
} from "@/lib/studio-auto-shot-planner";
import { buildStoryArc, type StoryArcPhase } from "@/lib/studio-story-arc";
import type { StoryFlowSceneInput } from "@/lib/studio-story-flow-analyzer";
import { analyzeStoryIntelligence } from "@/lib/studio-story-intelligence";
import {
  type StudioCameraMovement,
  type StudioSceneEnergy,
  type StudioShotType,
  legacyCameraFromShotType,
} from "@/lib/studio-scene-director";

export type DirectorSceneReasoning = {
  sceneId: string;
  order: number;
  arcPhase: StoryArcPhase;
  shotType: StudioShotType;
  cameraMovement: StudioCameraMovement;
  sceneEnergy: StudioSceneEnergy;
  reasonKey: string;
};

export type AiDirectorDirection = {
  interpretation: InterpretedDirectorStyle;
  plan: ShotPlanRecommendation[];
  reasoning: DirectorSceneReasoning[];
  storyHealthScore: number;
  shotDiversityScore: number;
  styleConsistencyScore: number;
  directorQualityScore: number;
};

const ARC_REASON_KEYS: Record<StoryArcPhase, string> = {
  opening: "studio.aiDirector.reasoning.opening",
  discovery: "studio.aiDirector.reasoning.discovery",
  build_up: "studio.aiDirector.reasoning.buildUp",
  transition: "studio.aiDirector.reasoning.transition",
  climax: "studio.aiDirector.reasoning.climax",
  resolution: "studio.aiDirector.reasoning.resolution",
  outro: "studio.aiDirector.reasoning.outro",
};

function bumpEnergy(energy: StudioSceneEnergy, delta: number): StudioSceneEnergy {
  const order: StudioSceneEnergy[] = ["calm", "neutral", "dynamic", "intense"];
  const idx = order.indexOf(energy);
  const next = Math.max(0, Math.min(order.length - 1, idx + delta));
  return order[next]!;
}

function applyStrengthToPlan(
  plan: ShotPlanRecommendation[],
  strength: AiDirectorStyleStrength
): ShotPlanRecommendation[] {
  if (strength === "balanced") {
    return plan;
  }
  return plan.map((row) => {
    if (strength === "subtle") {
      return {
        ...row,
        sceneEnergy: bumpEnergy(row.sceneEnergy, -1),
        cameraMovement:
          row.cameraMovement === "crane" || row.cameraMovement === "orbit"
            ? "push_in"
            : row.cameraMovement === "tracking"
              ? "follow"
              : row.cameraMovement,
      };
    }
    return {
      ...row,
      sceneEnergy: bumpEnergy(row.sceneEnergy, 1),
      cameraMovement:
        row.arcPhase === "climax"
          ? "crane"
          : row.arcPhase === "discovery"
            ? "tracking"
            : row.cameraMovement,
      shotType:
        row.arcPhase === "climax" && row.shotType === "medium_close_up"
          ? "close_up"
          : row.shotType,
    };
  });
}

export function buildSceneReasoning(
  plan: ShotPlanRecommendation[],
  interpretation: InterpretedDirectorStyle
): DirectorSceneReasoning[] {
  return plan.map((row) => ({
    sceneId: row.sceneId,
    order: row.order,
    arcPhase: row.arcPhase,
    shotType: row.shotType,
    cameraMovement: row.cameraMovement,
    sceneEnergy: row.sceneEnergy,
    reasonKey: interpretation.matchedPresetKey
      ? "studio.aiDirector.reasoning.presetScene"
      : (ARC_REASON_KEYS[row.arcPhase] ?? "studio.aiDirector.reasoning.generic"),
  }));
}

export function computeStyleConsistencyScore(
  plan: ShotPlanRecommendation[],
  interpretation: InterpretedDirectorStyle
): number {
  if (plan.length === 0) {
    return 0;
  }
  const moods = new Set(interpretation.moodKeywords);
  let matches = 0;
  for (const row of plan) {
    let sceneMatch = 0;
    if (moods.has("energetic") && (row.sceneEnergy === "dynamic" || row.sceneEnergy === "intense")) {
      sceneMatch += 1;
    }
    if (moods.has("premium") && (row.sceneEnergy === "calm" || row.sceneEnergy === "neutral")) {
      sceneMatch += 1;
    }
    if (moods.has("emotional") && row.arcPhase === "climax") {
      sceneMatch += 1;
    }
    if (moods.has("cinematic") && row.shotType !== "detail_shot") {
      sceneMatch += 1;
    }
    if (moods.has("inspirational") && (row.arcPhase === "climax" || row.arcPhase === "build_up")) {
      sceneMatch += 1;
    }
    if (sceneMatch > 0) {
      matches += 1;
    }
  }
  const profileBonus = rowMatchesDirectorProfile(plan, interpretation.directorProfile) ? 15 : 0;
  const ratio = matches / plan.length;
  return Math.max(0, Math.min(100, Math.round(ratio * 85) + profileBonus));
}

function rowMatchesDirectorProfile(
  plan: ShotPlanRecommendation[],
  profile: InterpretedDirectorStyle["directorProfile"]
): boolean {
  if (profile === "documentary") {
    return plan.filter((r) => r.cameraMovement === "static" || r.cameraMovement === "follow").length >=
      plan.length * 0.4;
  }
  if (profile === "social_media") {
    return plan.some((r) => r.sceneEnergy === "dynamic" || r.sceneEnergy === "intense");
  }
  return true;
}

export function computeDirectorQualityScore(params: {
  shotDiversityScore: number;
  storyHealthScore: number;
  styleConsistencyScore: number;
  energyFlowScore: number;
}): number {
  const raw =
    params.shotDiversityScore * 0.22 +
    params.storyHealthScore * 0.28 +
    params.styleConsistencyScore * 0.25 +
    params.energyFlowScore * 0.25;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function buildAiDirectorDirection(params: {
  scenes: StoryFlowSceneInput[];
  prompt: string;
  styleStrength: AiDirectorStyleStrength;
}): AiDirectorDirection {
  const interpretation = interpretAiDirectorPrompt(params.prompt);
  const basePlan = buildAutoShotPlan(params.scenes, interpretation.directorProfile);
  const plan = applyStrengthToPlan(basePlan, params.styleStrength).map((row) => ({
    ...row,
    legacyCamera: legacyCameraFromShotType(row.shotType) ?? row.legacyCamera,
  }));
  const reasoning = buildSceneReasoning(plan, interpretation);
  const intelligence = analyzeStoryIntelligence(params.scenes, interpretation.directorProfile);
  const styleConsistencyScore = computeStyleConsistencyScore(plan, interpretation);
  const directorQualityScore = computeDirectorQualityScore({
    shotDiversityScore: intelligence.shotDiversityScore,
    storyHealthScore: intelligence.storyHealthScore,
    styleConsistencyScore,
    energyFlowScore: intelligence.healthFactors.energyFlow,
  });

  return {
    interpretation,
    plan,
    reasoning,
    storyHealthScore: intelligence.storyHealthScore,
    shotDiversityScore: intelligence.shotDiversityScore,
    styleConsistencyScore,
    directorQualityScore,
  };
}

export function planFromCurrentScenes(scenes: StoryFlowSceneInput[]): ShotPlanRecommendation[] {
  const arc = buildStoryArc(scenes);
  const arcById = new Map(arc.map((e) => [e.sceneId, e.phase]));
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  return ordered.map((scene) => {
    const shot = (scene.shotType?.trim() || "medium") as StudioShotType;
    return {
      sceneId: scene.sceneId,
      order: scene.order,
      title: scene.title,
      arcPhase: arcById.get(scene.sceneId) ?? ("build_up" as StoryArcPhase),
      shotType: shot,
      cameraMovement: (scene.cameraMovement?.trim() || "static") as StudioCameraMovement,
      sceneEnergy: (scene.sceneEnergy?.trim() || "neutral") as StudioSceneEnergy,
      legacyCamera: scene.camera?.trim() || legacyCameraFromShotType(shot) || "",
      rationaleKey: "studio.aiDirector.reasoning.current",
    };
  });
}
