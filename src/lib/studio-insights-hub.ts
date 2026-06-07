/**
 * Studio V2 — Insights Hub projection layer (no new intelligence).
 * Aggregates existing Creation Assistant, Planner, Review, Architect, Memory, Timeline, Snapshots.
 */

import { buildCharacterConsistencySummary } from "@/lib/studio-character-consistency-summary";
import { buildCreationAssistantView } from "@/lib/studio-creation-assistant";
import { buildCreativeReview } from "@/lib/studio-creative-review";
import { buildDirectorDecisionMemoryContext } from "@/lib/studio-director-decision-memory";
import { loadDirectorDecisionRegistry } from "@/lib/studio-director-decision-storage";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { buildProductionMemoryContext } from "@/lib/studio-production-memory-profile";
import { buildProductionTimeline } from "@/lib/studio-production-timeline";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import { buildSceneGenerationPlan } from "@/lib/studio-scene-generation-orchestrator";
import { findLastSafeRecoveryPoint } from "@/lib/studio-snapshot-recovery";
import { buildStoryArchitecture } from "@/lib/studio-story-architecture";
import {
  buildCharacterVoiceOrchestration,
  buildInsightsVoiceCastSummary,
} from "@/lib/studio-character-voice-orchestration";
import { emptyProjectMemorySnapshot } from "@/lib/studio-project-memory-utils";
import type { CreationAssistantTask, CreationAssistantTaskSource } from "@/types/studio-creation-assistant";
import type { ProductionDomainReadiness } from "@/types/studio-production-plan";
import type { ProductionTimelineEvent } from "@/types/studio-production-timeline";
import type {
  InsightsExplanation,
  InsightsExplanationSource,
  InsightsHealthDomain,
  InsightsHealthStatus,
  InsightsHubContext,
  InsightsLearningLine,
  InsightsNextBestAction,
  InsightsProjectPhaseId,
  InsightsProjectPhaseStep,
  InsightsSnapshotSummary,
  InsightsTimelineSummary,
  StudioInsightsHubInput,
  StudioInsightsHubView,
} from "@/types/studio-insights-hub";
import type { StudioStoryboardDetail } from "@/types/studio-api";

const PHASE_ORDER: InsightsProjectPhaseId[] = [
  "idea",
  "structure",
  "assets",
  "images",
  "audio",
  "render",
  "ready",
];

const PHASE_LABEL_KEYS: Record<InsightsProjectPhaseId, string> = {
  idea: "studio.insightsHub.phase.idea",
  structure: "studio.insightsHub.phase.structure",
  assets: "studio.insightsHub.phase.assets",
  images: "studio.insightsHub.phase.images",
  audio: "studio.insightsHub.phase.audio",
  render: "studio.insightsHub.phase.render",
  ready: "studio.insightsHub.phase.ready",
};

const SOURCE_LABEL_KEYS: Record<InsightsExplanationSource, string> = {
  generation_plan: "studio.insightsHub.source.generationPlan",
  story_architect: "studio.insightsHub.source.storyArchitect",
  director_preferences: "studio.insightsHub.source.directorPreferences",
  creative_review: "studio.insightsHub.source.creativeReview",
  production_planner: "studio.insightsHub.source.productionPlanner",
  production_memory: "studio.insightsHub.source.productionMemory",
  readiness: "studio.insightsHub.source.readiness",
  creation_assistant: "studio.insightsHub.source.creationAssistant",
};

function mapTaskSource(source: CreationAssistantTaskSource): InsightsExplanationSource {
  switch (source) {
    case "generation_plan":
      return "generation_plan";
    case "story_architect":
      return "story_architect";
    case "director_decision":
      return "director_preferences";
    case "creative_review":
      return "creative_review";
    case "production_plan":
    case "creation_guidance":
    case "domain_check":
      return "production_planner";
    case "readiness_fix":
      return "readiness";
    case "character_voice":
    case "voice_library":
      return "creation_assistant";
    default:
      return "creation_assistant";
  }
}

