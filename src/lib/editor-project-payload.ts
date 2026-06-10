import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorCanvasProjectListItem = {
  id: string;
  name: string;
  status: "active" | "archived";
  updatedAt: string;
  createdAt: string;
  backgroundUrl?: string;
};

export function parseEditorCanvasProjectPayload(raw: unknown): EditorCanvasDocument | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const doc = raw as EditorCanvasDocument;
  if (typeof doc.sessionId !== "string" || !doc.sessionId.trim()) {
    return null;
  }
  if (typeof doc.backgroundUrl !== "string") {
    return null;
  }
  if (!Array.isArray(doc.objects)) {
    return null;
  }
  return doc;
}

export function editorProjectListItemFromPayload(
  id: string,
  name: string,
  status: string,
  updatedAt: Date,
  createdAt: Date,
  payload: unknown
): EditorCanvasProjectListItem {
  const doc = parseEditorCanvasProjectPayload(payload);
  return {
    id,
    name,
    status: status === "archived" ? "archived" : "active",
    updatedAt: updatedAt.toISOString(),
    createdAt: createdAt.toISOString(),
    backgroundUrl: doc?.backgroundUrl,
  };
}
