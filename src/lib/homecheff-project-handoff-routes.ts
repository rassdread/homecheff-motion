import { buildHomeCheffProjectFromEditorDocument } from "@/lib/homecheff-project-build";
import {
  extendHcProjectWithMotionState,
  extendHcProjectWithPublishState,
  extendHcProjectWithStudioState,
} from "@/lib/homecheff-project-handoff";
import { buildMotionAnimateUrl, buildStudioSceneHandoffUrl } from "@/lib/editor-studio-scene-handoff";
import { buildPublishHandoffUrl } from "@/lib/editor-publish-handoff";
import { saveEditorCanvasDocument } from "@/lib/editor-canvas-session";
import { buildHcHandoffUrl } from "@/lib/homecheff-project-package-core";
import { loadHomeCheffProject, persistHomeCheffProject } from "@/lib/homecheff-project-persist";
import { persistHcProjectWithSync } from "@/lib/homecheff-project-sync";
import type { HomeCheffProjectPackage, HomeCheffProjectType } from "@/types/homecheff-project-package";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function ensureHcProjectFromDocument(
  document: EditorCanvasDocument,
  options: { syncToServer?: boolean } = {}
): HomeCheffProjectPackage {
  const existingId = document.instructionStudioState?.hcProjectId;
  const existing = existingId ? loadHomeCheffProject(existingId) ?? undefined : undefined;
  let project = buildHomeCheffProjectFromEditorDocument({ document, existing });
  project = persistHcProjectWithSync(project, { syncToServer: options.syncToServer });
  return project;
}

export function extendAndPersistHcHandoff(input: {
  document: EditorCanvasDocument;
  target: HomeCheffProjectType;
  durationSec?: number;
  syncToServer?: boolean;
}): { projectId: string; href: string } {
  let project = ensureHcProjectFromDocument(input.document, { syncToServer: input.syncToServer });
  if (input.target === "motion") {
    project = persistHcProjectWithSync(extendHcProjectWithMotionState(project, { durationSec: input.durationSec ?? 5 }), {
      syncToServer: input.syncToServer,
    });
  } else if (input.target === "publish") {
    project = persistHcProjectWithSync(extendHcProjectWithPublishState(project), {
      syncToServer: input.syncToServer,
    });
  } else if (input.target === "studio") {
    project = persistHcProjectWithSync(extendHcProjectWithStudioState(project), {
      syncToServer: input.syncToServer,
    });
  }
  const linked = linkDocumentToHcProject(input.document, project.id);
  if (typeof window !== "undefined") {
    saveEditorCanvasDocument(linked);
  }
  return {
    projectId: project.id,
    href: buildHcHandoffUrl(project.id, input.target),
  };
}

export function resolveEditorToMotionHandoffUrl(input: {
  document?: EditorCanvasDocument;
  editorSessionId: string;
  durationSec?: 3 | 5 | 8;
  primaryResultUrl?: string;
  orderedFrameUrls?: string[];
  packageId?: string;
  hcProjectId?: string;
  syncToServer?: boolean;
}): string {
  if (input.document) {
    return extendAndPersistHcHandoff({
      document: input.document,
      target: "motion",
      durationSec: input.durationSec ?? 5,
      syncToServer: input.syncToServer,
    }).href;
  }
  const id = input.hcProjectId;
  if (id) return buildHcHandoffUrl(id, "motion");
  return buildMotionAnimateUrl({
    editorSessionId: input.editorSessionId,
    durationSec: input.durationSec ?? 5,
    resultUrl: input.primaryResultUrl,
    orderedFrameUrls: input.orderedFrameUrls,
    packageId: input.packageId,
  });
}

export function resolveEditorToPublishHandoffUrl(input: {
  document?: EditorCanvasDocument;
  editorSessionId: string;
  intent?:
    | "text_overlay"
    | "social_post"
    | "social_carousel"
    | "subtitles"
    | "voice"
    | "music"
    | "print"
    | "flyer"
    | "story";
  packageId?: string;
  resultUrl?: string;
  hcProjectId?: string;
  syncToServer?: boolean;
}): string {
  if (input.document) {
    return extendAndPersistHcHandoff({
      document: input.document,
      target: "publish",
      syncToServer: input.syncToServer,
    }).href;
  }
  const id = input.hcProjectId;
  if (id) return buildHcHandoffUrl(id, "publish");
  return buildPublishHandoffUrl({
    editorSessionId: input.editorSessionId,
    intent: input.intent ?? "text_overlay",
    packageId: input.packageId,
    resultUrl: input.resultUrl,
  });
}

export function resolveEditorToStudioHandoffUrl(input: {
  document?: EditorCanvasDocument;
  editorSessionId: string;
  variantId?: string;
  resultUrl?: string;
  packageId?: string;
  hcProjectId?: string;
  syncToServer?: boolean;
}): string {
  if (input.document) {
    return extendAndPersistHcHandoff({
      document: input.document,
      target: "studio",
      syncToServer: input.syncToServer,
    }).href;
  }
  const id = input.hcProjectId;
  if (id) return buildHcHandoffUrl(id, "studio");
  return buildStudioSceneHandoffUrl({
    editorSessionId: input.editorSessionId,
    variantId: input.variantId,
    resultUrl: input.resultUrl,
    packageId: input.packageId,
  });
}

export function linkDocumentToHcProject(
  document: EditorCanvasDocument,
  projectId: string
): EditorCanvasDocument {
  return {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      hcProjectId: projectId,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function ensureHcProjectLinkedToDocument(input: {
  document: EditorCanvasDocument;
  syncToServer?: boolean;
}): { document: EditorCanvasDocument; projectId: string } {
  const project = ensureHcProjectFromDocument(input.document, { syncToServer: input.syncToServer });
  return {
    projectId: project.id,
    document: linkDocumentToHcProject(input.document, project.id),
  };
}
