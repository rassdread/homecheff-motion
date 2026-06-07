/**
 * Studio V2 — Creative Review orchestrator.
 * Thin layer over existing health, planner, evolution, generation, and memory systems.
 */

import { buildStoryboardActionIntelligence } from "@/lib/studio-character-capabilities";
import { buildStoryboardActionShotDistribution } from "@/lib/studio-action-shot-distribution";
import { buildStoryArchitecture } from "@/lib/studio-story-architecture";
import { buildDirectorDecisionMemoryContext } from "@/lib/studio-director-decision-memory";
import { buildStoryboardAssetEvolution } from "@/lib/studio-asset-evolution";
import { buildStoryboardIdentityConsumption } from "@/lib/studio-identity-consumption";
import { buildStudioAnimationPlan } from "@/lib/studio-animation-planner";
import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import {
  resolveProductionMemoryProfile,
} from "@/lib/studio-production-memory-integration";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import { buildSceneGenerationPlan } from "@/lib/studio-scene-generation-orchestrator";
import {
  buildStoryHealthAdvisorReport,
} from "@/lib/studio-story-health-advisor";
import { analyzeStoryIntelligence } from "@/lib/studio-story-intelligence";
import { buildStudioUnifiedReadiness } from "@/lib/studio-unified-readiness";
import { buildVisualProductionSummary } from "@/lib/studio-visual-production-summary";
import { buildViduExecutionPlan } from "@/lib/studio-vidu-execution-planner";
import type { ProductionAudioStatus, ProductionMissingItem } from "@/types/studio-production-plan";
import type {
  CreativeReviewItem,
  CreativeReviewStoryPhase,
  StudioCreativeReview,
  StudioCreativeReviewInput,
  CreativeReviewContext,
} from "@/types/studio-creative-review";
import type { UnifiedReadinessLevel } from "@/lib/studio-unified-readiness";

function phaseReviewStatus(
  status: CreativeReviewStoryPhase["status"]
): CreativeReviewStoryPhase["reviewStatus"] {
  if (status === "strong" || status === "present") {
    return status === "strong" ? "strong" : "strong";
  }
  if (status === "weak") {
    return "weak";
  }
  return "missing";
}

function audioStatusToReviewStatus(status: ProductionAudioStatus): CreativeReviewItem["status"] {
  if (status === "ready") {
    return "ready";
  }
  if (status === "partial") {
    return "partial";
  }
  return "missing";
}

function missingItemToReviewItem(item: ProductionMissingItem): CreativeReviewItem {
  return {
    id: item.id,
    messageKey: item.reasonKey,
    messageParams: item.reasonParams,
    status: "missing",
    toolId: item.toolId,
    priority: item.kind === "image" || item.kind === "character" ? "high" : "medium",
  };
}

function dedupeItems(items: CreativeReviewItem[], limit = 12): CreativeReviewItem[] {
  const seen = new Set<string>();
  const result: CreativeReviewItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    result.push(item);
  }
  return result.slice(0, limit);
}

function buildStoryReview(params: {
  storyHealth: ReturnType<typeof buildStoryHealthAdvisorReport>;
  storyStructure: ReturnType<typeof buildStudioProductionPlan>["storyStructure"];
}): StudioCreativeReview["storyReview"] {
  const phases: CreativeReviewStoryPhase[] = params.storyStructure.map((phase) => ({
    phase: phase.phase,
    status: phase.status,
    labelKey: phase.labelKey,
    sceneOrders: phase.sceneOrders,
    reviewStatus: phaseReviewStatus(phase.status),
  }));

  const advisories: CreativeReviewItem[] = params.storyHealth.advisories.map((a) => ({
    id: `story-advisory-${a.code}`,
    messageKey: a.messageKey,
    status: a.severity === "warning" ? "weak" : "info",
    toolId: "story",
    priority: a.severity === "warning" ? "medium" : "low",
  }));

  return {
    score: params.storyHealth.score,
    phases,
    advisories,
  };
}

