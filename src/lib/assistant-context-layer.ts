import {
  HC_PROJECT_WORKFLOW_STATUSES,
  readHcProjectWorkflowStatus,
  type HcProjectWorkflowStatus,
} from "@/lib/hc-project-lifecycle";
import {
  listAssetsForProjectIndex,
  listCharactersInLibraryIndex,
  listFusionOutputsInLibraryIndex,
  listMotionVideosInLibraryIndex,
  listPublishExportsInLibraryIndex,
  queryLibraryAssetIndex,
  summarizeLibraryAssetsForProject,
  type LibraryAssetIndexEntry,
} from "@/lib/library-asset-index";
import { listHomeCheffProjectsFiltered } from "@/lib/homecheff-project-persist";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export type AssistantProjectContext = {
  id: string;
  title: string;
  projectType: HomeCheffProjectPackage["projectType"];
  workflowStatus: HcProjectWorkflowStatus;
  storyboardId: string | null;
  isArchived: boolean;
  assetStats: ReturnType<typeof summarizeLibraryAssetsForProject>;
};

export type AssistantStoryboardContext = {
  storyboardId: string;
  projectId: string;
  projectTitle: string;
};

export type AssistantLibraryContext = {
  characters: LibraryAssetIndexEntry[];
  fusionOutputs: LibraryAssetIndexEntry[];
  motionVideos: LibraryAssetIndexEntry[];
  publishExports: LibraryAssetIndexEntry[];
  references: LibraryAssetIndexEntry[];
  voice: LibraryAssetIndexEntry[];
  music: LibraryAssetIndexEntry[];
  sfx: LibraryAssetIndexEntry[];
  assets: LibraryAssetIndexEntry[];
};

export type AssistantContextSnapshot = {
  projects: AssistantProjectContext[];
  storyboards: AssistantStoryboardContext[];
  library: AssistantLibraryContext;
};

export type AssistantContextQuery = {
  projectId?: string;
  workflowStatus?: HcProjectWorkflowStatus;
  textSearch?: string;
  limit?: number;
};

function toAssistantProjectContext(
  project: HomeCheffProjectPackage,
  libraryRecords: LibraryConsistencyRecord[]
): AssistantProjectContext {
  return {
    id: project.id,
    title: project.title,
    projectType: project.projectType,
    workflowStatus: readHcProjectWorkflowStatus(project),
    storyboardId: project.servicePayload?.studio?.storyboardId ?? null,
    isArchived: Boolean(project.isArchived),
    assetStats: summarizeLibraryAssetsForProject(libraryRecords, project.id),
  };
}

function extractStoryboardContexts(projects: AssistantProjectContext[]): AssistantStoryboardContext[] {
  const seen = new Set<string>();
  const storyboards: AssistantStoryboardContext[] = [];
  for (const project of projects) {
    if (!project.storyboardId || seen.has(project.storyboardId)) {
      continue;
    }
    seen.add(project.storyboardId);
    storyboards.push({
      storyboardId: project.storyboardId,
      projectId: project.id,
      projectTitle: project.title,
    });
  }
  return storyboards;
}

function buildLibraryContext(
  records: LibraryConsistencyRecord[],
  query?: AssistantContextQuery
): AssistantLibraryContext {
  const scoped =
    query?.projectId != null
      ? records.filter((record) => record.projectId === query.projectId)
      : records;

  return {
    characters: listCharactersInLibraryIndex(scoped),
    fusionOutputs: listFusionOutputsInLibraryIndex(scoped),
    motionVideos: listMotionVideosInLibraryIndex(scoped),
    publishExports: listPublishExportsInLibraryIndex(scoped),
    references: queryLibraryAssetIndex(scoped, { category: "images", limit: query?.limit ?? 200 }),
    voice: queryLibraryAssetIndex(scoped, { category: "voices", limit: query?.limit ?? 200 }),
    music: queryLibraryAssetIndex(scoped, { category: "music", limit: query?.limit ?? 200 }),
    sfx: queryLibraryAssetIndex(scoped, { category: "sfx", limit: query?.limit ?? 200 }),
    assets: query?.projectId
      ? listAssetsForProjectIndex(scoped, query.projectId)
      : queryLibraryAssetIndex(scoped, { limit: query?.limit ?? 500 }),
  };
}

export function buildAssistantContextSnapshot(input: {
  projects: HomeCheffProjectPackage[];
  libraryRecords: LibraryConsistencyRecord[];
  query?: AssistantContextQuery;
}): AssistantContextSnapshot {
  const limit = input.query?.limit ?? 100;
  const hay = input.query?.textSearch?.trim().toLowerCase();

  let projects = input.projects.map((project) =>
    toAssistantProjectContext(project, input.libraryRecords)
  );

  if (input.query?.projectId) {
    projects = projects.filter((project) => project.id === input.query?.projectId);
  }
  if (input.query?.workflowStatus) {
    projects = projects.filter((project) => project.workflowStatus === input.query?.workflowStatus);
  }
  if (hay) {
    projects = projects.filter((project) => project.title.toLowerCase().includes(hay));
  }

  projects = projects.slice(0, limit);

  return {
    projects,
    storyboards: extractStoryboardContexts(projects),
    library: buildLibraryContext(input.libraryRecords, input.query),
  };
}

export function loadAssistantContextFromPersistedState(
  query: AssistantContextQuery = {}
): AssistantContextSnapshot {
  const projects = listHomeCheffProjectsFiltered("hc", query.limit ?? 200);
  return buildAssistantContextSnapshot({
    projects,
    libraryRecords: [],
    query,
  });
}

export function validateAssistantProjectLifecycleCoverage(
  projects: HomeCheffProjectPackage[]
): { ok: true } | { ok: false; issues: string[] } {
  const issues: string[] = [];
  for (const project of projects) {
    const status = readHcProjectWorkflowStatus(project);
    if (!HC_PROJECT_WORKFLOW_STATUSES.includes(status)) {
      issues.push(`Project ${project.id} has unknown workflow status: ${String(status)}`);
    }
    if (!project.id?.trim()) {
      issues.push("Encountered project without id.");
    }
  }
  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

export function validateLibraryRecordsLinkedToProjects(
  records: LibraryConsistencyRecord[],
  projectIds: Set<string>
): { ok: true } | { ok: false; orphanAssetIds: string[] } {
  const orphanAssetIds: string[] = [];
  for (const record of records) {
    if (record.projectId && !projectIds.has(record.projectId)) {
      orphanAssetIds.push(record.registryAssetId);
    }
  }
  return orphanAssetIds.length === 0 ? { ok: true } : { ok: false, orphanAssetIds };
}
