import type { EditorCanvasDocument, EditorShapePoint } from "@/types/homecheff-visual-editor";

export const EDITOR_CANVAS_SESSIONS_KEY = "hc-editor-canvas-sessions-v1";
export const EDITOR_STORAGE_MAX_SESSIONS = 5;
export const EDITOR_STORAGE_MAX_POLYGON_POINTS = 64;

export type SafeLocalStorageResult =
  | { ok: true }
  | { ok: false; reason: "quota_exceeded" | "unavailable" };

function isQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof DOMException)) {
    return false;
  }
  return error.name === "QuotaExceededError" || error.code === 22;
}

export function safeSetLocalStorage(key: string, value: string): SafeLocalStorageResult {
  if (typeof window === "undefined") {
    return { ok: false, reason: "unavailable" };
  }
  try {
    window.localStorage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return { ok: false, reason: "quota_exceeded" };
    }
    return { ok: false, reason: "unavailable" };
  }
}

function trimPolygon(points: EditorShapePoint[] | undefined): EditorShapePoint[] | undefined {
  if (!points?.length || points.length <= EDITOR_STORAGE_MAX_POLYGON_POINTS) {
    return points;
  }
  return points.slice(0, EDITOR_STORAGE_MAX_POLYGON_POINTS);
}

/** Strip large or redundant fields before persisting editor sessions. */
export function stripDocumentForStorage(document: EditorCanvasDocument): EditorCanvasDocument {
  const objects = document.objects.map((layer) => {
    const shape = layer.selectionShape;
    if (!shape) {
      return layer;
    }
    const { maskData: _maskData, ...restShape } = shape;
    return {
      ...layer,
      selectionShape: {
        ...restShape,
        polygon: trimPolygon(restShape.polygon),
      },
    };
  });

  const history = document.history
    ? {
        past: document.history.past.map((snap) => stripDocumentForStorage(snap)),
        future: document.history.future.map((snap) => stripDocumentForStorage(snap)),
        timeline: document.history.timeline.slice(-20),
      }
    : document.history;

  return {
    ...document,
    objects,
    history,
    assistantState: document.assistantState
      ? {
          ...document.assistantState,
          history: document.assistantState.history.slice(-20),
        }
      : document.assistantState,
  };
}

export function pruneEditorSessionStore(
  store: Record<string, EditorCanvasDocument>,
  keepSessionId?: string
): Record<string, EditorCanvasDocument> {
  const entries = Object.entries(store).sort((a, b) =>
    b[1].updatedAt.localeCompare(a[1].updatedAt)
  );
  const kept = entries.slice(0, EDITOR_STORAGE_MAX_SESSIONS);
  if (keepSessionId && !kept.some(([id]) => id === keepSessionId)) {
    const current = store[keepSessionId];
    if (current) {
      kept.pop();
      kept.unshift([keepSessionId, current]);
    }
  }
  return Object.fromEntries(kept.map(([id, doc]) => [id, stripDocumentForStorage(doc)]));
}

export function serializeEditorSessionStore(store: Record<string, EditorCanvasDocument>): string {
  const pruned = pruneEditorSessionStore(store);
  return JSON.stringify(pruned);
}
