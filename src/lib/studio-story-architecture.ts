/**
 * Studio V2 — Story Architect builder.
 * Prompt → story structure → narrative moments → scenes (via AI Director consumption).
 */

import { detectArcPhaseForIndex, type StoryArcPhase } from "@/lib/studio-story-arc";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import { resolveProductionMemoryProfile } from "@/lib/studio-production-memory-integration";
import type {
  BuildStoryArchitectureInput,
  StoryArchitectSummary,
  StoryArchitecture,
  StoryArchitectureContext,
  StoryNarrativeMoment,
  StoryNarrativeMomentId,
} from "@/types/studio-story-architecture";
import type {
  ProductionStoryStructurePhase,
  StoryStructurePhaseId,
  StoryStructurePhaseStatus,
} from "@/types/studio-production-plan";
import type { ProposalStoryEntities } from "@/lib/studio-scene-beat-translation";
import { buildMomentSceneParams } from "@/lib/studio-scene-beat-translation";
import type { StudioSceneDetail } from "@/types/studio-api";

const DEFAULT_PLANNED_SCENE_COUNT = 5;

function topicFromIdea(idea: string): string {
  const trimmed = idea.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "";
  }
  const firstSentence = trimmed.split(/[.!?]/)[0]?.trim() ?? trimmed;
  if (firstSentence.length <= 72) {
    return firstSentence;
  }
  return `${firstSentence.slice(0, 69).trim()}…`;
}

const MOMENT_DEFINITIONS: Array<{
  id: StoryNarrativeMomentId;
  labelKey: string;
  beatKey: string;
  structurePhase: StoryStructurePhaseId;
  arcPhases: StoryArcPhase[];
}> = [
  {
    id: "departure",
    labelKey: "studio.storyArchitect.moment.departure",
    beatKey: "studio.storyArchitect.moment.departure.beat",
    structurePhase: "intro",
    arcPhases: ["opening"],
  },
  {
    id: "discovery",
    labelKey: "studio.storyArchitect.moment.discovery",
    beatKey: "studio.storyArchitect.moment.discovery.beat",
    structurePhase: "setup",
    arcPhases: ["discovery"],
  },
  {
    id: "conflict",
    labelKey: "studio.storyArchitect.moment.conflict",
    beatKey: "studio.storyArchitect.moment.conflict.beat",
    structurePhase: "development",
    arcPhases: ["build_up", "transition"],
  },
  {
    id: "breakthrough",
    labelKey: "studio.storyArchitect.moment.breakthrough",
    beatKey: "studio.storyArchitect.moment.breakthrough.beat",
    structurePhase: "climax",
    arcPhases: ["climax"],
  },
  {
    id: "closing",
    labelKey: "studio.storyArchitect.moment.closing",
    beatKey: "studio.storyArchitect.moment.closing.beat",
    structurePhase: "ending",
    arcPhases: ["resolution", "outro"],
  },
];

const STRUCTURE_PHASE_LABEL: Record<StoryStructurePhaseId, string> = {
  intro: "studio.productionPlan.story.intro",
  setup: "studio.productionPlan.story.setup",
  development: "studio.productionPlan.story.development",
  climax: "studio.productionPlan.story.climax",
  ending: "studio.productionPlan.story.ending",
};

function deriveStoryGoal(topic: string, briefGoal?: string): string {
  const goal = briefGoal?.trim();
  if (goal) {
    return goal.slice(0, 160);
  }
  if (!topic) {
    return "";
  }
  return `Share ${topic}`.slice(0, 160);
}

function deriveTheme(
  input: BuildStoryArchitectureInput,
  topic: string
): string {
  if (input.productionBrief?.contentTypeLabelKey) {
    return input.productionBrief.contentTypeLabelKey;
  }
  const memoryProfile = input.projectMemory
    ? resolveProductionMemoryProfile({
        projectMemory: input.projectMemory,
        currentIdea: input.userIdea,
        characters: input.characters,
        worlds: input.worlds,
      })
    : null;
  const topPattern = memoryProfile?.productionPatterns[0];
  if (topPattern) {
    return topPattern.labelKey;
  }
  return topic ? "studio.storyArchitect.theme.general" : "studio.storyArchitect.theme.unset";
}

function deriveMessage(topic: string, brief?: BuildStoryArchitectureInput["productionBrief"]): string {
  const cta = brief?.callToAction?.trim();
  if (cta) {
    return cta.slice(0, 200);
  }
  const goal = brief?.goal?.trim();
  if (goal) {
    return goal.slice(0, 200);
  }
  return topic.slice(0, 200);
}

