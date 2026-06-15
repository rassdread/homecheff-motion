import { buildHomeCheffProjectFromEditorDocument, mergeHomeCheffProject } from "@/lib/homecheff-project-build";
import { linkDocumentToHcProject } from "@/lib/homecheff-project-handoff-routes";
import {
  extendHcProjectWithMotionState,
  extendHcProjectWithPublishState,
} from "@/lib/homecheff-project-handoff";
import { createHomeCheffProjectId, defaultProjectPermissions } from "@/lib/homecheff-project-package-core";
import { loadHomeCheffProject, persistHomeCheffProject } from "@/lib/homecheff-project-persist";
import { persistHcProjectWithSync } from "@/lib/homecheff-project-sync";
import { storeStudioWorkflowInHc } from "@/lib/hc-workflow-v2";
import {
  HOMECHEFF_PACKAGE_VERSION,
  type HomeCheffProjectPackage,
  type HomeCheffProjectType,
  type HomeCheffServicePayload,
} from "@/types/homecheff-project-package";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type HcProjectWorkflowStatus =
  | "concept"
  | "in_progress"
  | "motion_ready"
  | "publish_ready"
  | "exported"
  | "archived";

export const HC_PROJECT_WORKFLOW_STATUSES: HcProjectWorkflowStatus[] = [
  "concept",
  "in_progress",
  "motion_ready",
  "publish_ready",
  "exported",
  "archived",
];

export type HcProjectSourceModule = HomeCheffProjectType;

const DEFAULT_TITLE_KEYS: Record<HcProjectSourceModule, string> = {
  editor: "hcProject.defaultTitle.editor",
  studio: "hcProject.defaultTitle.studio",
  motion: "hcProject.defaultTitle.motion",
  publish: "hcProject.defaultTitle.publish",
  library: "hcProject.defaultTitle.library",
  export: "hcProject.defaultTitle.export",
};

const DEFAULT_TITLE_FALLBACK: Record<HcProjectSourceModule, string> = {
  editor: "Nieuw Editor-project",
  studio: "Nieuw Studio-verhaal",
  motion: "Nieuw Motion-project",
  publish: "Nieuw Publish-project",
  library: "Nieuw bibliotheek-project",
  export: "Nieuw export-project",
};

export function defaultHcProjectTitleKey(sourceModule: HcProjectSourceModule): string {
  return DEFAULT_TITLE_KEYS[sourceModule];
}

export function defaultHcProjectTitleFallback(sourceModule: HcProjectSourceModule): string {
  return DEFAULT_TITLE_FALLBACK[sourceModule];
}

export function isUntitledHcProjectName(name: string | undefined): boolean {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) {
    return true;
  }
  const lower = trimmed.toLowerCase();
  return (
    lower === "untitled" ||
    lower.startsWith("nieuw editor") ||
    lower.startsWith("nieuw studio") ||
    lower.startsWith("nieuw motion") ||
    lower.startsWith("nieuw publish") ||
    lower.startsWith("new editor") ||
    Object.values(DEFAULT_TITLE_FALLBACK).some((fallback) => lower === fallback.toLowerCase())
  );
}

export function readHcProjectWorkflowStatus(project: HomeCheffProjectPackage): HcProjectWorkflowStatus {
  const raw = project.metadata?.workflowStatus;
  if (typeof raw === "string" && HC_PROJECT_WORKFLOW_STATUSES.includes(raw as HcProjectWorkflowStatus)) {
    return raw as HcProjectWorkflowStatus;
  }
  if (project.isArchived) {
    return "archived";
  }
  return "in_progress";
}

