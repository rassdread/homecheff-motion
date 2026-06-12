import { buildHomeCheffProjectFromEditorDocument } from "@/lib/homecheff-project-build";
import {
  downloadHcProjectFile,
  stripUnrelatedOwnerData,
} from "@/lib/homecheff-project-package-core";
import { persistHomeCheffProject, loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { persistHcProjectWithSync, importHcProjectToServer } from "@/lib/homecheff-project-sync";
import { linkDocumentToHcProject } from "@/lib/homecheff-project-handoff-routes";
import type { HomeCheffShareMode } from "@/types/homecheff-project-package";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export function exportEditorDocumentAsHcProject(input: {
  document: EditorCanvasDocument;
  shareMode?: HomeCheffShareMode;
  ownerId?: string;
  existingProjectId?: string;
  syncToServer?: boolean;
}): void {
  const existing = input.existingProjectId ? loadHomeCheffProject(input.existingProjectId) ?? undefined : undefined;
  let project = buildHomeCheffProjectFromEditorDocument({
    document: input.document,
    ownerId: input.ownerId,
    shareMode: input.shareMode,
    existing,
  });
  project = persistHcProjectWithSync(project, { syncToServer: input.syncToServer ?? Boolean(input.ownerId) });
  const exportable =
    input.shareMode && input.shareMode !== "private_backup"
      ? stripUnrelatedOwnerData(project)
      : project;
  downloadHcProjectFile(exportable);
}

export function ensureHcProjectForDocument(input: {
  document: EditorCanvasDocument;
  ownerId?: string;
  existingProjectId?: string;
  syncToServer?: boolean;
}): { projectId: string; document: EditorCanvasDocument } {
  const linked = input.existingProjectId ? loadHomeCheffProject(input.existingProjectId) ?? undefined : undefined;
  const project = buildHomeCheffProjectFromEditorDocument({
    document: input.document,
    ownerId: input.ownerId,
    existing: linked,
  });
  const persisted = persistHcProjectWithSync(project, {
    syncToServer: input.syncToServer ?? Boolean(input.ownerId),
  });
  return {
    projectId: persisted.id,
    document: linkDocumentToHcProject(input.document, persisted.id),
  };
}
