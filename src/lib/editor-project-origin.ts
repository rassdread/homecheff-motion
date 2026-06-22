import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";

/** Where the editor/HC project record was last authoritative. */
export type EditorProjectOrigin = "local" | "server" | "synced";

export const HC_PROJECT_ORIGIN_METADATA_KEY = "projectOrigin";

export function isEditorProjectOrigin(value: unknown): value is EditorProjectOrigin {
  return value === "local" || value === "server" || value === "synced";
}

export function resolveEditorDocumentOrigin(document: EditorCanvasDocument): EditorProjectOrigin {
  if (isEditorProjectOrigin(document.projectOrigin)) {
    return document.projectOrigin;
  }
  const hcId = document.instructionStudioState?.hcProjectId;
  if (hcId) {
    const hc = loadHomeCheffProject(hcId);
    if (hc) {
      return resolveHcProjectOrigin(hc);
    }
  }
  return "local";
}

export function resolveHcProjectOrigin(project: HomeCheffProjectPackage | null | undefined): EditorProjectOrigin {
  if (!project) {
    return "local";
  }
  const fromMeta = project.metadata[HC_PROJECT_ORIGIN_METADATA_KEY];
  if (isEditorProjectOrigin(fromMeta)) {
    return fromMeta;
  }
  return "local";
}

export function stampEditorDocumentOrigin(
  document: EditorCanvasDocument,
  origin: EditorProjectOrigin
): EditorCanvasDocument {
  if (document.projectOrigin === origin) {
    return document;
  }
  return { ...document, projectOrigin: origin, updatedAt: new Date().toISOString() };
}

export function stampHcProjectOrigin(
  project: HomeCheffProjectPackage,
  origin: EditorProjectOrigin
): HomeCheffProjectPackage {
  return {
    ...project,
    metadata: {
      ...project.metadata,
      [HC_PROJECT_ORIGIN_METADATA_KEY]: origin,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function markHcProjectSynced(project: HomeCheffProjectPackage): HomeCheffProjectPackage {
  return stampHcProjectOrigin(project, "synced");
}