function buildAssetReview(params: {
  assetEvolution: ReturnType<typeof buildStoryboardAssetEvolution>;
  identity: ReturnType<typeof buildStoryboardIdentityConsumption>;
}): StudioCreativeReview["assetReview"] {
  const items: CreativeReviewItem[] = [];

  const pushMissing = (
    kind: "character" | "location" | "prop" | "world",
    entries: Array<{ id: string; name: string; reasonKeys?: string[] }>,
    toolId: CreativeReviewItem["toolId"]
  ) => {
    for (const entry of entries) {
      items.push({
        id: `asset-missing-${kind}-${entry.id}`,
        messageKey: entry.reasonKeys?.[0] ?? "studio.creativeReview.asset.missing",
        messageParams: { name: entry.name, kind },
        status: "missing",
        toolId,
        priority: "high",
      });
    }
  };

  const charSection = params.assetEvolution.sections.find((s) => s.kind === "character")!;
  const locSection = params.assetEvolution.sections.find((s) => s.kind === "location")!;
  const propSection = params.assetEvolution.sections.find((s) => s.kind === "prop")!;
  const worldSection = params.assetEvolution.sections.find((s) => s.kind === "world")!;

  pushMissing("character", charSection.missing, "characters");
  pushMissing("location", locSection.missing, "locations");
  pushMissing("prop", propSection.missing, "props");
  pushMissing("world", worldSection.missing, "world");

  for (const check of params.identity.completenessChecks.filter((c) => !c.passed)) {
    items.push({
      id: `identity-${check.id}`,
      messageKey: check.messageKey,
      messageParams: { name: check.assetName, kind: check.kind },
      status: "partial",
      toolId: "characters",
      priority: "medium",
    });
  }

  return {
    missingCharacters: items.filter((i) => i.id.includes("character")),
    missingLocations: items.filter((i) => i.id.includes("location")),
    missingProps: items.filter((i) => i.id.includes("prop")),
    missingWorlds: items.filter((i) => i.id.includes("world")),
    items,
  };
}

function buildActionReview(params: {
  intelligence: ReturnType<typeof buildStoryboardActionIntelligence>;
  distribution: ReturnType<typeof buildStoryboardActionShotDistribution>;
}): StudioCreativeReview["actionReview"] {
  const items: CreativeReviewItem[] = [];

  for (const scene of params.intelligence.sceneClassifications) {
    const classification = scene.dominantClassification;
    if (classification === "supported") {
      items.push({
        id: `action-supported-${scene.sceneOrder}`,
        messageKey: "studio.creativeReview.action.supported",
        messageParams: { scene: String(scene.sceneOrder + 1) },
        status: "strong",
        toolId: "story",
        priority: "low",
      });
      continue;
    }
    const status =
      classification === "unusual" || classification === "unsupported" ? "weak" : "partial";
    const actionHint = scene.actions.find((a) => a.suggestionKey);
    items.push({
      id: `action-${classification}-${scene.sceneOrder}`,
      messageKey:
        actionHint?.suggestionKey ??
        (classification === "unsupported"
          ? "studio.creativeReview.action.unsupported"
          : "studio.creativeReview.action.unusual"),
      messageParams: {
        scene: String(scene.sceneOrder + 1),
        ...actionHint?.suggestionParams,
      },
      status,
      toolId: "story",
      priority: classification === "unsupported" ? "high" : "medium",
    });
  }

  for (const scene of params.distribution.scenes) {
    if (scene.suggestsMultipleShots) {
      items.push({
        id: `action-shots-${scene.sceneId}`,
        messageKey: "studio.creativeReview.action.moreShots",
        messageParams: {
          scene: String(scene.sceneOrder + 1),
          count: String(scene.recommendedShotCount),
        },
        status: "info",
        toolId: "visual",
        priority: "medium",
      });
    }
    if (scene.actionChain.missingSupportingAssets.length > 0) {
      items.push({
        id: `action-assets-${scene.sceneId}`,
        messageKey: "studio.creativeReview.action.missingImages",
        messageParams: { scene: String(scene.sceneOrder + 1) },
        status: "missing",
        toolId: "visual",
        priority: "high",
      });
    }
  }

  return { items: dedupeItems(items, 10) };
}

