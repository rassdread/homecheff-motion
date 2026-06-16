import { detectAssistantRecommendationPage } from "@/lib/assistant-recommendation-engine";
import type {
  AssistantPreparedAssetRef,
  AssistantStudioBrainInput,
  AssistantStudioContext,
  AssistantStudioRouteContext,
  AssistantUnfinishedFlow,
} from "@/types/assistant-studio-brain";

function routeModule(pathname: string): AssistantStudioRouteContext["module"] {
  const page = detectAssistantRecommendationPage(pathname);
  if (page === "home") {
    return "home";
  }
  return page;
}

function buildPreparedAssets(input: AssistantStudioBrainInput): AssistantPreparedAssetRef[] {
  const refs: AssistantPreparedAssetRef[] = [];
  for (const character of input.snapshot.library.characters.slice(0, 12)) {
    refs.push({
      assetId: character.registryAssetId,
      assetName: character.assetName,
      kind: "character",
      source: "library",
    });
  }
  for (const fusion of input.snapshot.library.fusionOutputs.slice(0, 8)) {
    refs.push({
      assetId: fusion.registryAssetId,
      assetName: fusion.assetName,
      kind: "fusion",
      source: "library",
    });
  }
  return refs;
}

function buildUnfinishedFlows(input: AssistantStudioBrainInput): AssistantUnfinishedFlow[] {
  const flows: AssistantUnfinishedFlow[] = [];
  if (input.pendingPrefillId) {
    flows.push({
      id: "pending_prefill",
      label: "Assistant wizard prefill waiting",
      reason: "pending_prefill",
    });
  }
  for (const project of input.snapshot.projects) {
    if (project.workflowStatus === "concept" || project.workflowStatus === "in_progress") {
      flows.push({
        id: `project_${project.id}`,
        label: project.title,
        route: `/projects?hcProject=${project.id}`,
        reason: "draft_project",
      });
    }
  }
  return flows.slice(0, 8);
}

export function buildAssistantStudioContext(input: AssistantStudioBrainInput): AssistantStudioContext {
  const project =
    input.activeProjectId != null
      ? input.snapshot.projects.find((row) => row.id === input.activeProjectId) ?? null
      : input.snapshot.projects[0] ?? null;

  return {
    route: {
      pathname: input.pathname,
      module: routeModule(input.pathname),
    },
    project,
    storyboardId: project?.storyboardId ?? null,
    characters: input.snapshot.library.characters,
    assets: input.snapshot.library.assets,
    preparedAssets: buildPreparedAssets(input),
    recentAssistantActions: (input.recentHistory ?? []).slice(0, 8),
    unfinishedFlows: buildUnfinishedFlows(input),
    usageSummary: input.usageSummary ?? {},
    projectMemory: input.projectMemory ?? null,
  };
}

export function studioContextHasCharacters(context: AssistantStudioContext): boolean {
  return context.characters.length > 0;
}

export function studioContextPrimaryCharacterName(context: AssistantStudioContext): string | null {
  const fromMemory = context.projectMemory?.lastSuccessfulPlan?.characterName;
  if (fromMemory) {
    return fromMemory;
  }
  const projectCharacter = context.project
    ? context.characters.find((row) => row.projectId === context.project?.id)
    : null;
  return projectCharacter?.assetName ?? context.characters[0]?.assetName ?? null;
}