export function enrichHcProjectMetadata(
  project: HomeCheffProjectPackage,
  patch: {
    workflowStatus?: HcProjectWorkflowStatus;
    currentStage?: string;
    thumbnailUrl?: string;
    sourceModule?: HcProjectSourceModule;
  }
): HomeCheffProjectPackage {
  const sourceModule = patch.sourceModule ?? project.sourceService ?? project.projectType;
  const workflowStatus = patch.workflowStatus ?? readHcProjectWorkflowStatus(project);
  const linkedEditorSessionId =
    project.servicePayload.editor?.sessionId ??
    (typeof project.workflowState.editorSessionId === "string"
      ? project.workflowState.editorSessionId
      : undefined);

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    metadata: {
      ...project.metadata,
      workflowStatus,
      sourceModule,
      currentStage: patch.currentStage ?? project.metadata.currentStage ?? project.projectType,
      thumbnailUrl:
        patch.thumbnailUrl ??
        project.metadata.thumbnailUrl ??
        project.servicePayload.editor?.documentSnapshot?.backgroundUrl ??
        project.servicePayload.motion?.thumbnailUrl,
      linkedEditorSessionId,
      linkedStoryboardId: project.servicePayload.studio?.storyboardId ?? project.metadata.linkedStoryboardId,
      linkedMotionProjectId:
        project.servicePayload.motion?.motionProjectId ?? project.metadata.linkedMotionProjectId,
      linkedPublishProjectId:
        project.servicePayload.publish?.publishProjectId ?? project.metadata.linkedPublishProjectId,
    },
    workflowState: {
      ...project.workflowState,
      editorSessionId: linkedEditorSessionId,
      workflowStatus,
    },
  };
}

export function saveEditorDocumentToHcProject(input: {
  document: EditorCanvasDocument;
  ownerId?: string;
  title?: string;
  workflowStatus?: HcProjectWorkflowStatus;
  syncToServer?: boolean;
}): { document: EditorCanvasDocument; project: HomeCheffProjectPackage } {
  const existingId = input.document.instructionStudioState?.hcProjectId;
  const existing = existingId ? loadHomeCheffProject(existingId) ?? undefined : undefined;
  const title =
    input.title?.trim() ||
    (isUntitledHcProjectName(input.document.name) ? undefined : input.document.name) ||
    existing?.title ||
    defaultHcProjectTitleFallback("editor");

  let project = buildHomeCheffProjectFromEditorDocument({
    document: input.document,
    title,
    ownerId: input.ownerId ?? existing?.ownerId,
    existing,
  });

  const namedDocument =
    title !== input.document.name
      ? { ...input.document, name: title, updatedAt: new Date().toISOString() }
      : input.document;

  project = enrichHcProjectMetadata(project, {
    workflowStatus: input.workflowStatus ?? (existing ? "in_progress" : "concept"),
    sourceModule: "editor",
    currentStage: namedDocument.workflowStep ?? "edit",
    thumbnailUrl: namedDocument.backgroundUrl,
  });

  project = persistHcProjectWithSync(project, {
    syncToServer: input.syncToServer ?? Boolean(input.ownerId),
  });
  persistHomeCheffProject(project);

  const linked = linkDocumentToHcProject(namedDocument, project.id);
  return { document: linked, project };
}

export function saveEditorDocumentAsNewHcProject(input: {
  document: EditorCanvasDocument;
  ownerId?: string;
  title?: string;
  syncToServer?: boolean;
}): { document: EditorCanvasDocument; project: HomeCheffProjectPackage } {
  const withoutLink: EditorCanvasDocument = {
    ...input.document,
    instructionStudioState: {
      ...input.document.instructionStudioState,
      hcProjectId: undefined,
    },
  };
  return saveEditorDocumentToHcProject({
    document: withoutLink,
    ownerId: input.ownerId,
    title: input.title ?? `${input.document.name || defaultHcProjectTitleFallback("editor")} (kopie)`,
    workflowStatus: "concept",
    syncToServer: input.syncToServer,
  });
}

export function renameHcProjectForDocument(input: {
  document: EditorCanvasDocument;
  title: string;
  ownerId?: string;
  syncToServer?: boolean;
}): { document: EditorCanvasDocument; project: HomeCheffProjectPackage | null } {
  const title = input.title.trim();
  if (!title) {
    return { document: input.document, project: null };
  }
  const namedDocument = {
    ...input.document,
    name: title,
    updatedAt: new Date().toISOString(),
  };
  const { document, project } = saveEditorDocumentToHcProject({
    document: namedDocument,
    ownerId: input.ownerId,
    title,
    syncToServer: input.syncToServer,
  });
  return { document, project };
}

