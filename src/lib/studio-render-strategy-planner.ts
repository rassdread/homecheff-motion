/**
 * Studio V2 — Render Strategy Planner.
 * Advises story vs action_chain vs hybrid using existing Studio signals (no render execution).
 */

import { resolveInstantPremiumOutputPlan } from "@/lib/instant-premium-output-plan";
import { buildStoryboardActionShotDistribution } from "@/lib/studio-action-shot-distribution";
import { buildStoryboardActionIntelligence } from "@/lib/studio-character-capabilities";
import { buildStoryboardIdentityConsumption } from "@/lib/studio-identity-consumption";
import { buildWorldIdentityRenderStrategyHints } from "@/lib/studio-world-identity-visual-hints";
import { sceneHasCompletedImage } from "@/lib/studio-movie-scene-image";
import {
  actionVerbPatternsAsRegex,
  countDistinctActionCapabilities,
  extractActionSteps,
} from "@/lib/studio-scene-action-extraction";
import { buildCurrentStoryboardShotPlan } from "@/lib/studio-shot-planner";
import { parseWorldRenderStrategies } from "@/lib/studio-world-identity-structured";
import type {
  ActionComplexityLevel,
  RenderStrategyConfidence,
  RenderStrategyImageRequirement,
  RenderStrategyReason,
  RenderStrategySceneAssignment,
  RenderStrategyShotSplitSuggestion,
  StudioRenderStrategy,
  StudioRenderStrategyPlan,
  StudioRenderStrategyPlanInput,
} from "@/types/studio-render-strategy";
import type { StudioSceneDetail } from "@/types/studio-api";
import {
  productionMemoryRenderReasons,
  resolveProductionMemoryProfile,
} from "@/lib/studio-production-memory-integration";

const ACTION_VERB_PATTERNS = actionVerbPatternsAsRegex();

const STORY_SIGNALS =
  /\b(campaign|campagne|promo|community|verhaal|story|intro|outro|sfeer|atmosphere|montage|brand|merk)\b/i;

const CALM_ACTIONS =
  /\b(present|presenteren|explain|uitleg|show|tonen|introduce|welkom|welcome|talk|praat)\b/i;

type SceneActionAnalysis = {
  sceneId: string;
  order: number;
  title: string;
  action: string;
  complexity: ActionComplexityLevel;
  complexityScore: number;
  actionSteps: string[];
};

function countActionVerbs(text: string): number {
  let count = 0;
  for (const pattern of ACTION_VERB_PATTERNS) {
    if (pattern.test(text)) {
      count += 1;
    }
  }
  return count;
}

function analyzeSceneAction(
  scene: StudioSceneDetail,
  capabilityActionCount?: number
): SceneActionAnalysis {
  const combined = [scene.action, scene.description, scene.title].filter(Boolean).join(" ");
  const steps = extractActionSteps(combined);
  const verbCount = countActionVerbs(combined);
  const distinctCapabilities = countDistinctActionCapabilities(combined);
  const stepCount = Math.max(steps.length, verbCount, distinctCapabilities, capabilityActionCount ?? 0);

  let complexity: ActionComplexityLevel = "low";
  let complexityScore = stepCount;
  if (stepCount >= 3 || verbCount >= 3) {
    complexity = "high";
    complexityScore = Math.max(stepCount, verbCount, 3);
  } else if (stepCount >= 2 || verbCount >= 2) {
    complexity = "medium";
    complexityScore = 2;
  }

  return {
    sceneId: scene.id,
    order: scene.order,
    title: scene.title,
    action: scene.action.trim() || scene.description.trim(),
    complexity,
    complexityScore,
    actionSteps: steps.length >= 2 ? steps : steps,
  };
}

