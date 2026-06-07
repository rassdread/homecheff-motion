/**
 * Studio V2 — Creation Assistant consolidation layer.
 * Projects existing Creative Review, Planner, Readiness, and Generation systems into actionable tasks.
 * No new intelligence, scoring, or planners.
 */

import { buildStoryboardActionShotDistribution } from "@/lib/studio-action-shot-distribution";
import { buildStudioAnimationPlan } from "@/lib/studio-animation-planner";
import { resolveAssetDecisions } from "@/lib/studio-asset-decision-execution";
import {
  assetDecisionKindToToolId,
  getAssetLifecycleDisplayStatus,
} from "@/lib/studio-asset-lifecycle-resolver";
import { buildProductionTimeline, buildRecentCompletedTimelineTasks } from "@/lib/studio-production-timeline";
import { buildCreativeReview } from "@/lib/studio-creative-review";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import { buildSceneGenerationPlan } from "@/lib/studio-scene-generation-orchestrator";
import { buildStudioUnifiedReadiness } from "@/lib/studio-unified-readiness";
import type { StudioReadinessFixAction } from "@/lib/studio-consistency-fix-suggestions";
import type { ProductionDomainReadiness, ProductionMissingItem } from "@/types/studio-production-plan";
import type { CreativeReviewItem, StudioCreativeReview } from "@/types/studio-creative-review";
import type { SceneGenerationPlanImage } from "@/types/studio-scene-generation-plan";
import type {
  CreationAssistantCompletionProgress,
  CreationAssistantContext,
  CreationAssistantProjectStatus,
  CreationAssistantTask,
  CreationAssistantTaskCategory,
  StudioCreationAssistantInput,
  StudioCreationAssistantView,
} from "@/types/studio-creation-assistant";
import type { StudioUnifiedReadiness } from "@/lib/studio-unified-readiness";

const IMAGE_ROLE_TASK_KEYS: Partial<Record<SceneGenerationPlanImage["imageRole"], string>> = {
  start_frame: "studio.creationAssistant.image.startMissing",
  end_frame: "studio.creationAssistant.image.endMissing",
  action_pose: "studio.creationAssistant.image.actionMissing",
  start_pose: "studio.creationAssistant.image.startMissing",
  end_pose: "studio.creationAssistant.image.endMissing",
  payoff_pose: "studio.creationAssistant.image.actionMissing",
  scene_still: "studio.creationAssistant.image.sceneMissing",
};

const STORY_PHASE_TASK_KEYS: Record<string, string> = {
  intro: "studio.creationAssistant.story.introWeak",
  climax: "studio.creationAssistant.story.climaxMissing",
  ending: "studio.creationAssistant.story.ctaMissing",
};

function fixToTask(fix: StudioReadinessFixAction, tier: CreationAssistantTask["tier"]): CreationAssistantTask {
  return {
    id: `fix-${fix.id}`,
    category: "fix",
    tier,
    messageKey: fix.issueKey,
    messageParams: fix.sceneOrder != null ? { scene: String(fix.sceneOrder) } : undefined,
    toolId: fix.tool,
    actionKind: fix.suggestedAssetId || fix.suggestedVoiceProfile ? "useSuggestion" : "open",
    suggestedAssetId: fix.suggestedAssetId,
    suggestedLabel: fix.suggestedLabel,
    sceneOrder: fix.sceneOrder,
    source: "readiness_fix",
    priority: fix.checkId === "images" || fix.checkId === "characters" ? "high" : "medium",
  };
}

function guidanceToTask(item: ProductionMissingItem, tier: CreationAssistantTask["tier"]): CreationAssistantTask {
  const category: CreationAssistantTaskCategory =
    item.kind === "character" || item.kind === "location" || item.kind === "prop" || item.kind === "world"
      ? "asset"
    : item.kind === "image" ? "image"
    : item.kind === "audio" ? "audio"
    : "general";

  return {
    id: `guidance-${item.id}`,
    category,
    tier,
    messageKey: item.reasonKey,
    messageParams: item.reasonParams,
    toolId: item.toolId,
    actionKind: item.createNew ? "createNew" : item.toolId ? "openLibrary" : "open",
    source: "creation_guidance",
    priority: item.kind === "character" || item.kind === "image" ? "high" : "medium",
  };
}

