import { loadEditorCanvasDocument, listRecentEditorDocuments } from "@/lib/editor-canvas-session";
import { ensureHcProjectForDocument } from "@/lib/homecheff-project-export";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type RecentLocalEditStorage = "local" | "linked";

export type RecentLocalEditItem = {
  sessionId: string;
  title: string;
  type: "editor_session";
  storage: RecentLocalEditStorage;
  updatedAt: string;
  hcProjectId?: string;
  nameOccurrence: number;
  nameOccurrenceTotal: number;
};

function resolveStorage(document: EditorCanvasDocument): RecentLocalEditStorage {
  const hcProjectId = document.instructionStudioState?.hcProjectId;
  if (hcProjectId && loadHomeCheffProject(hcProjectId)) {
    return "linked";
  }
  return "local";
}

/** Recent editor canvas sessions with duplicate-name context for the Projects hub. */
export function listRecentLocalEdits(limit = 8): RecentLocalEditItem[] {
  const documents = listRecentEditorDocuments(limit * 2);
  const nameCounts = new Map<string, number>();
  for (const doc of documents) {
    const key = doc.name.trim().toLowerCase() || "untitled";
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  const nameSeen = new Map<string, number>();

  return documents.slice(0, limit).map((doc) => {
    const nameKey = doc.name.trim().toLowerCase() || "untitled";
    const occurrence = (nameSeen.get(nameKey) ?? 0) + 1;
    nameSeen.set(nameKey, occurrence);
    const total = nameCounts.get(nameKey) ?? 1;
    return {
      sessionId: doc.sessionId,
      title: doc.name.trim() || "Untitled",
      type: "editor_session",
      storage: resolveStorage(doc),
      updatedAt: doc.updatedAt,
      hcProjectId: doc.instructionStudioState?.hcProjectId,
      nameOccurrence: occurrence,
      nameOccurrenceTotal: total,
    };
  });
}

export function saveLocalEditAsHcProject(input: {
  sessionId: string;
  ownerId?: string;
  syncToServer?: boolean;
}): { ok: true; projectId: string } | { ok: false; error: "not_found" } {
  const document = loadEditorCanvasDocument(input.sessionId);
  if (!document) {
    return { ok: false, error: "not_found" };
  }
  const existingProjectId = document.instructionStudioState?.hcProjectId;
  const result = ensureHcProjectForDocument({
    document,
    ownerId: input.ownerId,
    existingProjectId,
    syncToServer: input.syncToServer ?? Boolean(input.ownerId),
  });
  return { ok: true, projectId: result.projectId };
}
