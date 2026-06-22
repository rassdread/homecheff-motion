import {
  createEditorDocumentFromUpload,
  loadEditorCanvasDocument,
  saveEditorCanvasDocument,
} from "@/lib/editor-canvas-session";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { loadHcProjectResolved } from "@/lib/homecheff-project-sync";
import { resolveHcProjectOpenRoute } from "@/lib/homecheff-project-package-core";
import { hydratePublishProjectFromEditorHandoff } from "@/lib/editor-publish-handoff-hydrate";
import { createPublishProject, savePublishProject } from "@/lib/publish-overlay-session";
import type { HomeCheffProjectPackage, HomeCheffProjectType } from "@/types/homecheff-project-package";
import type { PublishProject } from "@/types/publish-overlay";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export function loadHcProjectFromQuery(searchParams: URLSearchParams): HomeCheffProjectPackage | null {
  const id = searchParams.get("hcProject")?.trim();
  if (!id) return null;
  return loadHomeCheffProject(id);
}

export async function loadHcProjectFromQueryResolved(
  searchParams: URLSearchParams,
  options: {
    syncFromServer?: boolean;
    skipServerWithoutLocal?: boolean;
    userRequestedRestore?: boolean;
    analysisStatus?: import("@/lib/editor-vision-analysis-run").EditorVisionAnalysisStatus | null;
  } = {}
): Promise<HomeCheffProjectPackage | null> {
  const id = searchParams.get("hcProject")?.trim();
  if (!id) return null;
  return loadHcProjectResolved(id, options);
}

export function hydratePublishFromHcProject(project: HomeCheffProjectPackage): PublishProject | null {
  const publish = project.servicePayload.publish;
  if (!publish) return null;

  const created = createPublishProject({
    name: project.title,
    videoUrl: publish.videoUrl ?? publish.imageUrls?.[0] ?? "",
    source: "editor",
    mediaKind: publish.mediaKind ?? "image",
    imageUrl: publish.imageUrls?.[0],
    imageUrls: publish.imageUrls,
    publishIntent: publish.publishIntent,
    workflow: String(project.metadata.workflow ?? ""),
    metadata: {
      ...(publish.metadata ?? {}),
      hcProjectId: project.id,
    },
  });
  return savePublishProject(created);
}

/** Restore a full editor document from HC editor state. */
export function hydrateEditorDocumentFromHcProject(project: HomeCheffProjectPackage): EditorCanvasDocument | null {
  const editor = project.servicePayload.editor;
  const snapshot = editor?.documentSnapshot;
  if (!snapshot?.sessionId) return null;

  const existing = loadEditorCanvasDocument(snapshot.sessionId);
  const generationPackage =
    editor?.generationPackages?.[0] ?? snapshot.instructionStudioState?.generationPackage;

  const backgroundUrl =
    snapshot.backgroundUrl ??
    existing?.backgroundUrl ??
    generationPackage?.generatedImages[0]?.url ??
    "https://placeholder.homecheff.local/background";

  const base: EditorCanvasDocument =
    existing ??
    createEditorDocumentFromUpload({
      name: snapshot.name ?? project.title,
      backgroundUrl,
    });

  const doc: EditorCanvasDocument = {
    ...base,
    ...snapshot,
    sessionId: snapshot.sessionId,
    name: snapshot.name ?? project.title,
    backgroundUrl: snapshot.backgroundUrl ?? base.backgroundUrl,
    instructionStudioState: {
      ...base.instructionStudioState,
      ...snapshot.instructionStudioState,
      hcProjectId: project.id,
      generationPackage,
      combineIntent:
        snapshot.instructionStudioState?.combineIntent ??
        (project.metadata.workflow as import("@/types/editor-instruction-studio").EditorFusionIntent | undefined),
    },
    updatedAt: new Date().toISOString(),
  };

  return saveEditorCanvasDocument(doc);
}

export type HcMotionBootstrap = {
  hcProjectId: string;
  imageUrl: string;
  imageUrls: string[];
  sessionId: string;
  label: string;
  durationSec: number;
};