function aggregateActionComplexity(
  analyses: SceneActionAnalysis[]
): { level: ActionComplexityLevel; score: number } {
  if (analyses.length === 0) {
    return { level: "low", score: 0 };
  }
  const maxScore = Math.max(...analyses.map((a) => a.complexityScore));
  const highCount = analyses.filter((a) => a.complexity === "high").length;
  if (maxScore >= 3 || highCount >= 1) {
    return { level: "high", score: maxScore };
  }
  if (maxScore >= 2) {
    return { level: "medium", score: maxScore };
  }
  return { level: "low", score: maxScore };
}

function worldStrategyBias(worlds: StudioRenderStrategyPlanInput["worlds"]): {
  story: number;
  action: number;
  hybrid: number;
} {
  const scores = { story: 0, action: 0, hybrid: 0 };
  for (const world of worlds ?? []) {
    const strategies = parseWorldRenderStrategies(world.continuityRules);
    if (strategies.includes("multi_image")) scores.story += 2;
    if (strategies.includes("start_end")) scores.action += 2;
    if (strategies.includes("hybrid")) scores.hybrid += 2;
    if (strategies.includes("shot_split")) scores.action += 1;
    if (/sports_universe|hc:world=sports/i.test(world.visualStyle + world.continuityRules)) {
      scores.action += 1;
    }
  }
  return scores;
}

function classifyStrategy(params: {
  scenes: StudioSceneDetail[];
  analyses: SceneActionAnalysis[];
  worldBias: ReturnType<typeof worldStrategyBias>;
  shotDiversityScore: number;
}): {
  strategy: StudioRenderStrategy;
  confidenceScore: number;
  reasons: RenderStrategyReason[];
  sceneAssignments: RenderStrategySceneAssignment[];
} {
  const { scenes, analyses, worldBias, shotDiversityScore } = params;
  const sceneCount = scenes.length;
  const storyText = scenes.map((s) => `${s.title} ${s.description} ${s.action}`).join(" ");
  const highScenes = analyses.filter((a) => a.complexity === "high");
  const lowScenes = analyses.filter((a) => a.complexity === "low");

  let storyScore = worldBias.story;
  let actionScore = worldBias.action;
  let hybridScore = worldBias.hybrid;

  if (sceneCount >= 3 && highScenes.length <= 1) {
    storyScore += 3;
  }
  if (sceneCount >= 2 && highScenes.length === 0) {
    storyScore += 2;
  }
  if (STORY_SIGNALS.test(storyText) && highScenes.length === 0) {
    storyScore += 2;
  }
  if (shotDiversityScore >= 0.45 && sceneCount >= 3) {
    storyScore += 1;
  }

  if (highScenes.length >= 1) {
    actionScore += 3;
  }
  if (sceneCount === 1 && highScenes.length === 1) {
    actionScore += 3;
  }
  if (highScenes.length >= 2) {
    actionScore += 2;
  }

  if (sceneCount >= 3 && lowScenes.length >= 1 && highScenes.length >= 1) {
    const first = analyses[0];
    const last = analyses[analyses.length - 1];
    const middle = analyses.slice(1, -1);
    if (
      first &&
      last &&
      (first.complexity === "low" || CALM_ACTIONS.test(first.action)) &&
      middle.some((m) => m.complexity === "high") &&
      (last.complexity !== "high" || CALM_ACTIONS.test(last.action))
    ) {
      hybridScore += 4;
    }
  }
  if (sceneCount >= 4 && highScenes.length >= 1 && highScenes.length < sceneCount) {
    hybridScore += 2;
  }

  const scores = [
    { strategy: "story" as const, score: storyScore },
    { strategy: "action_chain" as const, score: actionScore },
    { strategy: "hybrid" as const, score: hybridScore },
  ].sort((a, b) => b.score - a.score);

  const top = scores[0]!;
  const second = scores[1]!;
  let strategy = top.strategy;
  if (top.score === second.score && top.score > 0) {
    strategy = hybridScore >= top.score ? "hybrid" : top.strategy;
  }
  if (top.score === 0) {
    strategy = sceneCount >= 2 ? "story" : "action_chain";
  }

  const confidenceScore = Math.min(100, Math.max(35, top.score * 18 + (top.score - second.score) * 8));

  const reasons: RenderStrategyReason[] = [];
  if (strategy === "story") {
    reasons.push({
      id: "story-flow",
      reasonKey: "studio.renderStrategy.reason.storyFlow",
    });
    if (sceneCount >= 3) {
      reasons.push({
        id: "multi-scene",
        reasonKey: "studio.renderStrategy.reason.multiScene",
        reasonParams: { count: String(sceneCount) },
      });
    }
  } else if (strategy === "action_chain") {
    reasons.push({
      id: "action-sequence",
      reasonKey: "studio.renderStrategy.reason.actionSequence",
    });
    if (highScenes.length > 0) {
      reasons.push({
        id: "high-complexity",
        reasonKey: "studio.renderStrategy.reason.highComplexity",
        reasonParams: { count: String(highScenes.length) },
      });
    }
  } else {
    reasons.push({
      id: "hybrid-mix",
      reasonKey: "studio.renderStrategy.reason.hybridMix",
    });
  }

  if (worldBias.action > 0 && strategy === "action_chain") {
    reasons.push({ id: "world-action", reasonKey: "studio.renderStrategy.reason.worldActionRules" });
  }
  if (worldBias.story > 0 && strategy === "story") {
    reasons.push({ id: "world-story", reasonKey: "studio.renderStrategy.reason.worldStoryRules" });
  }

  const sceneAssignments: RenderStrategySceneAssignment[] = analyses.map((a, index) => {
    let sceneStrategy: StudioRenderStrategy = strategy;
    if (strategy === "hybrid") {
      if (index === 0 || index === analyses.length - 1) {
        sceneStrategy = a.complexity === "high" ? "action_chain" : "story";
      } else {
        sceneStrategy = a.complexity === "high" ? "action_chain" : "story";
      }
    }
    return {
      sceneId: a.sceneId,
      order: a.order,
      title: a.title,
      strategy: sceneStrategy,
      actionComplexity: a.complexity,
    };
  });

  return { strategy, confidenceScore, reasons, sceneAssignments };
}