function buildPlannedStoryStructure(sceneCount: number): ProductionStoryStructurePhase[] {
  const phaseToOrders = new Map<StoryStructurePhaseId, number[]>();
  for (const phase of Object.keys(STRUCTURE_PHASE_LABEL) as StoryStructurePhaseId[]) {
    phaseToOrders.set(phase, []);
  }
  for (let index = 0; index < sceneCount; index += 1) {
    const arcPhase = detectArcPhaseForIndex(index, sceneCount);
    for (const definition of MOMENT_DEFINITIONS) {
      if (definition.arcPhases.includes(arcPhase)) {
        phaseToOrders.get(definition.structurePhase)!.push(index);
      }
    }
  }
  return (Object.keys(STRUCTURE_PHASE_LABEL) as StoryStructurePhaseId[]).map((phase) => {
    const sceneOrders = phaseToOrders.get(phase) ?? [];
    let status: StoryStructurePhaseStatus = "missing";
    if (sceneOrders.length >= 2) {
      status = "strong";
    } else if (sceneOrders.length === 1) {
      status = "present";
    } else if (sceneCount > 0) {
      status = "weak";
    }
    return {
      phase,
      status,
      sceneOrders,
      labelKey: STRUCTURE_PHASE_LABEL[phase],
    };
  });
}

function buildStoryMoments(
  storyStructure: ProductionStoryStructurePhase[],
  storyGoal: string,
  theme: string,
  message: string
): StoryNarrativeMoment[] {
  const baseParams = { storyGoal, theme, message };

  return MOMENT_DEFINITIONS.map((definition, order) => {
    const structure = storyStructure.find((phase) => phase.phase === definition.structurePhase);
    return {
      id: definition.id,
      labelKey: definition.labelKey,
      beatKey: definition.beatKey,
      order,
      structurePhase: definition.structurePhase,
      arcPhases: definition.arcPhases,
      sceneOrders: structure?.sceneOrders ?? [],
      status: structure?.status ?? "missing",
      beatParams: {
        ...baseParams,
        moment: definition.id,
      },
    };
  });
}

function buildDirectorContextLines(architecture: StoryArchitecture): string[] {
  const lines = [
    `story:goal:${architecture.storyGoal.slice(0, 80)}`,
    `story:message:${architecture.message.slice(0, 80)}`,
    `story:moments:${architecture.storyMoments.length}`,
  ];
  for (const phase of architecture.storyStructure) {
    lines.push(`story:phase:${phase.phase}:${phase.status}`);
  }
  return lines;
}

function buildRecommendationKeys(architecture: StoryArchitecture): string[] {
  const keys: string[] = [];
  const climax = architecture.storyStructure.find((phase) => phase.phase === "climax");
  const ending = architecture.storyStructure.find((phase) => phase.phase === "ending");
  if (climax?.status === "missing" || climax?.status === "weak") {
    keys.push("studio.storyArchitect.task.missingClimax");
  }
  if (ending?.status === "missing" || ending?.status === "weak") {
    keys.push("studio.storyArchitect.task.missingEnding");
  }
  if (!architecture.message.trim()) {
    keys.push("studio.storyArchitect.task.unclearMessage");
  }
  return keys.slice(0, 6);
}

export function emptyStoryArchitecture(): StoryArchitecture {
  return {
    version: 1,
    storyGoal: "",
    theme: "studio.storyArchitect.theme.unset",
    message: "",
    storyStructure: buildPlannedStoryStructure(0),
    storyMoments: [],
    narrativeFlow: [],
    directorContextLines: [],
    recommendationKeys: [],
  };
}

export function buildStoryArchitecture(input: BuildStoryArchitectureInput): StoryArchitecture {
  const idea =
    input.userIdea?.trim()
    || input.productionBrief?.idea?.trim()
    || input.storyboard?.aiDirectorPrompt?.trim()
    || "";
  const topic = topicFromIdea(idea);
  const storyGoal = deriveStoryGoal(topic, input.productionBrief?.goal);
  const theme = deriveTheme(input, topic);
  const message = deriveMessage(topic, input.productionBrief);

  let storyStructure: ProductionStoryStructurePhase[];
  if (input.storyboard && (input.storyboard.scenes?.length ?? 0) > 0) {
    const productionPlan = buildStudioProductionPlan({
      storyboard: input.storyboard,
      characters: input.characters,
      locations: input.locations,
      props: input.props,
      worlds: input.worlds,
      projectMemory: input.projectMemory,
      assetDecisionRegistry: input.assetDecisionRegistry,
      productionBrief: input.productionBrief ?? undefined,
    });
    storyStructure = productionPlan.storyStructure;
  } else {
    const sceneCount = input.plannedSceneCount ?? DEFAULT_PLANNED_SCENE_COUNT;
    storyStructure = buildPlannedStoryStructure(sceneCount);
  }

  const storyMoments = buildStoryMoments(storyStructure, storyGoal, theme, message);
  const architecture: StoryArchitecture = {
    version: 1,
    storyGoal,
    theme,
    message,
    storyStructure,
    storyMoments,
    narrativeFlow: storyMoments.map((moment) => moment.labelKey),
    directorContextLines: [],
    recommendationKeys: [],
  };
  architecture.directorContextLines = buildDirectorContextLines(architecture);
  architecture.recommendationKeys = buildRecommendationKeys(architecture);
  return architecture;
}