export function ensureHcProjectOnEditorOpen(input: {
  document: EditorCanvasDocument;
  ownerId?: string;
  syncToServer?: boolean;
}): EditorCanvasDocument {
  if (input.document.instructionStudioState?.hcProjectId) {
    return input.document;
  }
  const { document } = saveEditorDocumentToHcProject({
    document: input.document,
    ownerId: input.ownerId,
    workflowStatus: "concept",
    syncToServer: input.syncToServer ?? false,
  });
  return document;
}

export function listHcProjectsByWorkflowStatus(
  projects: HomeCheffProjectPackage[],
  status: HcProjectWorkflowStatus | "active"
): HomeCheffProjectPackage[] {
  if (status === "active") {
    return projects.filter((p) => !p.isArchived && readHcProjectWorkflowStatus(p) !== "archived");
  }
  if (status === "archived") {
    return projects.filter((p) => p.isArchived || readHcProjectWorkflowStatus(p) === "archived");
  }
  return projects.filter((p) => !p.isArchived && readHcProjectWorkflowStatus(p) === status);
}

export type HcProjectSaveMessageKey =
  | "hcProject.save.saved"
  | "hcProject.save.savedConcept"
  | "hcProject.save.updated"
  | "hcProject.save.nameUpdated"
  | "hcProject.save.addedToProjects"
  | "hcProject.save.localSavedAsProject"
  | "hcProject.save.failed";

export function resolveHcProjectSaveMessageKey(input: {
  workflowStatus: HcProjectWorkflowStatus;
  created: boolean;
  renamed?: boolean;
}): HcProjectSaveMessageKey {
  if (input.renamed) {
    return "hcProject.save.nameUpdated";
  }
  if (input.created) {
    return input.workflowStatus === "concept" ? "hcProject.save.savedConcept" : "hcProject.save.saved";
  }
  return input.workflowStatus === "concept" ? "hcProject.save.savedConcept" : "hcProject.save.updated";
}

export function createHcProjectForModule(input: {
  sourceModule: HcProjectSourceModule;
  title?: string;
  ownerId?: string;
  workflowStatus?: HcProjectWorkflowStatus;
  existing?: HomeCheffProjectPackage;
  servicePayload?: Partial<HomeCheffServicePayload>;
  workflowState?: Record<string, unknown>;
  syncToServer?: boolean;
}): HomeCheffProjectPackage {
  const now = new Date().toISOString();
  const id = input.existing?.id ?? createHomeCheffProjectId();
  const title =
    input.title?.trim() ||
    input.existing?.title ||
    defaultHcProjectTitleFallback(input.sourceModule);

  let project: HomeCheffProjectPackage = {
    id,
    version: HOMECHEFF_PACKAGE_VERSION,
    projectFormat: "hc",
    projectVersion: 1,
    projectType: input.sourceModule,
    createdAt: input.existing?.createdAt ?? now,
    updatedAt: now,
    ownerId: input.ownerId ?? input.existing?.ownerId,
    sourceService: input.existing?.sourceService ?? input.sourceModule,
    targetService: input.sourceModule,
    title,
    permissions: input.existing?.permissions ?? defaultProjectPermissions(),
    assetReferences: input.existing?.assetReferences ?? [],
    generationPackageIds: input.existing?.generationPackageIds ?? [],
    workflowState: { ...(input.existing?.workflowState ?? {}), ...(input.workflowState ?? {}) },
    metadata: { ...(input.existing?.metadata ?? {}) },
    prompts: { ...(input.existing?.prompts ?? {}) },
    settings: { ...(input.existing?.settings ?? {}) },
    handoffHistory: input.existing?.handoffHistory ?? [],
    servicePayload: {
      ...(input.existing?.servicePayload ?? {}),
      ...(input.servicePayload ?? {}),
    },
  };

  project = enrichHcProjectMetadata(project, {
    workflowStatus: input.workflowStatus ?? "concept",
    sourceModule: input.sourceModule,
    currentStage: input.sourceModule,
  });

  project = persistHcProjectWithSync(project, {
    syncToServer: input.syncToServer ?? Boolean(input.ownerId),
  });
  persistHomeCheffProject(project);
  return project;
}