function buildShotSplitSuggestions(
  distributions: ReturnType<typeof buildStoryboardActionShotDistribution>["scenes"]
): RenderStrategyShotSplitSuggestion[] {
  const suggestions: RenderStrategyShotSplitSuggestion[] = [];
  for (const dist of distributions) {
    if (!dist.suggestsMultipleShots || dist.beats.length < 2) {
      continue;
    }
    suggestions.push({
      sceneId: dist.sceneId,
      sceneOrder: dist.sceneOrder,
      sceneTitle: dist.sceneTitle,
      originalAction: dist.actionChain.actionText,
      suggestedShotCount: dist.recommendedShotCount,
      suggestedShots: dist.beats.map((beat) => ({
        order: beat.order,
        labelKey: beat.labelKey,
        actionHint: beat.actionHint,
      })),
      reasonKey: "studio.renderStrategy.shotSplit.multiAction",
      previewOnly: true,
    });
  }
  return suggestions;
}

function buildImageRequirements(params: {
  scenes: StudioSceneDetail[];
  strategy: StudioRenderStrategy;
  sceneAssignments: RenderStrategySceneAssignment[];
}): RenderStrategyImageRequirement[] {
  const requirements: RenderStrategyImageRequirement[] = [];

  for (const scene of params.scenes) {
    const hasImage = sceneHasCompletedImage(scene);
    const assignment = params.sceneAssignments.find((a) => a.sceneId === scene.id);
    const sceneStrategy =
      params.strategy === "hybrid"
        ? (assignment?.strategy ?? "story")
        : params.strategy;

    if (sceneStrategy === "story") {
      requirements.push({
        sceneId: scene.id,
        sceneOrder: scene.order,
        sceneTitle: scene.title,
        role: "scene_still",
        status: hasImage ? "present" : "missing",
        labelKey: "studio.renderStrategy.image.sceneStill",
      });
      continue;
    }

    requirements.push({
      sceneId: scene.id,
      sceneOrder: scene.order,
      sceneTitle: scene.title,
      role: "start_frame",
      status: hasImage ? "present" : "missing",
      labelKey: "studio.renderStrategy.image.startFrame",
    });
    requirements.push({
      sceneId: scene.id,
      sceneOrder: scene.order,
      sceneTitle: scene.title,
      role: "end_frame",
      status: hasImage ? "recommended" : "missing",
      labelKey: "studio.renderStrategy.image.endFrame",
    });
  }

  return requirements;
}