function buildImageReview(params: {
  generationPlan: ReturnType<typeof buildSceneGenerationPlan>;
  visualSummary: ReturnType<typeof buildVisualProductionSummary>;
}): StudioCreativeReview["imageReview"] {
  const items: CreativeReviewItem[] = [];
  const requiredPresent = params.generationPlan.totalPresent;
  const requiredMissing = params.generationPlan.readiness.requiredMissing;
  const recommendedMissing = params.generationPlan.readiness.recommendedMissing;

  if (requiredMissing === 0 && params.generationPlan.readiness.readyToRender) {
    items.push({
      id: "image-required-complete",
      messageKey: "studio.creativeReview.image.requiredComplete",
      status: "ready",
      toolId: "visual",
      priority: "low",
    });
  }

  if (requiredMissing > 0) {
    items.push({
      id: "image-required-missing",
      messageKey: "studio.creativeReview.image.requiredMissing",
      messageParams: { count: String(requiredMissing) },
      status: "missing",
      toolId: "visual",
      priority: "high",
    });
  }

  if (recommendedMissing > 0) {
    items.push({
      id: "image-recommended-missing",
      messageKey: "studio.creativeReview.image.recommendedMissing",
      messageParams: { count: String(recommendedMissing) },
      status: "partial",
      toolId: "visual",
      priority: "medium",
    });
  }

  if (params.generationPlan.generationSteps.length > 0) {
    items.push({
      id: "image-order-logical",
      messageKey: "studio.creativeReview.image.orderLogical",
      messageParams: { steps: String(params.generationPlan.generationSteps.length) },
      status: "info",
      toolId: "visual",
      priority: "low",
    });
  }

  if (params.visualSummary.scenesWithoutImage > 0) {
    items.push({
      id: "image-scenes-without",
      messageKey: "studio.creativeReview.image.scenesWithout",
      messageParams: { count: String(params.visualSummary.scenesWithoutImage) },
      status: "missing",
      toolId: "visual",
      priority: "high",
    });
  }

  const orderLogical =
    params.generationPlan.generationSteps.length > 0 && requiredMissing === 0;

  return {
    requiredPresent,
    requiredMissing,
    recommendedMissing,
    orderLogical,
    items,
  };
}

function buildAudioReview(params: {
  audioPlanning: ReturnType<typeof buildStudioProductionPlan>["audioPlanning"];
}): StudioCreativeReview["audioReview"] {
  const { audioPlanning } = params;
  const domains = [
    { key: "narration" as const, labelKey: "studio.creativeReview.audio.narration" },
    { key: "transcript" as const, labelKey: "studio.creativeReview.audio.transcript" },
    { key: "music" as const, labelKey: "studio.creativeReview.audio.music" },
    { key: "sound" as const, labelKey: "studio.creativeReview.audio.sound" },
  ];

  const items: CreativeReviewItem[] = domains.map(({ key, labelKey }) => ({
    id: `audio-${key}`,
    messageKey: labelKey,
    status: audioStatusToReviewStatus(audioPlanning[key]),
    toolId: key === "narration" || key === "transcript" ? "voice" : key === "music" ? "music" : "sound",
    priority: audioPlanning[key] === "missing" ? "medium" : "low",
  }));

  return {
    narration: audioPlanning.narration,
    transcript: audioPlanning.transcript,
    music: audioPlanning.music,
    sound: audioPlanning.sound,
    items,
  };
}