/** Build motion wizard bootstrap payload from HC motion state. */
export function rehydrateMotionProjectFromHcProject(
  project: HomeCheffProjectPackage
): HcMotionBootstrap | null {
  const motion = project.servicePayload.motion;
  const editorSession = project.servicePayload.editor?.sessionId ?? project.id;
  const frames =
    motion?.sequenceFrameUrls ??
    motion?.sourceImageUrls ??
    project.servicePayload.editor?.generationPackages?.[0]?.orderedFrameUrls ??
    [];
  const primary =
    motion?.generatedVideoUrl ??
    frames.at(-1) ??
    motion?.sourceImageUrls?.[0] ??
    project.servicePayload.editor?.generationPackages?.[0]?.generatedImages[0]?.url;

  if (!primary && frames.length === 0) return null;

  return {
    hcProjectId: project.id,
    imageUrl: primary ?? frames[0]!,
    imageUrls: frames.length ? frames : primary ? [primary] : [],
    sessionId: editorSession,
    label: project.title,
    durationSec: motion?.durationSec ?? 5,
  };
}

export function buildMotionHandoffSearchParamsFromHcProject(
  project: HomeCheffProjectPackage
): URLSearchParams {
  const bootstrap = rehydrateMotionProjectFromHcProject(project);
  const params = new URLSearchParams({
    hcProject: project.id,
    handoffMode: "animation",
    motionIntent: "animate_now",
  });
  if (bootstrap) {
    params.set("transitionDurationSec", String(bootstrap.durationSec));
    params.set("sourceImage", bootstrap.imageUrl);
    if (bootstrap.sessionId) params.set("editorSession", bootstrap.sessionId);
    const pkgId = project.generationPackageIds[0];
    if (pkgId) params.set("generationPackage", pkgId);
    bootstrap.imageUrls.forEach((url, index) => {
      params.set(`stepImage${index}`, url);
    });
  }
  return params;
}

export type HcStudioHydration = {
  hcProjectId: string;
  redirectPath: string;
  storyboardId?: string;
};

/** Resolve Studio open path from HC studio state. */
export function rehydrateStudioProjectFromHcProject(
  project: HomeCheffProjectPackage
): HcStudioHydration | null {
  const studio = project.servicePayload.studio;
  if (!studio && !project.servicePayload.editor) return null;

  if (studio?.storyboardId) {
    return {
      hcProjectId: project.id,
      storyboardId: studio.storyboardId,
      redirectPath: `/studio?storyboardId=${encodeURIComponent(studio.storyboardId)}&hcProject=${encodeURIComponent(project.id)}`,
    };
  }

  const params = new URLSearchParams({
    hcProject: project.id,
    handoffMode: "scene_only",
    sceneAsset: "1",
  });
  const editorSession = project.servicePayload.editor?.sessionId;
  if (editorSession) params.set("editorSession", editorSession);
  if (studio?.sceneImageUrl) params.set("sceneImageUrl", studio.sceneImageUrl);
  if (studio?.sceneTitle) params.set("sceneTitle", studio.sceneTitle);
  const pkgId = project.generationPackageIds[0];
  if (pkgId) params.set("generationPackage", pkgId);

  return {
    hcProjectId: project.id,
    redirectPath: `/studio/storyboards/new?${params.toString()}`,
  };
}

export function resolveHcProjectHandoffRoute(
  projectId: string,
  target: HomeCheffProjectType
): string {
  return resolveHcProjectOpenRoute(projectId, target);
}

export function hcProjectDeepLink(searchParams: URLSearchParams): boolean {
  return Boolean(searchParams.get("hcProject")?.trim());
}

export function openHcProjectInPublish(searchParams: URLSearchParams): PublishProject | null {
  const project = loadHcProjectFromQuery(searchParams);
  if (!project) return null;
  return hydratePublishFromHcProject(project) ?? hydratePublishProjectFromEditorHandoff(searchParams);
}

/** @deprecated Use hydrateEditorDocumentFromHcProject */
export function rehydrateEditorDocumentFromHcProject(project: HomeCheffProjectPackage) {
  return project.servicePayload.editor?.documentSnapshot ?? null;
}