function confidenceFromScore(score: number): RenderStrategyConfidence {
  if (score >= 75) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function strategyLabelKey(strategy: StudioRenderStrategy): string {
  switch (strategy) {
    case "story":
      return "studio.renderStrategy.approach.story";
    case "action_chain":
      return "studio.renderStrategy.approach.actionChain";
    case "hybrid":
      return "studio.renderStrategy.approach.hybrid";
  }
}

function strategyExplanationKey(strategy: StudioRenderStrategy): string {
  switch (strategy) {
    case "story":
      return "studio.renderStrategy.explain.story";
    case "action_chain":
      return "studio.renderStrategy.explain.actionChain";
    case "hybrid":
      return "studio.renderStrategy.explain.hybrid";
  }
}

function internalInstantMode(strategy: StudioRenderStrategy): "story" | "transition" {
  return strategy === "story" ? "story" : "transition";
}

export function buildStudioRenderStrategyPlan(
  input: StudioRenderStrategyPlanInput
): StudioRenderStrategyPlan {
  const scenes = [...input.storyboard.scenes].sort((a, b) => a.order - b.order);
  const actionShotDistribution = buildStoryboardActionShotDistribution({
    storyboard: input.storyboard,
    characters: input.characters,
    props: input.props,
    worlds: input.worlds,
  });
  const actionIntelligence = buildStoryboardActionIntelligence({
    storyboard: input.storyboard,
    characters: input.characters ?? [],
    props: input.props,
    worlds: input.worlds,
  });
  const capabilityCountByScene = new Map(
    actionIntelligence.sceneClassifications.map((c) => [
      c.sceneId,
      c.actions.filter((a) => a.capabilityId).length,
    ])
  );
  const analyses = scenes.map((scene) =>
    analyzeSceneAction(scene, capabilityCountByScene.get(scene.id))
  );
  const { level: actionComplexity, score: actionComplexityScore } =
    aggregateActionComplexity(analyses);

  const shotPlan = buildCurrentStoryboardShotPlan(input.storyboard);
  const worldBias = worldStrategyBias(input.worlds);

  const { strategy, confidenceScore, reasons, sceneAssignments } = classifyStrategy({
    scenes,
    analyses,
    worldBias,
    shotDiversityScore: shotPlan.shotDiversityScore,
  });

  const imageReadyCount = scenes.filter((s) => sceneHasCompletedImage(s)).length;
  const imageCount = Math.max(imageReadyCount, scenes.length, 2);

  const internalMode = internalInstantMode(strategy);
  const outputPlan = resolveInstantPremiumOutputPlan({
    imageCount: Math.min(strategy === "story" ? 9 : 5, imageCount),
    instantMode: internalMode,
    transitionSeconds: 5,
  });

  const estimatedFinalDurationSeconds =
    input.desiredFinalDurationSeconds ??
    (scenes.reduce((sum, s) => sum + (s.durationSeconds > 0 ? s.durationSeconds : 5), 0) ||
      outputPlan.storyboardDurationSeconds);

  const estimatedProviderDurationSeconds = outputPlan.providerDurationSeconds;

  let suggestedSpeedAdjustment: number | null = null;
  const speedAdviceOnly = true;
  if (
    estimatedProviderDurationSeconds > estimatedFinalDurationSeconds * 1.05 &&
    estimatedFinalDurationSeconds > 0
  ) {
    suggestedSpeedAdjustment =
      Math.round((estimatedProviderDurationSeconds / estimatedFinalDurationSeconds) * 100) / 100;
  }

  const imageRequirements = buildImageRequirements({
    scenes,
    strategy,
    sceneAssignments,
  });
  const requiredImageCount = imageRequirements.filter(
    (r) => r.status !== "recommended"
  ).length;
  const presentImageCount = imageRequirements.filter((r) => r.status === "present").length;
  const missingImageCount = imageRequirements.filter((r) => r.status === "missing").length;

  const suggestedShotSplitting = buildShotSplitSuggestions(actionShotDistribution.scenes);

  const warnings: RenderStrategyReason[] = [];
  if (missingImageCount > 0) {
    warnings.push({
      id: "missing-images",
      reasonKey: "studio.renderStrategy.warning.missingImages",
      reasonParams: { count: String(missingImageCount) },
    });
  }
  if (suggestedShotSplitting.length > 0) {
    warnings.push({
      id: "split-advice",
      reasonKey: "studio.renderStrategy.warning.splitAdvice",
    });
  }
  if (scenes.length < 2) {
    warnings.push({
      id: "few-scenes",
      reasonKey: "studio.renderStrategy.warning.fewScenes",
    });
  }

  if (actionShotDistribution.scenesNeedingSplit > 0) {
    warnings.push({
      id: "duration-mismatch",
      reasonKey: "studio.actionSequence.warning.durationMismatch",
      reasonParams: { count: String(actionShotDistribution.scenesNeedingSplit) },
    });
  }

  if (input.worlds?.length) {
    const consumption = buildStoryboardIdentityConsumption({
      storyboard: input.storyboard,
      libraries: {
        characters: input.characters ?? [],
        locations: input.locations ?? [],
        props: input.props ?? [],
        worlds: input.worlds,
      },
    });
    if (consumption.dominantWorldName) {
      reasons.push({
        id: "identity-world",
        reasonKey: "studio.renderStrategy.reason.identityWorld",
        reasonParams: { name: consumption.dominantWorldName },
      });
    }
    for (const world of input.worlds ?? []) {
      const hints = buildWorldIdentityRenderStrategyHints(world);
      if (hints.length > 0) {
        reasons.push({
          id: `world-render-strategy-${world.id}`,
          reasonKey: "studio.renderStrategy.reason.worldRenderStrategy",
          reasonParams: { name: world.name, hint: hints[0]!.replace(/^Render strategy: /, "").replace(/\.$/, "") },
        });
      }
    }
  }

  const memoryProfile = resolveProductionMemoryProfile({
    projectMemory: input.projectMemory,
    currentIdea: input.storyboard.aiDirectorPrompt,
    characters: input.characters,
    worlds: input.worlds,
  });
  for (const memoryReason of productionMemoryRenderReasons(memoryProfile)) {
    reasons.push(memoryReason);
  }

  return {
    recommendedStrategy: strategy,
    confidence: confidenceFromScore(confidenceScore),
    confidenceScore,
    reasons,
    warnings,
    actionComplexity,
    actionComplexityScore,
    estimatedProviderDurationSeconds,
    estimatedFinalDurationSeconds,
    suggestedSpeedAdjustment,
    speedAdviceOnly,
    suggestedShotSplitting,
    imageRequirements,
    requiredImageCount,
    presentImageCount,
    missingImageCount,
    sceneAssignments,
    internalInstantMode: internalMode,
    strategyLabelKey: strategyLabelKey(strategy),
    strategyExplanationKey: strategyExplanationKey(strategy),
    actionShotDistributions: actionShotDistribution.scenes.filter((d) => d.suggestsMultipleShots),
  };
}

export { analyzeSceneAction, extractActionSteps, countActionVerbs };
