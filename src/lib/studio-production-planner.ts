/**
 * Studio V2 — Production Planner.
 * Consolidates existing planners into one project-level production overview (no execution).
 */

import { buildStoryboardActionShotDistribution } from "@/lib/studio-action-shot-distribution";
import { buildStoryboardAssetEvolution } from "@/lib/studio-asset-evolution";
import { buildStoryboardIdentityConsumption } from "@/lib/studio-identity-consumption";
import { buildCurrentStoryboardShotPlan } from "@/lib/studio-shot-planner";
import {
  buildSceneImageReadiness,
  buildVisualProductionSummary,
} from "@/lib/studio-visual-production-summary";
import { buildStudioUnifiedReadiness } from "@/lib/studio-unified-readiness";
import { detectArcPhaseForIndex, type StoryArcPhase } from "@/lib/studio-story-arc";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  ProductionAssetEntry,
  ProductionAudioStatus,
  ProductionDomainReadiness,
  ProductionMissingItem,
  ProductionRecommendation,
  ProductionAssetPlanning,
  ProductionStoryStructurePhase,
  StoryStructurePhaseId,
  StoryStructurePhaseStatus,
  StudioProductionPlan,
  StudioProductionPlanInput,
} from "@/types/studio-production-plan";
import type { StudioSceneDetail } from "@/types/studio-api";
import { buildSceneGenerationPlan } from "@/lib/studio-scene-generation-orchestrator";
import type { ProductionBriefAssetProposal, StudioProductionBrief } from "@/types/studio-production-brief";

const STORY_PHASE_MAP: Record<StoryStructurePhaseId, StoryArcPhase[]> = {
  intro: ["opening"],
  setup: ["discovery"],
  development: ["build_up", "transition"],
  climax: ["climax"],
  ending: ["resolution", "outro"],
};

const STORY_PHASE_LABEL: Record<StoryStructurePhaseId, string> = {
  intro: "studio.productionPlan.story.intro",
  setup: "studio.productionPlan.story.setup",
  development: "studio.productionPlan.story.development",
  climax: "studio.productionPlan.story.climax",
  ending: "studio.productionPlan.story.ending",
};

function sceneHasContent(scene: StudioSceneDetail): boolean {
  return Boolean(
    scene.title?.trim() ||
      scene.description?.trim() ||
      scene.action?.trim() ||
      scene.characters.length > 0
  );
}

function buildStoryStructure(scenes: StudioSceneDetail[]): ProductionStoryStructurePhase[] {
  const sceneCount = scenes.length;
  const phaseToOrders = new Map<StoryStructurePhaseId, number[]>();

  for (const phase of Object.keys(STORY_PHASE_MAP) as StoryStructurePhaseId[]) {
    phaseToOrders.set(phase, []);
  }

  for (const scene of scenes) {
    const arcPhase = detectArcPhaseForIndex(scene.order, sceneCount);
    for (const [structPhase, arcPhases] of Object.entries(STORY_PHASE_MAP) as Array<
      [StoryStructurePhaseId, StoryArcPhase[]]
    >) {
      if (arcPhases.includes(arcPhase) && sceneHasContent(scene)) {
        phaseToOrders.get(structPhase)!.push(scene.order);
      }
    }
  }

  return (Object.keys(STORY_PHASE_MAP) as StoryStructurePhaseId[]).map((phase) => {
    const sceneOrders = phaseToOrders.get(phase) ?? [];
    let status: StoryStructurePhaseStatus = "missing";
    if (sceneOrders.length >= 2) {
      status = "strong";
    } else if (sceneOrders.length === 1) {
      status = "present";
    } else if (sceneCount > 0 && scenes.some((s) => sceneHasContent(s))) {
      status = "weak";
    }
    return {
      phase,
      status,
      sceneOrders,
      labelKey: STORY_PHASE_LABEL[phase],
    };
  });
}

function audioStatus(enabled: boolean, hasContent: boolean): ProductionAudioStatus {
  if (!enabled) {
    return "missing";
  }
  if (hasContent) {
    return "ready";
  }
  return "partial";
}