export function ensureHcProjectOnModuleStart(input: {
  sourceModule: HcProjectSourceModule;
  hcProjectId?: string | null;
  ownerId?: string;
  syncToServer?: boolean;
  storyboardId?: string;
  motionProjectId?: string;
  publishProjectId?: string;
  title?: string;
}): { project: HomeCheffProjectPackage; created: boolean } {
  if (input.hcProjectId) {
    const existing = loadHomeCheffProject(input.hcProjectId);
    if (existing) {
      return { project: existing, created: false };
    }
  }

  const servicePayload: Partial<HomeCheffServicePayload> = {};
  if (input.storyboardId) {
    servicePayload.studio = { storyboardId: input.storyboardId };
  }
  if (input.motionProjectId) {
    servicePayload.motion = {
      metadata: { motionProjectId: input.motionProjectId },
    };
  }
  if (input.publishProjectId) {
    servicePayload.publish = { publishProjectId: input.publishProjectId };
  }

  const project = createHcProjectForModule({
    sourceModule: input.sourceModule,
    title: input.title,
    ownerId: input.ownerId,
    workflowStatus: "concept",
    servicePayload,
    syncToServer: input.syncToServer,
  });
  return { project, created: true };
}

export function ensureHcProjectOnStudioStart(input: {
  hcProjectId?: string | null;
  ownerId?: string;
  storyboardId?: string;
  syncToServer?: boolean;
}): { project: HomeCheffProjectPackage; created: boolean } {
  return ensureHcProjectOnModuleStart({ ...input, sourceModule: "studio" });
}

export function ensureHcProjectOnMotionStart(input: {
  hcProjectId?: string | null;
  ownerId?: string;
  motionProjectId?: string;
  syncToServer?: boolean;
}): { project: HomeCheffProjectPackage; created: boolean } {
  return ensureHcProjectOnModuleStart({ ...input, sourceModule: "motion" });
}

export function ensureHcProjectOnPublishStart(input: {
  hcProjectId?: string | null;
  ownerId?: string;
  publishProjectId?: string;
  syncToServer?: boolean;
}): { project: HomeCheffProjectPackage; created: boolean } {
  return ensureHcProjectOnModuleStart({ ...input, sourceModule: "publish" });
}

export function transitionHcProjectWorkflowStatus(
  project: HomeCheffProjectPackage,
  workflowStatus: HcProjectWorkflowStatus,
  options?: { currentStage?: string; syncToServer?: boolean }
): HomeCheffProjectPackage {
  let next = enrichHcProjectMetadata(project, {
    workflowStatus,
    currentStage:
      options?.currentStage ??
      (typeof project.metadata.currentStage === "string" ? project.metadata.currentStage : undefined),
    sourceModule: (project.sourceService ?? project.projectType) as HcProjectSourceModule,
  });
  next = persistHcProjectWithSync(next, {
    syncToServer: options?.syncToServer ?? Boolean(project.ownerId),
  });
  persistHomeCheffProject(next);
  return next;
}

export function saveHcProjectPackage(input: {
  project: HomeCheffProjectPackage;
  title?: string;
  workflowStatus?: HcProjectWorkflowStatus;
  servicePayload?: Partial<HomeCheffServicePayload>;
  syncToServer?: boolean;
}): HomeCheffProjectPackage {
  let next = mergeHomeCheffProject(input.project, {
    title: input.title?.trim() || input.project.title,
    servicePayload: input.servicePayload
      ? { ...input.project.servicePayload, ...input.servicePayload }
      : input.project.servicePayload,
  });
  next = enrichHcProjectMetadata(next, {
    workflowStatus: input.workflowStatus ?? readHcProjectWorkflowStatus(next),
    sourceModule: (next.sourceService ?? next.projectType) as HcProjectSourceModule,
  });
  next = persistHcProjectWithSync(next, {
    syncToServer: input.syncToServer ?? Boolean(input.project.ownerId),
  });
  persistHomeCheffProject(next);
  return next;
}