function taskToExplanation(task: CreationAssistantTask, index: number): InsightsExplanation {
  const source = mapTaskSource(task.source);
  return {
    id: `explain-${task.id}-${index}`,
    messageKey: task.messageKey,
    messageParams: task.messageParams,
    source,
    sourceLabelKey: SOURCE_LABEL_KEYS[source],
    toolId: task.toolId,
  };
}

function deriveCurrentPhase(
  storyboard: StudioStoryboardDetail,
  domainReadiness: ProductionDomainReadiness[]
): InsightsProjectPhaseId {
  const hasIdea = Boolean(storyboard.aiDirectorPrompt?.trim());
  const hasScenes = (storyboard.scenes?.length ?? 0) > 0;
  if (!hasIdea && !hasScenes) {
    return "idea";
  }

  const passed = Object.fromEntries(domainReadiness.map((domain) => [domain.id, domain.passed]));
  if (!passed.story) {
    return "structure";
  }
  if (!passed.assets) {
    return "assets";
  }
  if (!passed.images) {
    return "images";
  }
  if (!passed.audio) {
    return "audio";
  }
  if (!passed.render) {
    return "render";
  }
  return "ready";
}

function buildProjectPhases(current: InsightsProjectPhaseId): InsightsProjectPhaseStep[] {
  const currentIndex = PHASE_ORDER.indexOf(current);
  return PHASE_ORDER.map((id, index) => ({
    id,
    labelKey: PHASE_LABEL_KEYS[id],
    status:
      index < currentIndex ? "completed"
      : index === currentIndex ? "current"
      : "upcoming",
  }));
}

function domainHealthStatus(passed: boolean, weak: boolean): InsightsHealthStatus {
  if (passed) {
    return "pass";
  }
  return weak ? "warning" : "missing";
}

function buildHealthDomains(params: {
  domainReadiness: ProductionDomainReadiness[];
  storyScore: number;
  consistencyScore: number;
  characterCount: number;
}): InsightsHealthDomain[] {
  const storyDomain = params.domainReadiness.find((domain) => domain.id === "story");
  const assetsDomain = params.domainReadiness.find((domain) => domain.id === "assets");
  const audioDomain = params.domainReadiness.find((domain) => domain.id === "audio");
  const renderDomain = params.domainReadiness.find((domain) => domain.id === "render");

  const storyWeak = params.storyScore > 0 && params.storyScore < 60;
  const continuityPass =
    params.characterCount === 0 || params.consistencyScore >= 75;
  const continuityWarning =
    params.characterCount > 0 && params.consistencyScore >= 40 && params.consistencyScore < 75;

  return [
    {
      id: "story",
      labelKey: "studio.insightsHub.health.story",
      status: domainHealthStatus(Boolean(storyDomain?.passed), storyWeak),
      detailKey: storyDomain?.messageKey,
      toolId: "storyArchitecture",
    },
    {
      id: "assets",
      labelKey: "studio.insightsHub.health.assets",
      status: domainHealthStatus(Boolean(assetsDomain?.passed), false),
      detailKey: assetsDomain?.messageKey,
      toolId: "characters",
    },
    {
      id: "audio",
      labelKey: "studio.insightsHub.health.audio",
      status: domainHealthStatus(Boolean(audioDomain?.passed), false),
      detailKey: audioDomain?.messageKey,
      toolId: "voice",
    },
    {
      id: "render",
      labelKey: "studio.insightsHub.health.render",
      status: domainHealthStatus(Boolean(renderDomain?.passed), false),
      detailKey: renderDomain?.messageKey,
      toolId: "render",
    },
    {
      id: "continuity",
      labelKey: "studio.insightsHub.health.continuity",
      status:
        continuityPass ? "pass"
        : continuityWarning ? "warning"
        : "missing",
      toolId: "consistency",
    },
  ];
}