function buildRenderReview(params: {
  productionPlan: ReturnType<typeof buildStudioProductionPlan>;
  animationPlan: ReturnType<typeof buildStudioAnimationPlan>;
  executionPlan: ReturnType<typeof buildViduExecutionPlan>;
}): StudioCreativeReview["renderReview"] {
  const renderPlanning = params.productionPlan.renderPlanning;
  const items: CreativeReviewItem[] = [
    {
      id: "render-strategy",
      messageKey: renderPlanning.strategyExplanationKey,
      messageParams: { strategy: renderPlanning.recommendedStrategy },
      status: renderPlanning.confidence === "high" ? "strong" : "partial",
      toolId: "render",
      priority: "low",
    },
  ];

  for (const reasonKey of renderPlanning.reasonKeys.slice(0, 3)) {
    items.push({
      id: `render-reason-${reasonKey}`,
      messageKey: reasonKey,
      status: "info",
      toolId: "render",
      priority: "low",
    });
  }

  if (!params.animationPlan.readiness.imagesComplete) {
    items.push({
      id: "render-animation-images",
      messageKey: "studio.creativeReview.render.imagesIncomplete",
      status: "weak",
      toolId: "visual",
      priority: "high",
    });
  }

  if (!params.animationPlan.readiness.actionStructureComplete) {
    items.push({
      id: "render-animation-action",
      messageKey: "studio.creativeReview.render.actionIncomplete",
      status: "weak",
      toolId: "story",
      priority: "medium",
    });
  }

  for (const warning of params.executionPlan.warnings.slice(0, 3)) {
    items.push({
      id: `render-exec-warn-${warning.id}`,
      messageKey: warning.messageKey,
      messageParams: warning.messageParams,
      status: "weak",
      toolId: "render",
      priority: "medium",
    });
  }

  if (params.executionPlan.fallbackPlan?.active) {
    items.push({
      id: "render-fallback-active",
      messageKey: "studio.creativeReview.render.fallbackActive",
      messageParams: {
        reason: params.executionPlan.fallbackPlan.reasonKey,
      },
      status: "partial",
      toolId: "render",
      priority: "medium",
    });
  }

  return {
    strategy: renderPlanning.recommendedStrategy,
    strategyLabelKey: renderPlanning.strategyLabelKey,
    confidence: renderPlanning.confidence,
    fallbackActive: Boolean(params.executionPlan.fallbackPlan?.active),
    items: dedupeItems(items, 8),
  };
}

function buildMemoryReview(params: {
  memoryProfile: ReturnType<typeof resolveProductionMemoryProfile>;
  currentIdea?: string;
}): StudioCreativeReview["memoryReview"] {
  const profile = params.memoryProfile;
  const items: CreativeReviewItem[] = [];

  if (!profile || profile.totalProductions < 2) {
    return { similarProductionCount: 0, items: [] };
  }

  const guidance = profile.creationGuidance;
  const similarCount = guidance?.similarProductionCount ?? profile.totalProductions;

  if (guidance) {
    items.push({
      id: "memory-similar",
      messageKey: guidance.messageKey,
      messageParams: guidance.messageParams,
      status: "info",
      toolId: "production",
      priority: "low",
    });
    if (guidance.startWithSuggestionKey) {
      items.push({
        id: "memory-start-with",
        messageKey: guidance.startWithSuggestionKey,
        messageParams: guidance.startWithParams,
        status: "info",
        toolId: "production",
        priority: "low",
      });
    }
  }

  if (profile.productionPatterns[0]) {
    items.push({
      id: "memory-pattern",
      messageKey: "studio.creativeReview.memory.successfulPattern",
      messageParams: {
        pattern: profile.productionPatterns[0].labelKey,
        count: String(profile.productionPatterns[0].matchCount),
      },
      status: "info",
      toolId: "production",
      priority: "low",
    });
  }

  if (
    params.currentIdea?.trim() &&
    profile.averageDurationSeconds > 0 &&
    guidance &&
    guidance.similarProductionCount < 2
  ) {
    items.push({
      id: "memory-deviates",
      messageKey: "studio.creativeReview.memory.deviates",
      status: "info",
      toolId: "production",
      priority: "low",
    });
  }

  return {
    similarProductionCount: similarCount,
    patternLabelKey: profile.productionPatterns[0]?.labelKey,
    items,
  };
}