export function pickStoryMomentForPhase(
  architecture: StoryArchitecture,
  arcPhase: StoryArcPhase
): StoryNarrativeMoment {
  return (
    architecture.storyMoments.find((moment) => moment.arcPhases.includes(arcPhase))
    ?? architecture.storyMoments[0]
    ?? {
      id: "departure",
      labelKey: "studio.storyArchitect.moment.departure",
      beatKey: "studio.storyArchitect.moment.departure.beat",
      order: 0,
      structurePhase: "intro",
      arcPhases: ["opening"],
      sceneOrders: [],
      status: "missing",
      beatParams: {
        storyGoal: architecture.storyGoal,
        theme: architecture.theme,
        message: architecture.message,
        moment: "departure",
      },
    }
  );
}

export function architectureSceneTemplateKeys(momentId: StoryNarrativeMomentId): {
  titleKey: string;
  descriptionKey: string;
  actionKey: string;
} {
  return {
    titleKey: `studio.storyArchitect.scene.${momentId}.title`,
    descriptionKey: `studio.storyArchitect.scene.${momentId}.description`,
    actionKey: `studio.storyArchitect.scene.${momentId}.action`,
  };
}

export function sceneParamsFromStoryArchitecture(
  architecture: StoryArchitecture,
  moment: StoryNarrativeMoment,
  sceneIndex: number,
  sceneCount: number,
  entities?: ProposalStoryEntities
): Record<string, string> {
  if (entities) {
    return buildMomentSceneParams(architecture, moment, sceneIndex, sceneCount, entities);
  }
  return {
    ...moment.beatParams,
    topic: architecture.message.slice(0, 72) || architecture.storyGoal.slice(0, 72),
    scene: String(sceneIndex + 1),
    scenes: String(sceneCount),
  };
}

export function buildStoryArchitectSummary(architecture: StoryArchitecture): StoryArchitectSummary {
  const strongPhases = architecture.storyStructure.filter(
    (phase) => phase.status === "strong" || phase.status === "present"
  ).length;
  return {
    storyGoal: architecture.storyGoal,
    theme: architecture.theme,
    message: architecture.message,
    momentCount: architecture.storyMoments.length,
    structureComplete: strongPhases >= 4,
    labelKey: "studio.storyArchitect.summary.line",
    params: {
      goal: architecture.storyGoal,
      moments: String(architecture.storyMoments.length),
      phases: String(strongPhases),
    },
  };
}

export function buildStoryArchitectureContext(
  input: BuildStoryArchitectureInput
): StoryArchitectureContext {
  const architecture = buildStoryArchitecture(input);
  return {
    architecture,
    contextLines: architecture.directorContextLines,
    recommendationKeys: architecture.recommendationKeys,
  };
}

export function enrichIdeaWithStoryArchitecture(
  idea: string,
  context: StoryArchitectureContext
): string {
  if (context.contextLines.length === 0) {
    return idea;
  }
  const flowHint =
    context.architecture.narrativeFlow.length > 0 ?
      `Flow: ${context.architecture.narrativeFlow.join(" → ")}`
    : "";
  const lines = [...context.contextLines, flowHint].filter(Boolean).join("; ");
  return `[Story architecture: ${lines}]\n${idea.trim()}`.trim();
}

export function storyArchitectTasksFromArchitecture(
  architecture: StoryArchitecture
): Array<{ id: string; messageKey: string; messageParams?: Record<string, string> }> {
  const tasks: Array<{ id: string; messageKey: string; messageParams?: Record<string, string> }> = [];

  for (const key of architecture.recommendationKeys) {
    tasks.push({ id: `story-arch-${key}`, messageKey: key });
  }

  for (const phase of architecture.storyStructure) {
    if (phase.status === "strong" || phase.status === "present") {
      continue;
    }
    const taskKey =
      phase.phase === "climax" ? "studio.storyArchitect.task.missingClimax"
      : phase.phase === "ending" ? "studio.storyArchitect.task.missingEnding"
      : phase.status === "missing" ? "studio.storyArchitect.task.missingPhase"
      : "studio.storyArchitect.task.weakPhase";
    tasks.push({
      id: `story-arch-phase-${phase.phase}`,
      messageKey: taskKey,
      messageParams: { phase: phase.phase },
    });
  }

  return tasks.slice(0, 6);
}

export function detectStoryMomentForScene(
  scene: StudioSceneDetail,
  sceneCount: number,
  architecture: StoryArchitecture
): StoryNarrativeMoment {
  const arcPhase = detectArcPhaseForIndex(scene.order, sceneCount);
  return pickStoryMomentForPhase(architecture, arcPhase);
}