function assetEntriesFromEvolution(
  kind: "character" | "location" | "prop" | "world",
  present: Array<{ name: string; existingId?: string }>,
  missing: Array<{ name: string; reasonKeys?: string[] }>,
  recommended: Array<{ name: string; reasonKeys?: string[] }>
): ProductionAssetEntry[] {
  const entries: ProductionAssetEntry[] = present.map((p) => ({
    id: p.existingId ?? p.name,
    name: p.name,
    kind,
    status: "present" as const,
  }));
  for (const m of missing) {
    entries.push({
      id: `missing-${kind}-${m.name || entries.length}`,
      name: m.name || "",
      kind,
      status: "missing",
      reasonKey: m.reasonKeys?.[0] ?? "studio.productionPlan.asset.missing",
    });
  }
  for (const r of recommended) {
    if (entries.some((e) => e.name === r.name && e.status === "present")) {
      continue;
    }
    entries.push({
      id: `rec-${kind}-${r.name}`,
      name: r.name,
      kind,
      status: "recommended",
      reasonKey: r.reasonKeys?.[0],
    });
  }
  return entries;
}

function toolForAssetKind(kind: ProductionAssetEntry["kind"]): StudioToolId {
  if (kind === "world") return "world";
  return kind === "character" ? "characters" : kind === "location" ? "locations" : "props";
}

function assetPlanningFromBrief(brief: StudioProductionBrief): ProductionAssetPlanning {
  const toEntries = (
    items: ProductionBriefAssetProposal[],
    kind: ProductionAssetEntry["kind"]
  ): ProductionAssetEntry[] =>
    items.map((item) => ({
      id: item.existingId ?? item.id,
      name: item.name,
      kind,
      status:
        item.status === "existing" ? "present"
        : item.status === "new" ? "missing"
        : "recommended",
      reasonKey: item.reasonKey,
    }));

  const characters = toEntries(brief.mainCharacters, "character");
  const locations = toEntries(brief.recommendedLocations, "location");
  const props = toEntries(brief.recommendedProps, "prop");
  const worlds: ProductionAssetEntry[] =
    brief.world ?
      [
        {
          id: brief.world.existingId ?? brief.world.name,
          name: brief.world.name,
          kind: "world",
          status: brief.world.existingId ? "present" : "recommended",
          reasonKey: brief.world.reasonKey,
        },
      ]
    : [];

  const assetPlanning: ProductionAssetPlanning = {
    characters,
    locations,
    props,
    worlds,
    requiredCount: 0,
    presentCount: 0,
    missingCount: 0,
  };

  for (const list of [characters, locations, props, worlds]) {
    for (const entry of list) {
      assetPlanning.requiredCount += 1;
      if (entry.status === "present") {
        assetPlanning.presentCount += 1;
      } else if (entry.status === "missing") {
        assetPlanning.missingCount += 1;
      }
    }
  }

  return assetPlanning;
}

function applyProductionBriefOverrides(
  plan: StudioProductionPlan,
  brief: StudioProductionBrief
): StudioProductionPlan {
  const preview = brief.storyPreview;
  const briefAssetPlanning = assetPlanningFromBrief(brief);
  const briefRecommendations: ProductionRecommendation[] = brief.recommendations.map((r) => ({
    id: r.id,
    messageKey: r.messageKey,
    messageParams: r.messageParams,
    priority: r.priority,
  }));

  const actionComplexity =
    brief.actionIntensity === "high" ? "high"
    : brief.actionIntensity === "low" ? "low"
    : plan.actionPlanning.complexity;

  return {
    ...plan,
    productionGoalKey: "studio.productionPlan.goal.fromBrief",
    productionGoalParams: {
      goal: brief.goal,
      duration: String(preview.estimatedDurationSeconds),
      shots: String(preview.estimatedShotCount),
      scenes: String(preview.estimatedSceneCount),
    },
    estimatedDurationSeconds: preview.estimatedDurationSeconds,
    estimatedShotCount: preview.estimatedShotCount,
    estimatedSceneCount: preview.estimatedSceneCount,
    estimatedAssetCount: Math.max(plan.estimatedAssetCount, briefAssetPlanning.requiredCount),
    assetPlanning: briefAssetPlanning,
    actionPlanning: {
      ...plan.actionPlanning,
      complexity: actionComplexity,
      recommendedShotCount: Math.max(plan.actionPlanning.recommendedShotCount, preview.estimatedShotCount),
    },
    recommendations: [...briefRecommendations, ...plan.recommendations].slice(0, 10),
    directorContextLines: [
      `brief:${brief.goal}`,
      `duration:${preview.estimatedDurationSeconds}s`,
      `shots:${preview.estimatedShotCount}`,
      `scenes:${preview.estimatedSceneCount}`,
      `action:${brief.actionIntensity}`,
      brief.world ? `world:${brief.world.name}` : "",
      ...plan.directorContextLines,
    ].filter(Boolean),
  };
}