function aggregateStrengthsWeaknesses(review: Omit<StudioCreativeReview, "directorContextLines">): {
  strengths: CreativeReviewItem[];
  weaknesses: CreativeReviewItem[];
  opportunities: CreativeReviewItem[];
} {
  const strengths: CreativeReviewItem[] = [];
  const weaknesses: CreativeReviewItem[] = [];
  const opportunities: CreativeReviewItem[] = [];

  for (const phase of review.storyReview.phases) {
    if (phase.reviewStatus === "strong") {
      strengths.push({
        id: `strength-story-${phase.phase}`,
        messageKey: phase.labelKey,
        messageParams: { phase: phase.phase },
        status: "strong",
        toolId: "story",
        priority: "low",
      });
    } else if (phase.reviewStatus === "weak") {
      weaknesses.push({
        id: `weakness-story-${phase.phase}`,
        messageKey: "studio.creativeReview.story.weakPhase",
        messageParams: { phase: phase.phase },
        status: "weak",
        toolId: "story",
        priority: "medium",
      });
    } else {
      weaknesses.push({
        id: `weakness-story-missing-${phase.phase}`,
        messageKey: "studio.creativeReview.story.missingPhase",
        messageParams: { phase: phase.phase },
        status: "missing",
        toolId: "story",
        priority: "high",
      });
    }
  }

  for (const item of review.actionReview.items) {
    if (item.status === "strong") {
      strengths.push(item);
    } else if (item.status === "weak" || item.status === "missing") {
      weaknesses.push(item);
    }
  }

  for (const item of review.imageReview.items) {
    if (item.status === "ready") {
      strengths.push(item);
    } else if (item.status === "missing" || item.status === "weak") {
      weaknesses.push(item);
    }
  }

  for (const item of review.audioReview.items) {
    if (item.status === "ready") {
      strengths.push(item);
    } else if (item.status === "missing") {
      weaknesses.push(item);
    }
  }

  for (const item of review.renderReview.items) {
    if (item.status === "strong") {
      strengths.push(item);
    } else if (item.status === "weak" || item.status === "partial") {
      weaknesses.push(item);
    }
  }

  opportunities.push(...review.memoryReview.items);

  return {
    strengths: dedupeItems(strengths, 8),
    weaknesses: dedupeItems(weaknesses, 10),
    opportunities: dedupeItems(opportunities, 6),
  };
}

function buildQualitySummary(params: {
  storyScore: number;
  readinessScore: number;
  readinessLevel: UnifiedReadinessLevel;
  missingCount: number;
}): StudioCreativeReview["qualitySummary"] {
  const score = Math.round(params.storyScore * 0.35 + params.readinessScore * 0.65);
  const level = params.readinessLevel;

  let summaryKey = "studio.creativeReview.summary.ready";
  if (level === "needs_work") {
    summaryKey = "studio.creativeReview.summary.needsWork";
  } else if (level === "almost_ready") {
    summaryKey = "studio.creativeReview.summary.almostReady";
  }

  return {
    score,
    level,
    summaryKey,
    summaryParams: {
      score: String(score),
      missing: String(params.missingCount),
    },
  };
}

function buildDirectorContextLines(review: StudioCreativeReview): string[] {
  return [
    `review:score:${review.qualitySummary.score}`,
    `review:level:${review.qualitySummary.level}`,
    `review:strengths:${review.strengths.length}`,
    `review:weaknesses:${review.weaknesses.length}`,
    `review:missing:${review.missingElements.length}`,
    review.storyReview.score > 0 ? `review:story:${review.storyReview.score}` : "",
  ].filter(Boolean);
}