export function renameHcProject(input: {
  project: HomeCheffProjectPackage;
  title: string;
  ownerId?: string;
  syncToServer?: boolean;
}): HomeCheffProjectPackage | null {
  const title = input.title.trim();
  if (!title) {
    return null;
  }
  return saveHcProjectPackage({
    project: input.project,
    title,
    syncToServer: input.syncToServer,
  });
}

export function saveHcProjectAsNewCopy(input: {
  project: HomeCheffProjectPackage;
  title?: string;
  ownerId?: string;
  syncToServer?: boolean;
}): HomeCheffProjectPackage {
  const copyTitle =
    input.title?.trim() ||
    `${input.project.title || defaultHcProjectTitleFallback(input.project.projectType as HcProjectSourceModule)} (kopie)`;
  return createHcProjectForModule({
    sourceModule: (input.project.sourceService ?? input.project.projectType) as HcProjectSourceModule,
    title: copyTitle,
    ownerId: input.ownerId,
    workflowStatus: "concept",
    existing: undefined,
    servicePayload: input.project.servicePayload,
    workflowState: input.project.workflowState,
    syncToServer: input.syncToServer,
  });
}

/** Reuse the same HC project when opening the next module (no duplicate id). */
export function reuseHcProjectForService(
  project: HomeCheffProjectPackage,
  targetService: HomeCheffProjectType,
  options?: { durationSec?: number; publishIntent?: string }
): HomeCheffProjectPackage {
  let next = project;
  if (targetService === "motion" && !project.servicePayload.motion) {
    next = extendHcProjectWithMotionState(project, { durationSec: options?.durationSec ?? 5 });
  }
  if (targetService === "publish" && !project.servicePayload.publish) {
    next = extendHcProjectWithPublishState(project, { publishIntent: options?.publishIntent });
  }
  const statusByService: Partial<Record<HomeCheffProjectType, HcProjectWorkflowStatus>> = {
    motion: "motion_ready",
    publish: "publish_ready",
  };
  next = transitionHcProjectWorkflowStatus(next, statusByService[targetService] ?? readHcProjectWorkflowStatus(next), {
    currentStage: targetService,
  });
  return next;
}

export function attachStoryboardToHcProject(
  project: HomeCheffProjectPackage,
  storyboardId: string,
  options?: { workflowStatus?: HcProjectWorkflowStatus; syncToServer?: boolean }
): HomeCheffProjectPackage {
  let next = saveHcProjectPackage({
    project,
    servicePayload: {
      studio: {
        ...project.servicePayload.studio,
        storyboardId,
      },
    },
    workflowStatus: options?.workflowStatus,
    syncToServer: options?.syncToServer,
  });
  next = storeStudioWorkflowInHc(next, { phase: "approve", approvedAt: new Date().toISOString() });
  next = transitionHcProjectWorkflowStatus(
    next,
    options?.workflowStatus ?? "motion_ready",
    { currentStage: "studio", syncToServer: options?.syncToServer }
  );
  persistHomeCheffProject(next);
  return next;
}

export function markHcProjectExported(
  project: HomeCheffProjectPackage,
  options?: { syncToServer?: boolean }
): HomeCheffProjectPackage {
  return transitionHcProjectWorkflowStatus(project, "exported", {
    currentStage: "publish",
    syncToServer: options?.syncToServer,
  });
}

export function syncHcProjectIdToUrl(hcProjectId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (url.searchParams.get("hcProject") === hcProjectId) {
    return;
  }
  url.searchParams.set("hcProject", hcProjectId);
  window.history.replaceState({}, "", url.toString());
}