export function buildProductionPlanDirectorContext(plan: StudioProductionPlan): string[] {
  return plan.directorContextLines;
}

export function buildStudioProductionPlan(
  input: StudioProductionPlanInput
): StudioProductionPlan {
  const storyboard = input.storyboard;
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
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

  const unified = buildStudioUnifiedReadiness({
    storyboard,
    characters,
    locations,
    props,
    worlds,
    styleProfile,
    directorProfile,
  });

  const renderPlan = unified.renderStrategyPlan;
  const actionDistribution = buildStoryboardActionShotDistribution({
    storyboard,
    characters,
    props,
    worlds,
  });
  const shotPlan = buildCurrentStoryboardShotPlan(storyboard);
  const visualSummary = buildVisualProductionSummary(storyboard);

  buildSceneImageReadiness({
    storyboard,
    styleProfile,
    directorProfile,
    characters,
    locations,
    props,
    worlds,
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

  const estimatedDurationSeconds =
    scenes.reduce((sum, s) => sum + (s.durationSeconds > 0 ? s.durationSeconds : 5), 0) ||
    renderPlan.estimatedFinalDurationSeconds;

  const estimatedShotCount = Math.max(
    shotPlan.scenes.reduce((sum, s) => sum + s.beats.filter((b) => b.present).length, 0),
    actionDistribution.scenes.reduce((sum, d) => sum + d.recommendedShotCount, 0),
    scenes.length
  );

  const assetSections = assetEvolution.sections;
  const charSection = assetSections.find((s) => s.kind === "character")!;
  const locSection = assetSections.find((s) => s.kind === "location")!;
  const propSection = assetSections.find((s) => s.kind === "prop")!;
  const worldSection = assetSections.find((s) => s.kind === "world")!;

  const assetPlanning = {
    characters: assetEntriesFromEvolution(
      "character",
      charSection.present,
      charSection.missing,
      charSection.recommended
    ),
    locations: assetEntriesFromEvolution(
      "location",
      locSection.present,
      locSection.missing,
      locSection.recommended
    ),
    props: assetEntriesFromEvolution("prop", propSection.present, propSection.missing, propSection.recommended),
    worlds: assetEntriesFromEvolution("world", worldSection.present, worldSection.missing, worldSection.recommended),
    requiredCount: 0,
    presentCount: 0,
    missingCount: 0,
  };

  for (const list of [
    assetPlanning.characters,
    assetPlanning.locations,
    assetPlanning.props,
    assetPlanning.worlds,
  ]) {
    for (const entry of list) {
      assetPlanning.requiredCount += 1;
      if (entry.status === "present") {
        assetPlanning.presentCount += 1;
      } else if (entry.status === "missing") {
        assetPlanning.missingCount += 1;
      }
    }
  }

  const totalActionSteps = actionDistribution.scenes.reduce(
    (sum, d) => sum + d.actionChain.steps.length,
    0
  );
  const recommendedShotsFromActions = actionDistribution.scenes.reduce(
    (sum, d) => sum + d.recommendedShotCount,
    0
  );

  const imagePlanning = {
    requiredCount: renderPlan.requiredImageCount,
    presentCount: renderPlan.presentImageCount,
    missingCount: renderPlan.missingImageCount,
    recommendedCount: renderPlan.imageRequirements.filter((r) => r.status === "recommended").length,
  };

  const hasNarrationScript = Boolean(storyboard.voiceNarrationScript?.trim());
  const hasTranscript = scenes.some((s) => s.description?.trim() || s.action?.trim());

  const audioPlanning = {
    narration: audioStatus(storyboard.voiceEnabled, hasNarrationScript),
    transcript: audioStatus(true, hasTranscript),
    music: audioStatus(storyboard.musicEnabled, Boolean(storyboard.musicStyle?.trim())),
    sound: audioStatus(storyboard.soundEnabled, Boolean(storyboard.soundStyle?.trim())),
    voiceEnabled: storyboard.voiceEnabled,
    musicEnabled: storyboard.musicEnabled,
    soundEnabled: storyboard.soundEnabled,
  };

  const storyStructure = buildStoryStructure(scenes);

  const missingItems: ProductionMissingItem[] = [];
  const creationGuidance: ProductionMissingItem[] = [];

  for (const phase of storyStructure.filter((p) => p.status === "missing" || p.status === "weak")) {
    missingItems.push({
      id: `story-${phase.phase}`,
      kind: "shot",
      label: phase.phase,
      reasonKey:
        phase.status === "missing"
          ? "studio.productionPlan.missing.storyPhase"
          : "studio.productionPlan.missing.storyPhaseWeak",
      reasonParams: { phase: phase.phase },
    });
  }

  for (const list of [
    assetPlanning.characters,
    assetPlanning.locations,
    assetPlanning.props,
    assetPlanning.worlds,
  ]) {
    for (const entry of list.filter((e) => e.status === "missing")) {
      const item: ProductionMissingItem = {
        id: `asset-${entry.kind}-${entry.id}`,
        kind: entry.kind === "world" ? "world" : entry.kind,
        label: entry.name || entry.kind,
        reasonKey: entry.reasonKey ?? "studio.productionPlan.asset.missing",
        toolId: toolForAssetKind(entry.kind),
        createNew: !entry.name,
      };
      missingItems.push(item);
      creationGuidance.push(item);
    }
  }

  if (imagePlanning.missingCount > 0) {
    missingItems.push({
      id: "images-missing",
      kind: "image",
      label: String(imagePlanning.missingCount),
      reasonKey: "studio.productionPlan.missing.images",
      reasonParams: { count: String(imagePlanning.missingCount) },
      toolId: "visual",
    });
  }

  const shotsStillNeeded = Math.max(0, recommendedShotsFromActions - scenes.length);
  if (shotsStillNeeded > 0) {
    missingItems.push({
      id: "shots-needed",
      kind: "shot",
      label: String(shotsStillNeeded),
      reasonKey: "studio.productionPlan.missing.shots",
      reasonParams: { count: String(shotsStillNeeded) },
      toolId: "visual",
    });
  }

  if (actionDistribution.scenesNeedingSplit > 0) {
    missingItems.push({
      id: "duration-mismatch",
      kind: "shot",
      label: String(actionDistribution.scenesNeedingSplit),
      reasonKey: "studio.productionPlan.missing.duration",
      reasonParams: { count: String(actionDistribution.scenesNeedingSplit) },
    });
  }

  const recommendations: ProductionRecommendation[] = unified.fixes.slice(0, 8).map((fix) => ({
    id: fix.id,
    messageKey: fix.reasonKey ?? fix.issueKey,
    toolId: fix.tool,
    priority: fix.tool === "render" ? "high" : "medium",
  }));

  for (const warning of unified.renderWarnings.slice(0, 4)) {
    recommendations.push({
      id: `render-warn-${warning.messageKey}`,
      messageKey: warning.messageKey,
      messageParams: warning.params,
      toolId: "render",
      priority: "medium",
    });
  }

  const domainReadiness: ProductionDomainReadiness[] = [
    {
      id: "story",
      messageKey: "studio.productionPlan.domain.story",
      passed: storyStructure.filter((p) => p.status === "missing").length <= 1,
    },
    {
      id: "assets",
      messageKey: "studio.productionPlan.domain.assets",
      passed: assetPlanning.missingCount === 0,
    },
    {
      id: "images",
      messageKey: "studio.productionPlan.domain.images",
      passed: imagePlanning.missingCount === 0 && visualSummary.scenesWithoutImage === 0,
    },
    {
      id: "audio",
      messageKey: "studio.productionPlan.domain.audio",
      passed:
        (!storyboard.voiceEnabled || audioPlanning.narration !== "missing") &&
        (!storyboard.musicEnabled || audioPlanning.music !== "missing"),
    },
    {
      id: "render",
      messageKey: "studio.productionPlan.domain.render",
      passed: renderPlan.missingImageCount === 0 && unified.level !== "needs_work",
    },
  ];

  const dominantWorld = identityConsumption.dominantWorldName ?? "";
  const directorContextLines = [
    `duration:${estimatedDurationSeconds}s`,
    `shots:${estimatedShotCount}`,
    `scenes:${scenes.length}`,
    `strategy:${renderPlan.recommendedStrategy}`,
    dominantWorld ? `world:${dominantWorld}` : "",
    totalActionSteps > 0 ? `actions:${totalActionSteps}` : "",
    assetPlanning.presentCount > 0 ? `assets:${assetPlanning.presentCount}` : "",
  ].filter(Boolean);

  const estimatedAssetCount =
    assetPlanning.presentCount +
    assetPlanning.missingCount +
    assetPlanning.characters.filter((c) => c.status === "recommended").length;

  const generationPlan = buildSceneGenerationPlan({
    storyboard,
    characters,
    locations,
    props,
    worlds,
    projectMemory: input.projectMemory,
    styleProfile,
    directorProfile,
    renderStrategyPlan: renderPlan,
    actionShotDistributions: actionDistribution,
  });

  const generationPlanning = {
    requiredCount: generationPlan.totalRequired,
    recommendedCount: generationPlan.totalRecommended,
    optionalCount: generationPlan.totalOptional,
    missingRequiredCount: generationPlan.readiness.requiredMissing,
    missingRecommendedCount: generationPlan.readiness.recommendedMissing,
    missingAssetCount: generationPlan.missingAssets.length,
    readyToRender: generationPlan.readiness.readyToRender,
    readinessLevel: generationPlan.readiness.level,
    readinessScore: generationPlan.readiness.score,
    generationStepCount: generationPlan.generationSteps.length,
  };

  if (generationPlanning.missingRequiredCount > 0 && !missingItems.some((m) => m.id === "generation-required")) {
    missingItems.push({
      id: "generation-required",
      kind: "image",
      label: String(generationPlanning.missingRequiredCount),
      reasonKey: "studio.generationPlan.missing.requiredBeforeRender",
      reasonParams: { count: String(generationPlanning.missingRequiredCount) },
      toolId: "visual",
    });
  }

  const basePlan: StudioProductionPlan = {
    productionGoalKey: "studio.productionPlan.goal.summary",
    productionGoalParams: {
      duration: String(estimatedDurationSeconds),
      shots: String(estimatedShotCount),
      scenes: String(scenes.length),
      missing: String(missingItems.length),
    },
    estimatedDurationSeconds,
    estimatedShotCount,
    estimatedSceneCount: scenes.length,
    estimatedAssetCount,
    readiness: unified.level,
    readinessScore: unified.score,
    missingItems: missingItems.slice(0, 12),
    recommendations: recommendations.slice(0, 10),
    creationGuidance: creationGuidance.slice(0, 8),
    storyStructure,
    assetPlanning,
    actionPlanning: {
      totalActionSteps,
      recommendedShotCount: recommendedShotsFromActions,
      complexity: renderPlan.actionComplexity,
      scenesWithActionChain: actionDistribution.scenes.filter((d) => d.suggestsMultipleShots).length,
      durationMismatchScenes: actionDistribution.scenesNeedingSplit,
    },
    imagePlanning,
    generationPlanning,
    audioPlanning,
    renderPlanning: {
      recommendedStrategy: renderPlan.recommendedStrategy,
      strategyLabelKey: renderPlan.strategyLabelKey,
      strategyExplanationKey: renderPlan.strategyExplanationKey,
      reasonKeys: renderPlan.reasons.map((r) => r.reasonKey),
      confidence: renderPlan.confidence,
    },
    domainReadiness,
    directorContextLines,
  };

  if (scenes.length === 0 && input.productionBrief) {
    return applyProductionBriefOverrides(basePlan, input.productionBrief);
  }

  return basePlan;
}

/** Enrich user idea with production plan context for AI Director (no new AI). */
export function enrichIdeaWithProductionPlan(idea: string, plan: StudioProductionPlan): string {
  const context = [
    `[production: ${plan.estimatedDurationSeconds}s, ${plan.estimatedShotCount} shots, ${plan.estimatedSceneCount} scenes]`,
    `[render: ${plan.renderPlanning.recommendedStrategy}]`,
    plan.actionPlanning.totalActionSteps > 0
      ? `[actions: ${plan.actionPlanning.totalActionSteps} steps, ${plan.actionPlanning.recommendedShotCount} recommended shots]`
      : "",
    plan.missingItems.length > 0
      ? `[gaps: ${plan.missingItems.length} items still needed]`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${context}\n${idea}`.trim();
}
