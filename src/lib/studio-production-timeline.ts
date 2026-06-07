/**
 * Studio V2 — Production Timeline builder.
 * Consolidates existing brief, asset, director, and memory signals — no new tracking.
 */

import { getAssetLifecycleDisplayStatus } from "@/lib/studio-asset-lifecycle-resolver";
import { buildProductionMemoryProfile } from "@/lib/studio-production-memory-profile";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import { directorAuditsToTimelineEvents } from "@/lib/studio-director-apply-audit";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { AssetDecisionKind, StudioAssetDecision } from "@/types/studio-asset-decision";
import type {
  BuildProductionTimelineInput,
  ProductionTimelineDecision,
  ProductionTimelineEvolutionPoint,
  ProductionTimelineEvent,
  ProductionTimelineMilestone,
  ProductionTimelineContext,
  StudioProductionTimeline,
} from "@/types/studio-production-timeline";
import type { StudioSceneDetail } from "@/types/studio-api";

function parseAt(iso: string): number {
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : 0;
}

function sortByAtDesc<T extends { at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => parseAt(b.at) - parseAt(a.at));
}

function sortByAtAsc<T extends { at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => parseAt(a.at) - parseAt(b.at));
}

function excerpt(text: string, max = 80): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}…`;
}

function assetToolId(kind: AssetDecisionKind): ProductionTimelineEvent["toolId"] {
  if (kind === "character") {
    return "characters";
  }
  if (kind === "location") {
    return "locations";
  }
  if (kind === "prop") {
    return "props";
  }
  return "world";
}

function decisionTitleKey(decision: StudioAssetDecision): string {
  const status = getAssetLifecycleDisplayStatus(decision);
  if (status === "completed") {
    return "studio.productionTimeline.decision.completed";
  }
  if (status === "in_progress") {
    return "studio.productionTimeline.decision.buildNew";
  }
  if (status === "skipped") {
    return "studio.productionTimeline.decision.skip";
  }
  return "studio.productionTimeline.decision.useExisting";
}

function collectLinkedAssetIds(scenes: StudioSceneDetail[]): {
  characters: Set<string>;
  locations: Set<string>;
  props: Set<string>;
} {
  const characters = new Set<string>();
  const locations = new Set<string>();
  const props = new Set<string>();
  for (const scene of scenes) {
    for (const character of scene.characters) {
      characters.add(character.id);
    }
    if (scene.location?.id) {
      locations.add(scene.location.id);
    }
    for (const prop of scene.props) {
      props.add(prop.id);
    }
  }
  return { characters, locations, props };
}

function buildBriefEvents(input: BuildProductionTimelineInput): ProductionTimelineEvent[] {
  const { storyboard, productionBrief, assetDecisionRegistry } = input;
  const events: ProductionTimelineEvent[] = [];
  const idea =
    storyboard.aiDirectorPrompt?.trim()
    || productionBrief?.idea?.trim()
    || assetDecisionRegistry?.briefIdea?.trim()
    || "";

  events.push({
    id: "production-started",
    at: storyboard.createdAt,
    kind: "production_started",
    source: "storyboard",
    category: "brief",
    titleKey: "studio.productionTimeline.event.productionStarted",
    titleParams: { title: storyboard.title.trim() || "—" },
    toolId: "productionHistory",
  });

  if (idea) {
    events.push({
      id: "idea-captured",
      at: storyboard.createdAt,
      kind: "idea_captured",
      source: "storyboard",
      category: "brief",
      titleKey: "studio.productionTimeline.event.ideaCaptured",
      titleParams: { idea: excerpt(idea) },
      toolId: "story",
    });
  }

  const directorProfile = normalizeStudioDirectorProfile(storyboard.directorProfile);
  const styleProfile = normalizeStudioPromptStyleProfile(storyboard.promptStyleProfile);
  events.push({
    id: "style-selected",
    at: storyboard.createdAt,
    kind: "style_selected",
    source: "storyboard",
    category: "brief",
    titleKey: "studio.productionTimeline.event.styleSelected",
    titleParams: {
      director: directorProfile,
      style: styleProfile,
    },
    toolId: "production",
  });

  const goal = productionBrief?.goal?.trim() || storyboard.description?.trim();
  if (goal) {
    events.push({
      id: "goal-set",
      at: storyboard.createdAt,
      kind: "goal_set",
      source: productionBrief ? "derived" : "storyboard",
      category: "brief",
      titleKey: "studio.productionTimeline.event.goalSet",
      titleParams: { goal: excerpt(goal, 100) },
      toolId: "production",
    });
  }

  return events;
}

function buildAssetEvents(input: BuildProductionTimelineInput): {
  events: ProductionTimelineEvent[];
  decisions: ProductionTimelineDecision[];
} {
  const registry = input.assetDecisionRegistry;
  if (!registry || registry.decisions.length === 0) {
    return { events: [], decisions: [] };
  }

  const events: ProductionTimelineEvent[] = [];
  const decisions: ProductionTimelineDecision[] = [];
  const linked = collectLinkedAssetIds(input.storyboard.scenes);

  for (const decision of registry.decisions) {
    const titleKey = decisionTitleKey(decision);
    const titleParams = {
      name: decision.name,
      kind: decision.kind,
    };

    decisions.push({
      id: decision.id,
      at: decision.decidedAt,
      kind: decision.kind,
      mode: decision.mode,
      name: decision.name,
      titleKey,
      titleParams,
      fulfilledAt: decision.fulfilledAt,
      existingId: decision.existingId,
    });

    events.push({
      id: `decision-${decision.id}`,
      at: decision.decidedAt,
      kind: "asset_decision",
      source: "asset_decision",
      category: "asset",
      titleKey,
      titleParams,
      toolId: assetToolId(decision.kind),
    });

    if (decision.fulfilledAt && decision.existingId) {
      events.push({
        id: `asset-created-${decision.id}`,
        at: decision.fulfilledAt,
        kind: "asset_created",
        source: "asset_decision",
        category: "asset",
        titleKey: "studio.productionTimeline.event.assetCreated",
        titleParams: { name: decision.name, kind: decision.kind },
        toolId: assetToolId(decision.kind),
      });

      const isLinked =
        (decision.kind === "character" && linked.characters.has(decision.existingId))
        || (decision.kind === "location" && linked.locations.has(decision.existingId))
        || (decision.kind === "prop" && linked.props.has(decision.existingId));

      if (isLinked) {
        events.push({
          id: `asset-linked-${decision.id}`,
          at: decision.fulfilledAt,
          kind: "asset_linked",
          source: "scene",
          category: "asset",
          titleKey: "studio.productionTimeline.event.assetLinked",
          titleParams: { name: decision.name, kind: decision.kind },
          toolId: "story",
        });
      }
    }
  }

  return { events, decisions };
}

function buildDirectorEvents(input: BuildProductionTimelineInput): ProductionTimelineEvent[] {
  if (input.directorApplyAudits?.length) {
    return directorAuditsToTimelineEvents(input.directorApplyAudits);
  }

  const { storyboard } = input;
  const events: ProductionTimelineEvent[] = [];
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);

  if (scenes.length > 0 && storyboard.aiDirectorPrompt?.trim()) {
    const earliestScene = sortByAtAsc(
      scenes.map((scene) => ({ at: scene.createdAt, scene }))
    )[0];
    if (earliestScene) {
      events.push({
        id: "director-applied",
        at: earliestScene.at,
        kind: "director_applied",
        source: "derived",
        category: "director",
        titleKey: "studio.productionTimeline.event.directorApplied",
        titleParams: { scenes: String(scenes.length) },
        toolId: "story",
      });
    }
  }

  if (
    storyboard.aiDirectorPrompt?.trim()
    && parseAt(storyboard.updatedAt) - parseAt(storyboard.createdAt) > 60_000
  ) {
    events.push({
      id: "director-prompt-updated",
      at: storyboard.updatedAt,
      kind: "director_prompt_updated",
      source: "storyboard",
      category: "director",
      titleKey: "studio.productionTimeline.event.directorPromptUpdated",
      titleParams: { idea: excerpt(storyboard.aiDirectorPrompt) },
      toolId: "story",
    });
  }

  return events;
}

function buildSceneEvents(input: BuildProductionTimelineInput): ProductionTimelineEvent[] {
  const scenes = sortByAtAsc(
    input.storyboard.scenes.map((scene) => ({
      at: scene.createdAt,
      scene,
    }))
  );

  return scenes.map(({ at, scene }) => ({
    id: `scene-added-${scene.id}`,
    at,
    kind: "scene_added" as const,
    source: "scene" as const,
    category: "evolution" as const,
    titleKey: "studio.productionTimeline.event.sceneAdded",
    titleParams: {
      title: scene.title.trim() || `Scene ${scene.order + 1}`,
      order: String(scene.order + 1),
    },
    toolId: "story" as const,
  }));
}

function buildMemoryEvents(input: BuildProductionTimelineInput): ProductionTimelineEvent[] {
  if (!input.projectMemory) {
    return [];
  }
  const profile = buildProductionMemoryProfile({
    memory: input.projectMemory,
    currentIdea: input.storyboard.aiDirectorPrompt,
    libraries: {
      characters: input.characters,
      worlds: input.worlds,
    },
  });
  const topPattern = profile.productionPatterns[0];
  if (!topPattern || topPattern.matchCount < 2) {
    return [];
  }

  return [
    {
      id: `memory-pattern-${topPattern.id}`,
      at: input.storyboard.createdAt,
      kind: "memory_pattern",
      source: "memory",
      category: "memory",
      titleKey: "studio.productionTimeline.event.memoryPattern",
      titleParams: {
        pattern: topPattern.labelKey,
        count: String(topPattern.matchCount),
      },
      toolId: "continuity",
    },
  ];
}

function buildEvolutionPoints(input: BuildProductionTimelineInput): ProductionTimelineEvolutionPoint[] {
  const scenes = sortByAtAsc(
    input.storyboard.scenes.map((scene) => ({
      at: scene.createdAt,
      scene,
    }))
  );
  if (scenes.length === 0) {
    return [];
  }

  const points: ProductionTimelineEvolutionPoint[] = [];
  let prevSceneCount = 0;
  let prevCharacterCount = 0;
  let prevDuration = 0;
  const seenCharacters = new Set<string>();

  for (let index = 0; index < scenes.length; index += 1) {
    const { at, scene } = scenes[index]!;
    const sceneCount = index + 1;
    for (const character of scene.characters) {
      seenCharacters.add(character.id);
    }
    const characterCount = seenCharacters.size;
    const duration = scenes
      .slice(0, index + 1)
      .reduce((sum, item) => sum + (item.scene.durationSeconds ?? 0), 0);

    if (index > 0 && sceneCount !== prevSceneCount) {
      points.push({
        id: `evolution-scenes-${scene.id}`,
        at,
        titleKey: "studio.productionTimeline.evolution.scenes",
        titleParams: {
          from: String(prevSceneCount),
          to: String(sceneCount),
        },
      });
    }

    if (index > 0 && characterCount > prevCharacterCount) {
      points.push({
        id: `evolution-characters-${scene.id}`,
        at,
        titleKey: "studio.productionTimeline.evolution.characters",
        titleParams: {
          from: String(prevCharacterCount),
          to: String(characterCount),
        },
      });
    }

    if (index > 0 && duration > prevDuration + 4) {
      points.push({
        id: `evolution-duration-${scene.id}`,
        at,
        titleKey: "studio.productionTimeline.evolution.duration",
        titleParams: {
          from: String(Math.round(prevDuration)),
          to: String(Math.round(duration)),
        },
      });
    }

    prevSceneCount = sceneCount;
    prevCharacterCount = characterCount;
    prevDuration = duration;
  }

  const plan = buildStudioProductionPlan({
    storyboard: input.storyboard,
    characters: input.characters,
    locations: input.locations,
    props: input.props,
    worlds: input.worlds,
    projectMemory: input.projectMemory,
  });
  const firstDuration = Math.round(scenes[0]?.scene.durationSeconds ?? 0);
  const totalDuration = Math.round(plan.estimatedDurationSeconds);
  if (totalDuration > firstDuration + 4 && scenes.length > 1) {
    points.push({
      id: "evolution-duration-plan",
      at: input.storyboard.updatedAt,
      titleKey: "studio.productionTimeline.evolution.durationPlan",
      titleParams: {
        from: String(firstDuration),
        to: String(totalDuration),
      },
    });
  }

  return sortByAtDesc(points);
}

function buildMilestones(
  events: ProductionTimelineEvent[],
  decisions: ProductionTimelineDecision[]
): ProductionTimelineMilestone[] {
  const milestones: ProductionTimelineMilestone[] = [];

  const started = events.find((event) => event.kind === "production_started");
  if (started) {
    milestones.push({
      id: "milestone-started",
      at: started.at,
      titleKey: "studio.productionTimeline.milestone.started",
      toolId: "productionHistory",
    });
  }

  const firstDecision = sortByAtAsc(decisions)[0];
  if (firstDecision) {
    milestones.push({
      id: "milestone-first-decision",
      at: firstDecision.at,
      titleKey: "studio.productionTimeline.milestone.firstDecision",
      toolId: "productionHistory",
    });
  }

  const firstScene = sortByAtAsc(events.filter((event) => event.kind === "scene_added"))[0];
  if (firstScene) {
    milestones.push({
      id: "milestone-first-scene",
      at: firstScene.at,
      titleKey: "studio.productionTimeline.milestone.firstScene",
      toolId: "story",
    });
  }

  const fulfilled = decisions.filter((decision) => decision.fulfilledAt);
  if (fulfilled.length > 0) {
    const latest = sortByAtDesc(
      fulfilled.map((decision) => ({
        at: decision.fulfilledAt!,
        decision,
      }))
    )[0];
    if (latest) {
      milestones.push({
        id: "milestone-asset-complete",
        at: latest.at,
        titleKey: "studio.productionTimeline.milestone.assetComplete",
        titleParams: { name: latest.decision.name },
        toolId: assetToolId(latest.decision.kind),
      });
    }
  }

  return sortByAtDesc(milestones);
}

function buildRecentCompletedKeys(
  decisions: ProductionTimelineDecision[],
  milestones: ProductionTimelineMilestone[]
): string[] {
  const keys: string[] = [];

  for (const _decision of sortByAtDesc(
    decisions.filter((decision) => decision.fulfilledAt)
  ).slice(0, 4)) {
    keys.push("studio.productionTimeline.recent.assetCompleted");
  }

  for (const milestone of milestones.slice(0, 2)) {
    keys.push(milestone.titleKey);
  }

  return [...new Set(keys)].slice(0, 6);
}

function buildDirectorContextLines(timeline: StudioProductionTimeline): string[] {
  const lines: string[] = [
    `timeline:events:${timeline.timelineEvents.length}`,
    `timeline:decisions:${timeline.decisionHistory.length}`,
    `timeline:milestones:${timeline.milestones.length}`,
  ];

  const recent = timeline.timelineEvents.slice(0, 3);
  for (const event of recent) {
    lines.push(`timeline:${event.kind}:${event.titleKey}`);
  }

  return lines;
}

export function emptyProductionTimeline(): StudioProductionTimeline {
  return {
    version: 1,
    timelineEvents: [],
    milestones: [],
    decisionHistory: [],
    productionEvolution: [],
    recentCompletedKeys: [],
    directorContextLines: [],
  };
}

export function buildProductionTimeline(
  input: BuildProductionTimelineInput
): StudioProductionTimeline {
  const briefEvents = buildBriefEvents(input);
  const assetBundle = buildAssetEvents(input);
  const directorEvents = buildDirectorEvents(input);
  const sceneEvents = buildSceneEvents(input);
  const memoryEvents = buildMemoryEvents(input);

  const timelineEvents = sortByAtDesc([
    ...briefEvents,
    ...assetBundle.events,
    ...directorEvents,
    ...sceneEvents,
    ...memoryEvents,
    ...(input.snapshotTimelineEvents ?? []),
  ]);

  const productionEvolution = buildEvolutionPoints(input);
  const milestones = buildMilestones(timelineEvents, assetBundle.decisions);
  const recentCompletedKeys = buildRecentCompletedKeys(assetBundle.decisions, milestones);

  const timeline: StudioProductionTimeline = {
    version: 1,
    timelineEvents,
    milestones,
    decisionHistory: sortByAtDesc(assetBundle.decisions),
    productionEvolution,
    recentCompletedKeys,
    directorContextLines: [],
  };
  timeline.directorContextLines = buildDirectorContextLines(timeline);
  return timeline;
}

export function buildProductionTimelineContext(
  input: BuildProductionTimelineInput
): ProductionTimelineContext {
  const timeline = buildProductionTimeline(input);
  return {
    timeline,
    contextLines: timeline.directorContextLines,
    recentCompletedKeys: timeline.recentCompletedKeys,
  };
}

export function enrichIdeaWithProductionTimeline(
  idea: string,
  context: ProductionTimelineContext
): string {
  if (context.contextLines.length === 0) {
    return idea;
  }
  const recent =
    context.recentCompletedKeys.length > 0 ?
      `Recent: ${context.recentCompletedKeys.slice(0, 3).join(", ")}`
    : "";
  const lines = [...context.contextLines, recent].filter(Boolean).join("; ");
  return `[Production timeline: ${lines}]\n${idea.trim()}`.trim();
}

export function productionTimelineMemoryGuidanceKeys(
  timeline: StudioProductionTimeline
): string[] {
  return timeline.timelineEvents
    .filter((event) => event.category === "memory" || event.kind === "production_started")
    .slice(0, 3)
    .map((event) => event.titleKey);
}

export function buildRecentCompletedTimelineTasks(
  timeline: StudioProductionTimeline
): Array<{ id: string; messageKey: string; messageParams?: Record<string, string>; toolId?: ProductionTimelineEvent["toolId"] }> {
  const tasks: Array<{
    id: string;
    messageKey: string;
    messageParams?: Record<string, string>;
    toolId?: ProductionTimelineEvent["toolId"];
  }> = [];

  for (const decision of timeline.decisionHistory.filter((d) => d.fulfilledAt).slice(0, 4)) {
    tasks.push({
      id: `timeline-recent-${decision.id}`,
      messageKey: "studio.productionTimeline.recent.assetCompleted",
      messageParams: { name: decision.name, kind: decision.kind },
      toolId: assetToolId(decision.kind),
    });
  }

  for (const milestone of timeline.milestones.slice(0, 2)) {
    tasks.push({
      id: `timeline-milestone-${milestone.id}`,
      messageKey: milestone.titleKey,
      messageParams: milestone.titleParams,
      toolId: milestone.toolId,
    });
  }

  return tasks;
}