export function emptyCreativeReview(): StudioCreativeReview {
  return {
    version: 1,
    qualitySummary: {
      score: 0,
      level: "needs_work",
      summaryKey: "studio.creativeReview.summary.empty",
    },
    strengths: [],
    weaknesses: [],
    opportunities: [],
    missingElements: [],
    improvementSuggestions: [],
    storyReview: { score: 0, phases: [], advisories: [] },
    assetReview: {
      missingCharacters: [],
      missingLocations: [],
      missingProps: [],
      missingWorlds: [],
      items: [],
    },
    actionReview: { items: [] },
    imageReview: {
      requiredPresent: 0,
      requiredMissing: 0,
      recommendedMissing: 0,
      orderLogical: false,
      items: [],
    },
    audioReview: {
      narration: "missing",
      transcript: "missing",
      music: "missing",
      sound: "missing",
      items: [],
    },
    renderReview: {
      strategy: "story",
      strategyLabelKey: "studio.renderStrategy.story",
      confidence: "low",
      fallbackActive: false,
      items: [],
    },
    memoryReview: { similarProductionCount: 0, items: [] },
    directorContextLines: [],
  };
}

/**
 * Build a project-level creative review from existing Studio quality systems.
 * Advisory only — never blocks or mutates the storyboard.
 */