function buildExplanations(params: {
  assistantTasks: CreationAssistantTask[];
  storyRecommendationKeys: string[];
  decisionRecommendationKeys: string[];
  creativeSuggestionKeys: string[];
  generationMissingCount: number;
}): InsightsExplanation[] {
  const explanations: InsightsExplanation[] = [];

  for (const [index, task] of params.assistantTasks.entries()) {
    explanations.push(taskToExplanation(task, index));
  }

  if (params.generationMissingCount > 0) {
    explanations.push({
      id: "explain-generation-missing",
      messageKey: "studio.insightsHub.explain.imagesMissing",
      messageParams: { count: String(params.generationMissingCount) },
      source: "generation_plan",
      sourceLabelKey: SOURCE_LABEL_KEYS.generation_plan,
      toolId: "visual",
    });
  }

  for (const [index, key] of params.storyRecommendationKeys.slice(0, 3).entries()) {
    explanations.push({
      id: `explain-architect-${index}`,
      messageKey: key,
      source: "story_architect",
      sourceLabelKey: SOURCE_LABEL_KEYS.story_architect,
      toolId: "storyArchitecture",
    });
  }

  for (const [index, key] of params.decisionRecommendationKeys.slice(0, 2).entries()) {
    explanations.push({
      id: `explain-director-${index}`,
      messageKey: key,
      source: "director_preferences",
      sourceLabelKey: SOURCE_LABEL_KEYS.director_preferences,
      toolId: "directorPreferences",
    });
  }

  for (const [index, item] of params.creativeSuggestionKeys.slice(0, 2).entries()) {
    explanations.push({
      id: `explain-review-${index}`,
      messageKey: item,
      source: "creative_review",
      sourceLabelKey: SOURCE_LABEL_KEYS.creative_review,
      toolId: "creativeReview",
    });
  }

  const seen = new Set<string>();
  return explanations.filter((item) => {
    const key = `${item.messageKey}:${item.source}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, 10);
}

function buildLearningLines(params: {
  memoryPatternKey?: string;
  memoryRenderLabel?: string;
  sceneCountMin?: number;
  sceneCountMax?: number;
  directorLearningKeys: string[];
}): InsightsLearningLine[] {
  const lines: InsightsLearningLine[] = [];

  if (params.sceneCountMin != null && params.sceneCountMax != null) {
    lines.push({
      id: "learn-scene-count",
      messageKey: "studio.insightsHub.learn.sceneCount",
      messageParams: {
        min: String(params.sceneCountMin),
        max: String(params.sceneCountMax),
      },
      source: "director_preferences",
    });
  }

  for (const [index, key] of params.directorLearningKeys.slice(0, 3).entries()) {
    lines.push({
      id: `learn-director-${index}`,
      messageKey: key,
      source: "director_preferences",
    });
  }

  if (params.memoryPatternKey) {
    lines.push({
      id: "learn-memory-pattern",
      messageKey: params.memoryPatternKey,
      source: "production_memory",
    });
  }

  if (params.memoryRenderLabel) {
    lines.push({
      id: "learn-memory-render",
      messageKey: "studio.insightsHub.learn.renderStrategy",
      messageParams: { strategy: params.memoryRenderLabel },
      source: "production_memory",
    });
  }

  return lines.slice(0, 6);
}

function buildSnapshotSummary(params: {
  storyboardId: string;
  storyboardUpdatedAt: string;
  directorAudits: ReturnType<typeof loadDirectorDecisionRegistry>["audits"];
  timelineEvents: ProductionTimelineEvent[];
}): InsightsSnapshotSummary {
  const recovery = findLastSafeRecoveryPoint(params.storyboardId, params.storyboardUpdatedAt);

  const snapshotEvent = params.timelineEvents.find(
    (event) => event.kind === "snapshot_created" || event.kind === "snapshot_restored"
  );
  const directorAudit = params.directorAudits.find(
    (audit) =>
      audit.kind === "director_applied"
      || audit.kind === "director_partially_applied"
      || audit.kind === "director_modified"
  );

  return {
    recoveryPoint:
      recovery ?
        {
          snapshotId: recovery.snapshotId,
          labelKey: recovery.labelKey,
          labelParams: recovery.labelParams,
          sceneCount: recovery.sceneCount,
          isStale: recovery.isStale,
        }
      : null,
    lastMajorChangeKey: snapshotEvent?.titleKey ?? null,
    lastMajorChangeParams: snapshotEvent?.titleParams,
    lastDirectorApplyKey:
      directorAudit ?
        directorAudit.kind === "director_applied"
          ? "studio.productionTimeline.event.directorApplied"
        : directorAudit.kind === "director_partially_applied"
          ? "studio.productionTimeline.event.directorPartiallyApplied"
          : "studio.productionTimeline.event.directorModified"
      : null,
    lastDirectorApplyParams:
      directorAudit ?
        {
          scenes: String(directorAudit.proposalSceneCount),
          applied: String(directorAudit.appliedSceneCount ?? directorAudit.proposalSceneCount),
          changes: String(directorAudit.changes.length),
        }
      : undefined,
  };
}

function buildTimelineSummary(events: ProductionTimelineEvent[]): InsightsTimelineSummary {
  const now = Date.now();
  const dayMs = 86_400_000;
  const weekMs = dayMs * 7;

  const todayCount = events.filter((event) => now - Date.parse(event.at) <= dayMs).length;
  const weekCount = events.filter((event) => now - Date.parse(event.at) <= weekMs).length;

  const priorityKinds = new Set([
    "director_applied",
    "director_modified",
    "director_rejected",
    "snapshot_created",
    "asset_created",
    "scene_added",
  ]);
  const highlight =
    events.find((event) => priorityKinds.has(event.kind))
    ?? events[0]
    ?? null;

  return {
    todayCount,
    weekCount,
    highlightKey: highlight?.titleKey ?? null,
    highlightParams: highlight?.titleParams,
  };
}

function pickNextBestAction(
  blockers: CreationAssistantTask[],
  nowTasks: CreationAssistantTask[]
): InsightsNextBestAction | null {
  const task = blockers[0] ?? nowTasks[0];
  if (!task) {
    return null;
  }
  const source = mapTaskSource(task.source);
  return {
    messageKey: task.messageKey,
    messageParams: task.messageParams,
    toolId: task.toolId,
    sourceLabelKey: SOURCE_LABEL_KEYS[source],
  };
}

function buildInsightSummaryContextLines(view: StudioInsightsHubView): string[] {
  const lines = [`phase:${view.currentPhase}`];
  if (view.nextBestAction) {
    lines.push(`next:${view.nextBestAction.messageKey}`);
  }
  for (const domain of view.healthDomains.filter((item) => item.status !== "pass")) {
    lines.push(`health:${domain.id}:${domain.status}`);
  }
  for (const line of view.learningLines.slice(0, 2)) {
    lines.push(`learn:${line.messageKey}`);
  }
  return lines.slice(0, 8);
}

export function buildStudioInsightsHubView(input: StudioInsightsHubInput): StudioInsightsHubView {
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
  const currentIdea = input.currentIdea ?? storyboard.aiDirectorPrompt ?? "";

  const creationAssistant = buildCreationAssistantView(input);

  const productionPlan = buildStudioProductionPlan({
    storyboard,
    characters,
    locations,
    props,
    worlds,
    projectMemory: input.projectMemory,
    assetDecisionRegistry: input.assetDecisionRegistry,
  });

  const creativeReview = buildCreativeReview({
    storyboard,
    characters,
    locations,
    props,
    worlds,
    projectMemory: input.projectMemory,
    currentIdea,
    styleProfile,
    directorProfile,
  });

  const storyArchitecture = buildStoryArchitecture({
    userIdea: currentIdea,
    storyboard,
    characters,
    locations,
    props,
    worlds,
    projectMemory: input.projectMemory,
    assetDecisionRegistry: input.assetDecisionRegistry,
    directorProfile,
    styleProfile,
  });

  const productionMemory = buildProductionMemoryContext({
    memory: input.projectMemory ?? emptyProjectMemorySnapshot(),
    currentIdea,
    libraries: { characters, worlds },
  });

  const decisionMemory = buildDirectorDecisionMemoryContext({
    storyboardId: storyboard.id,
    storyboard,
  });

  const directorRegistry = loadDirectorDecisionRegistry(storyboard.id);
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
      directorApplyAudits: directorRegistry.audits,
      directorApplyBaseline: directorRegistry.applyBaseline,
    });

  const generationPlan = buildSceneGenerationPlan({
    storyboard,
    characters,
    locations,
    props,
    worlds,
    styleProfile,
    directorProfile,
  });

  const consistency = buildCharacterConsistencySummary(characters);
  const currentPhase = deriveCurrentPhase(storyboard, productionPlan.domainReadiness);

  const assistantTasks = [
    ...creationAssistant.blockers,
    ...creationAssistant.nowTasks.slice(0, 6),
  ];

  const voiceOrchestration = buildCharacterVoiceOrchestration({
    storyboard,
    characters,
    language: (storyboard.voiceLanguage ?? "en").slice(0, 2),
    storyArchitecture,
    projectMemory: input.projectMemory ?? emptyProjectMemorySnapshot(),
  });
  const voiceCastSummary = buildInsightsVoiceCastSummary(voiceOrchestration);

  const view: StudioInsightsHubView = {
    version: 1,
    currentPhase,
    projectPhases: buildProjectPhases(currentPhase),
    healthDomains: buildHealthDomains({
      domainReadiness: productionPlan.domainReadiness,
      storyScore: creativeReview.storyReview.score,
      consistencyScore: consistency.overallScore,
      characterCount: characters.length,
    }),
    explanations: buildExplanations({
      assistantTasks,
      storyRecommendationKeys: storyArchitecture.recommendationKeys,
      decisionRecommendationKeys: decisionMemory.recommendationKeys,
      creativeSuggestionKeys: creativeReview.improvementSuggestions.map((item) => item.messageKey),
      generationMissingCount: generationPlan.requiredImages.filter((img) => img.status === "missing").length,
    }),
    learningLines: [
      ...buildLearningLines({
        memoryPatternKey: productionMemory.profile.productionPatterns[0]?.labelKey,
        memoryRenderLabel: productionMemory.profile.recurringRenderStrategies[0]?.label,
        sceneCountMin: decisionMemory.memory.preferredSceneCountMin,
        sceneCountMax: decisionMemory.memory.preferredSceneCountMax,
        directorLearningKeys: decisionMemory.memory.learningSummaryKeys,
      }),
      ...voiceOrchestration.castAdvisories.map((advisory) => ({
        id: advisory.id,
        messageKey: advisory.messageKey,
        messageParams: advisory.messageParams,
        source: "production_memory" as const,
      })),
    ],
    snapshotSummary: buildSnapshotSummary({
      storyboardId: storyboard.id,
      storyboardUpdatedAt: storyboard.updatedAt,
      directorAudits: directorRegistry.audits,
      timelineEvents: timeline.timelineEvents,
    }),
    timelineSummary: buildTimelineSummary(timeline.timelineEvents),
    nextBestAction: pickNextBestAction(creationAssistant.blockers, creationAssistant.nowTasks),
    insightSummaryContextLines: [],
    voiceCastSummary,
  };

  view.insightSummaryContextLines = buildInsightSummaryContextLines(view);
  return view;
}

export function buildInsightsHubContext(input: StudioInsightsHubInput): InsightsHubContext {
  const view = buildStudioInsightsHubView(input);
  return {
    view,
    contextLines: view.insightSummaryContextLines,
    recommendationKeys: view.explanations.slice(0, 4).map((item) => item.messageKey),
  };
}

export function enrichIdeaWithInsightsHub(idea: string, context: InsightsHubContext): string {
  if (context.contextLines.length === 0) {
    return idea;
  }
  const summary = context.contextLines.join("; ");
  return `[Project insights: ${summary}]\n${idea.trim()}`.trim();
}