function reviewItemToTask(
  item: CreativeReviewItem,
  category: CreationAssistantTaskCategory,
  tier: CreationAssistantTask["tier"]
): CreationAssistantTask {
  return {
    id: `review-${item.id}`,
    category,
    tier,
    messageKey: item.messageKey,
    messageParams: item.messageParams,
    toolId: item.toolId,
    actionKind: "open",
    source: "creative_review",
    priority: item.priority ?? "medium",
  };
}

function imageToTask(image: SceneGenerationPlanImage, tier: CreationAssistantTask["tier"]): CreationAssistantTask {
  const messageKey =
    IMAGE_ROLE_TASK_KEYS[image.imageRole] ?? "studio.creationAssistant.image.sceneMissing";

  return {
    id: `image-${image.id}`,
    category: "image",
    tier,
    messageKey,
    messageParams: {
      scene: String(image.sceneOrder + 1),
      role: image.roleLabelKey,
    },
    toolId: image.toolId,
    actionKind: "open",
    sceneOrder: image.sceneOrder + 1,
    source: "generation_plan",
    priority: image.priority === "required" ? "high" : "medium",
  };
}

function dedupeTasks(tasks: CreationAssistantTask[], limit = 20): CreationAssistantTask[] {
  const seen = new Set<string>();
  const result: CreationAssistantTask[] = [];
  for (const task of tasks) {
    const key = `${task.category}:${task.messageKey}:${task.toolId ?? ""}:${task.sceneOrder ?? ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(task);
  }
  return result.slice(0, limit);
}

function deriveProjectStatus(
  unified: StudioUnifiedReadiness,
  domainReadiness: ProductionDomainReadiness[]
): CreationAssistantProjectStatus {
  if (unified.level === "ready") {
    return "ready_for_render";
  }
  if (unified.level === "almost_ready") {
    return "almost_ready";
  }
  const passedDomains = domainReadiness.filter((d) => d.passed).length;
  if (passedDomains <= 1) {
    return "started";
  }
  return "building";
}

function projectStatusKey(status: CreationAssistantProjectStatus): string {
  return `studio.creationAssistant.status.${status}`;
}

function buildCompletionProgress(params: {
  unified: StudioUnifiedReadiness;
  domainReadiness: ProductionDomainReadiness[];
  completedItems: CreationAssistantTask[];
  openTaskCount: number;
}): CreationAssistantCompletionProgress {
  const domainsPassed = params.domainReadiness.filter((d) => d.passed).length;
  const domainsTotal = params.domainReadiness.length;
  const totalCount = domainsTotal + params.openTaskCount;
  const completedCount = domainsPassed + params.completedItems.length;
  const percent =
    totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;
  const projectStatus = deriveProjectStatus(params.unified, params.domainReadiness);

  return {
    completedCount,
    totalCount,
    percent,
    domainsPassed,
    domainsTotal,
    projectStatus,
    projectStatusKey: projectStatusKey(projectStatus),
    readinessLevel: params.unified.level,
    readinessScore: params.unified.score,
  };
}

function buildStoryTasks(review: StudioCreativeReview): CreationAssistantTask[] {
  const tasks: CreationAssistantTask[] = [];

  for (const phase of review.storyReview.phases) {
    if (phase.reviewStatus === "strong") {
      continue;
    }
    const taskKey = STORY_PHASE_TASK_KEYS[phase.phase];
    if (taskKey) {
      tasks.push({
        id: `story-phase-${phase.phase}`,
        category: "story",
        tier: phase.reviewStatus === "missing" ? "now" : "next",
        messageKey: taskKey,
        messageParams: { phase: phase.phase },
        toolId: "story",
        actionKind: "open",
        source: "creative_review",
        priority: phase.reviewStatus === "missing" ? "high" : "medium",
      });
    } else if (phase.reviewStatus === "weak") {
      tasks.push({
        id: `story-phase-weak-${phase.phase}`,
        category: "story",
        tier: "next",
        messageKey: "studio.creativeReview.story.weakPhase",
        messageParams: { phase: phase.phase },
        toolId: "story",
        actionKind: "open",
        source: "creative_review",
        priority: "medium",
      });
    }
  }

  for (const advisory of review.storyReview.advisories.filter(
    (a) => a.status === "weak" || a.status === "missing"
  )) {
    tasks.push(reviewItemToTask(advisory, "story", advisory.priority === "high" ? "now" : "next"));
  }

  return tasks;
}

function buildAudioTasks(review: StudioCreativeReview): CreationAssistantTask[] {
  return review.audioReview.items
    .filter((item) => item.status === "missing" || item.status === "partial")
    .map((item) =>
      reviewItemToTask(item, "audio", item.status === "missing" ? "now" : "next")
    );
}

function buildRenderTasks(review: StudioCreativeReview): CreationAssistantTask[] {
  return review.renderReview.items
    .filter(
      (item) =>
        item.status === "missing" ||
        item.status === "weak" ||
        item.status === "partial" ||
        item.id === "render-fallback-active"
    )
    .map((item) =>
      reviewItemToTask(
        item,
        "render",
        item.priority === "high" ? "now" : item.id === "render-fallback-active" ? "next" : "optional"
      )
    );
}

function buildCompletedItems(params: {
  unified: StudioUnifiedReadiness;
  domainReadiness: ProductionDomainReadiness[];
  review: StudioCreativeReview;
}): CreationAssistantTask[] {
  const items: CreationAssistantTask[] = [];

  for (const check of params.unified.checks.filter((c) => c.passed)) {
    items.push({
      id: `done-check-${check.id}`,
      category: "general",
      tier: "completed",
      messageKey: check.messageKey,
      source: "domain_check",
      actionKind: "open",
      priority: "low",
    });
  }

  for (const domain of params.domainReadiness.filter((d) => d.passed)) {
    const category: CreationAssistantTaskCategory =
      domain.id === "assets" ? "asset"
      : domain.id === "images" ? "image"
      : domain.id;

    items.push({
      id: `done-domain-${domain.id}`,
      category,
      tier: "completed",
      messageKey: domain.messageKey,
      toolId:
        domain.id === "story" ? "story"
        : domain.id === "assets" ? "characters"
        : domain.id === "images" ? "visual"
        : domain.id === "audio" ? "voice"
        : "render",
      source: "production_plan",
      actionKind: "open",
      priority: "low",
    });
  }

  for (const item of params.review.strengths.slice(0, 4)) {
    items.push(reviewItemToTask(item, "general", "completed"));
  }

  for (const item of params.review.audioReview.items.filter((a) => a.status === "ready")) {
    items.push(reviewItemToTask(item, "audio", "completed"));
  }

  if (params.review.imageReview.requiredMissing === 0 && params.review.imageReview.requiredPresent > 0) {
    items.push({
      id: "done-images-required",
      category: "image",
      tier: "completed",
      messageKey: "studio.creativeReview.image.requiredComplete",
      toolId: "visual",
      source: "creative_review",
      actionKind: "open",
      priority: "low",
    });
  }

  return dedupeTasks(items, 12);
}

function buildAssetDecisionTasks(
  registry: import("@/types/studio-asset-decision").StudioAssetDecisionRegistry | undefined
): { pending: CreationAssistantTask[]; fulfilled: CreationAssistantTask[] } {
  if (!registry || registry.decisions.length === 0) {
    return { pending: [], fulfilled: [] };
  }

  const resolved = resolveAssetDecisions(registry);
  const pending: CreationAssistantTask[] = [];
  const fulfilled: CreationAssistantTask[] = [];

  for (const decision of resolved.buildNew) {
    pending.push({
      id: `asset-pending-${decision.id}`,
      category: "asset",
      tier: "next",
      messageKey: "studio.assetLifecycle.task.inProgress",
      messageParams: { name: decision.name },
      toolId: assetDecisionKindToToolId(decision.kind),
      actionKind: "createNew",
      source: "asset_decision",
      priority: "medium",
    });
  }

  for (const decision of registry.decisions) {
    if (getAssetLifecycleDisplayStatus(decision) !== "completed") {
      continue;
    }
    fulfilled.push({
      id: `asset-fulfilled-${decision.id}`,
      category: "asset",
      tier: "completed",
      messageKey: "studio.assetLifecycle.task.completed",
      messageParams: { name: decision.name },
      toolId: assetDecisionKindToToolId(decision.kind),
      actionKind: "open",
      source: "asset_decision",
      priority: "low",
    });
  }

  return { pending, fulfilled };
}

function buildBlockers(params: {
  nowTasks: CreationAssistantTask[];
  generationRequiredMissing: number;
  assetMissingCount: number;
}): CreationAssistantTask[] {
  const blockers = params.nowTasks.filter(
    (t) =>
      t.priority === "high" &&
      (t.category === "asset" ||
        t.category === "image" ||
        t.category === "fix" ||
        t.category === "render")
  );

  if (params.generationRequiredMissing > 0 && !blockers.some((b) => b.category === "image")) {
    blockers.push({
      id: "blocker-images-required",
      category: "image",
      tier: "now",
      messageKey: "studio.creationAssistant.blocker.imagesRequired",
      messageParams: { count: String(params.generationRequiredMissing) },
      toolId: "visual",
      actionKind: "open",
      source: "generation_plan",
      priority: "high",
    });
  }

  if (params.assetMissingCount > 0 && !blockers.some((b) => b.category === "asset")) {
    blockers.push({
      id: "blocker-assets-missing",
      category: "asset",
      tier: "now",
      messageKey: "studio.creationAssistant.blocker.assetsMissing",
      messageParams: { count: String(params.assetMissingCount) },
      toolId: "characters",
      actionKind: "openLibrary",
      source: "production_plan",
      priority: "high",
    });
  }

  return dedupeTasks(blockers, 8);
}

function buildDirectorContextLines(view: StudioCreationAssistantView): string[] {
  return [
    `assistant:status:${view.completionProgress.projectStatus}`,
    `assistant:score:${view.completionProgress.readinessScore}`,
    `assistant:now:${view.nowTasks.length}`,
    `assistant:next:${view.nextTasks.length}`,
    `assistant:blockers:${view.blockers.length}`,
    `assistant:progress:${view.completionProgress.percent}%`,
    ...view.nowTasks.slice(0, 4).map((t) => `assistant:task:${t.messageKey}`),
  ];
}

export function emptyCreationAssistantView(): StudioCreationAssistantView {
  return {
    version: 1,
    nowTasks: [],
    nextTasks: [],
    optionalTasks: [],
    completedItems: [],
    blockers: [],
    completionProgress: {
      completedCount: 0,
      totalCount: 0,
      percent: 0,
      domainsPassed: 0,
      domainsTotal: 5,
      projectStatus: "started",
      projectStatusKey: projectStatusKey("started"),
      readinessLevel: "needs_work",
      readinessScore: 0,
    },
    directorContextLines: [],
  };
}

/**
 * Project existing Studio guidance into a prioritized creation assistant view.
 * Advisory only — never blocks or mutates the storyboard.
 */
export function buildCreationAssistantView(
  input: StudioCreationAssistantInput
): StudioCreationAssistantView {
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
    assetDecisionRegistry: input.assetDecisionRegistry,
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
    assetDecisionRegistry: input.assetDecisionRegistry,
  });

  const review = buildCreativeReview({
    storyboard,
    characters,
    locations,
    props,
    worlds,
    projectMemory: input.projectMemory,
    styleProfile,
    directorProfile,
    currentIdea: input.currentIdea ?? storyboard.aiDirectorPrompt,
  });

  const nowTasks: CreationAssistantTask[] = [];
  const nextTasks: CreationAssistantTask[] = [];
  const optionalTasks: CreationAssistantTask[] = [];

  for (const fix of unified.fixes.slice(0, 8)) {
    nowTasks.push(fixToTask(fix, "now"));
  }

  for (const item of productionPlan.creationGuidance) {
    nowTasks.push(guidanceToTask(item, "now"));
  }

  for (const item of review.missingElements.filter((m) => m.priority === "high")) {
    nowTasks.push(reviewItemToTask(item, "general", "now"));
  }

  for (const image of generationPlan.requiredImages.filter((img) => img.status === "missing")) {
    nowTasks.push(imageToTask(image, "now"));
  }

  nowTasks.push(...buildStoryTasks(review).filter((t) => t.tier === "now"));
  nowTasks.push(...buildAudioTasks(review).filter((t) => t.tier === "now"));
  nowTasks.push(...buildRenderTasks(review).filter((t) => t.tier === "now"));

  for (const item of review.weaknesses.filter((w) => w.priority !== "high")) {
    nextTasks.push(reviewItemToTask(item, "general", "next"));
  }

  for (const image of generationPlan.recommendedImages.filter((img) => img.status === "missing")) {
    nextTasks.push(imageToTask(image, "next"));
  }

  nextTasks.push(...buildStoryTasks(review).filter((t) => t.tier === "next"));
  nextTasks.push(...buildAudioTasks(review).filter((t) => t.tier === "next"));
  nextTasks.push(...buildRenderTasks(review).filter((t) => t.tier === "next"));

  for (const item of review.missingElements.filter((m) => m.priority !== "high")) {
    nextTasks.push(reviewItemToTask(item, "general", "next"));
  }

  for (const item of review.improvementSuggestions) {
    optionalTasks.push(reviewItemToTask(item, "general", "optional"));
  }

  for (const item of review.opportunities) {
    optionalTasks.push(reviewItemToTask(item, "general", "optional"));
  }

  for (const item of review.assetReview.items.filter((a) => a.status === "partial")) {
    nextTasks.push(reviewItemToTask(item, "asset", "next"));
  }

  const assetDecisionTasks = buildAssetDecisionTasks(input.assetDecisionRegistry);
  nextTasks.push(...assetDecisionTasks.pending);

  const timeline =
    input.productionTimeline
    ?? buildProductionTimeline({
      storyboard,
      characters,
      locations,
      props,
      worlds,
      projectMemory: input.projectMemory,
      assetDecisionRegistry: input.assetDecisionRegistry,
    });
  const timelineRecentTasks = buildRecentCompletedTimelineTasks(timeline);

  const completedItems = dedupeTasks(
    [
      ...buildCompletedItems({
        unified,
        domainReadiness: productionPlan.domainReadiness,
        review,
      }),
      ...assetDecisionTasks.fulfilled,
      ...timelineRecentTasks.map((task) => ({
        id: task.id,
        category: "asset" as const,
        tier: "completed" as const,
        messageKey: task.messageKey,
        messageParams: task.messageParams,
        toolId: task.toolId,
        actionKind: "open" as const,
        source: "production_timeline" as const,
        priority: "low" as const,
      })),
    ],
    12
  );

  const dedupedNow = dedupeTasks(nowTasks, 10);
  const dedupedNext = dedupeTasks(nextTasks, 10);
  const dedupedOptional = dedupeTasks(optionalTasks, 8);

  const blockers = buildBlockers({
    nowTasks: dedupedNow,
    generationRequiredMissing: generationPlan.readiness.requiredMissing,
    assetMissingCount: productionPlan.assetPlanning.missingCount,
  });

  const completionProgress = buildCompletionProgress({
    unified,
    domainReadiness: productionPlan.domainReadiness,
    completedItems,
    openTaskCount: dedupedNow.length + dedupedNext.length,
  });

  const view: StudioCreationAssistantView = {
    version: 1,
    nowTasks: dedupedNow,
    nextTasks: dedupedNext,
    optionalTasks: dedupedOptional,
    completedItems,
    blockers,
    completionProgress,
    directorContextLines: [],
  };
  view.directorContextLines = buildDirectorContextLines(view);
  return view;
}

export function buildCreationAssistantContext(
  input: StudioCreationAssistantInput
): CreationAssistantContext {
  const view = buildCreationAssistantView(input);
  const openTaskKeys = [...view.nowTasks, ...view.nextTasks]
    .slice(0, 8)
    .map((t) => t.messageKey);

  return {
    view,
    contextLines: view.directorContextLines,
    openTaskKeys,
  };
}

export function enrichIdeaWithCreationAssistant(
  idea: string,
  context: CreationAssistantContext
): string {
  if (context.contextLines.length === 0) {
    return idea;
  }
  const openSummary =
    context.openTaskKeys.length > 0 ?
      `Open tasks: ${context.openTaskKeys.slice(0, 4).join(", ")}`
    : "";
  const lines = [...context.contextLines, openSummary].filter(Boolean).join("; ");
  return `[Creation assistant: ${lines}]\n${idea.trim()}`.trim();
}