export function buildCreativeReview(input: StudioCreativeReviewInput): StudioCreativeReview {
  const storyboard = input.storyboard;
  const characters = input.characters ?? [];
  const locations = input.locations ?? [];
  const props = input.props ?? [];
  const worlds = input.worlds ?? [];
  const styleProfile = normalizeStudioPromptStyleProfile(
    input.styleProfile ?? storyboard.promptStyleProfile
  );
  const directorProfile = normalizeStudioDirectorProfile(
    input.directorProfile ?? storyboard.directorProfile
  );
  const currentIdea = input.currentIdea ?? storyboard.aiDirectorPrompt;

  const flow = storyboardToFlowInput(storyboard);
  const intelligence = analyzeStoryIntelligence(flow, directorProfile);
  const storyHealth = buildStoryHealthAdvisorReport(storyboard, characters, {
    intelligence,
    flow,
  });
  const unified = buildStudioUnifiedReadiness({
    storyboard,
    characters,
    locations,
    props,
    worlds,
    styleProfile,
    directorProfile,
  });

  const productionPlan = buildStudioProductionPlan({
    storyboard,
    characters,
    locations,
    props,
    worlds,
    projectMemory: input.projectMemory,
    styleProfile,
    directorProfile,
  });

  const renderStrategyPlan = buildStudioRenderStrategyPlan({
    storyboard,
    characters,
    locations,
    props,
    worlds,
    projectMemory: input.projectMemory,
  });

  const actionDistribution = buildStoryboardActionShotDistribution({
    storyboard,
    characters,
    props,
    worlds,
  });

  const animationPlan = buildStudioAnimationPlan({
    storyboard,
    productionPlan,
    renderStrategyPlan,
    actionShotDistributions: actionDistribution,
    characters,
    locations,
    props,
    worlds,
    projectMemory: input.projectMemory,
    styleProfile,
    directorProfile,
  });

  const generationPlan = buildSceneGenerationPlan({
    storyboard,
    characters,
    locations,
    props,
    worlds,
    projectMemory: input.projectMemory,
    styleProfile,
    directorProfile,
    productionPlan,
    animationPlan,
    renderStrategyPlan,
    actionShotDistributions: actionDistribution,
  });

  const assetEvolution = buildStoryboardAssetEvolution({
    storyboard,
    characters,
    locations,
    props,
    worlds,
    memory: input.projectMemory,
  });

  const identityConsumption = buildStoryboardIdentityConsumption({
    storyboard,
    libraries: { characters, locations, props, worlds },
    memory: input.projectMemory,
  });

  const actionIntelligence = buildStoryboardActionIntelligence({
    storyboard,
    characters,
    props,
    worlds,
  });

  const visualSummary = buildVisualProductionSummary(storyboard);

  const executionPlan = buildViduExecutionPlan({
    storyboard,
    animationPlan,
    renderStrategyPlan,
  });

  const memoryProfile = resolveProductionMemoryProfile({
    projectMemory: input.projectMemory,
    currentIdea,
    characters,
    worlds,
  });

  const storyReview = buildStoryReview({
    storyHealth,
    storyStructure: productionPlan.storyStructure,
  });

  const assetReview = buildAssetReview({
    assetEvolution,
    identity: identityConsumption,
  });

  const actionReview = buildActionReview({
    intelligence: actionIntelligence,
    distribution: actionDistribution,
  });

  const imageReview = buildImageReview({ generationPlan, visualSummary });
  const audioReview = buildAudioReview({ audioPlanning: productionPlan.audioPlanning });
  const renderReview = buildRenderReview({ productionPlan, animationPlan, executionPlan });
  const memoryReview = buildMemoryReview({ memoryProfile, currentIdea });

  const missingElements = dedupeItems(
    productionPlan.missingItems.map(missingItemToReviewItem),
    12
  );

  const improvementSuggestions = dedupeItems(
    [
      ...productionPlan.recommendations.map((r) => ({
        id: r.id,
        messageKey: r.messageKey,
        messageParams: r.messageParams,
        status: "info" as const,
        toolId: r.toolId,
        priority: r.priority,
      })),
      ...generationPlan.recommendations.map((r) => ({
        id: `gen-${r.id}`,
        messageKey: r.messageKey,
        messageParams: r.messageParams,
        status: "info" as const,
        toolId: r.toolId,
        priority: r.priority,
      })),
      ...memoryReview.items,
    ],
    12
  );

  const partial = {
    version: 1 as const,
    qualitySummary: buildQualitySummary({
      storyScore: storyHealth.score,
      readinessScore: unified.score,
      readinessLevel: unified.level,
      missingCount: missingElements.length,
    }),
    strengths: [] as CreativeReviewItem[],
    weaknesses: [] as CreativeReviewItem[],
    opportunities: [] as CreativeReviewItem[],
    missingElements,
    improvementSuggestions,
    storyReview,
    assetReview,
    actionReview,
    imageReview,
    audioReview,
    renderReview,
    memoryReview,
  };

  const aggregated = aggregateStrengthsWeaknesses(partial);

  const review: StudioCreativeReview = {
    ...partial,
    ...aggregated,
    storyReview: {
      ...storyReview,
      advisories: [...storyReview.advisories, ...aggregated.weaknesses.filter((w) => w.id.startsWith("story-advisory"))],
    },
    directorContextLines: [],
  };
  const storyArchitecture = buildStoryArchitecture({
    userIdea: currentIdea ?? "",
    storyboard,
    characters,
    locations,
    props,
    worlds,
    projectMemory: input.projectMemory,
    directorProfile,
    styleProfile,
  });
  review.directorContextLines = [
    ...buildDirectorContextLines(review),
    ...storyArchitecture.directorContextLines.map((line) => `architect:${line}`),
  ];
  const decisionMemory = buildDirectorDecisionMemoryContext({
    storyboardId: storyboard.id,
    storyboard,
  });
  if (decisionMemory.memory.proposalRetentionLabelKey) {
    review.improvementSuggestions.push({
      id: "director-proposal-retention",
      messageKey: decisionMemory.memory.proposalRetentionLabelKey,
      messageParams: {
        score: String(decisionMemory.memory.proposalRetentionScore ?? 0),
      },
      status: "info",
      priority: "medium",
      toolId: "directorPreferences",
    });
  }
  review.directorContextLines.push(
    ...decisionMemory.contextLines.map((line) => `decision:${line}`)
  );
  return review;
}

export function buildCreativeReviewContext(
  input: StudioCreativeReviewInput
): CreativeReviewContext {
  const review = buildCreativeReview(input);
  const recommendationKeys = review.improvementSuggestions
    .map((s) => s.messageKey)
    .slice(0, 6);

  return {
    review,
    contextLines: review.directorContextLines,
    recommendationKeys,
  };
}

export function enrichIdeaWithCreativeReview(idea: string, context: CreativeReviewContext): string {
  if (context.contextLines.length === 0) {
    return idea;
  }
  return `[Creative review: ${context.contextLines.join("; ")}]\n${idea.trim()}`.trim();
}
