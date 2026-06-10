import { syncDetectedObjectsOnDocument } from "@/lib/editor-object-detection";
import type {
  EditorCanvasDocument,
  EditorCanvasLayer,
  EditorHistoryActionType,
  EditorHistoryEntry,
  EditorHistoryState,
  EditorNonDestructiveLayerState,
  EditorNonDestructiveState,
} from "@/types/homecheff-visual-editor";

const MAX_HISTORY = 15;

function createHistoryEntry(
  action: EditorHistoryActionType,
  label: string,
  layerId?: string
): EditorHistoryEntry {
  return {
    id: crypto.randomUUID(),
    action,
    layerId,
    label,
    at: new Date().toISOString(),
    reversible: true,
  };
}

export function createEditorNonDestructiveState(
  document: EditorCanvasDocument
): EditorNonDestructiveState {
  const layers: Record<string, EditorNonDestructiveLayerState> = {};
  for (const layer of document.objects) {
    if (layer.layerType === "background") {
      continue;
    }
    layers[layer.id] = {
      layerId: layer.id,
      originalPreviewUrl: document.backgroundUrl,
      originalStorageKey: document.backgroundStorageKey,
      maskUrl: layer.selectionShape?.maskUrl,
      cutoutUrl: layer.selectionShape?.cutoutUrl,
      transform: { ...layer.transform },
      actions: [],
    };
  }
  return {
    backgroundOriginalUrl: document.backgroundUrl,
    backgroundOriginalStorageKey: document.backgroundStorageKey,
    layers,
  };
}

export function ensureEditorNonDestructiveState(
  document: EditorCanvasDocument
): EditorCanvasDocument {
  if (document.nonDestructive) {
    return document;
  }
  return {
    ...document,
    nonDestructive: createEditorNonDestructiveState(document),
    history: document.history ?? { past: [], future: [], timeline: [] },
  };
}

function snapshotDocument(document: EditorCanvasDocument): EditorCanvasDocument {
  return JSON.parse(JSON.stringify(document)) as EditorCanvasDocument;
}

export function commitEditorHistory(
  before: EditorCanvasDocument,
  after: EditorCanvasDocument,
  action: EditorHistoryActionType,
  label: string,
  layerId?: string
): EditorCanvasDocument {
  const entry = createHistoryEntry(action, label, layerId);
  const withBefore = ensureEditorNonDestructiveState(before);
  const past = [...(withBefore.history?.past ?? []), snapshotDocument(withBefore)].slice(-MAX_HISTORY);
  const timeline = [...(withBefore.history?.timeline ?? []), entry].slice(-MAX_HISTORY);

  const layerState = layerId ? withBefore.nonDestructive?.layers[layerId] : undefined;
  const nonDestructive = after.nonDestructive ?? withBefore.nonDestructive;
  if (layerState && nonDestructive && layerId) {
    nonDestructive.layers[layerId] = {
      ...layerState,
      actions: [...layerState.actions, entry],
    };
  }

  return {
    ...ensureEditorNonDestructiveState(after),
    nonDestructive,
    history: { past, future: [], timeline },
    detectedObjects: syncDetectedObjectsOnDocument(after.objects, after.detectedObjects),
  };
}

/** @deprecated Prefer commitEditorHistory with explicit before/after snapshots. */
export function pushEditorHistory(
  document: EditorCanvasDocument,
  action: EditorHistoryActionType,
  label: string,
  layerId?: string
): EditorCanvasDocument {
  return commitEditorHistory(document, document, action, label, layerId);
}

export function editorCanUndo(document: EditorCanvasDocument): boolean {
  return (document.history?.past.length ?? 0) > 0;
}

export function editorCanRedo(document: EditorCanvasDocument): boolean {
  return (document.history?.future.length ?? 0) > 0;
}

export function undoEditorDocument(document: EditorCanvasDocument): EditorCanvasDocument {
  const history = document.history;
  if (!history?.past.length) {
    return document;
  }
  const past = [...history.past];
  const previous = past.pop()!;
  const future = [snapshotDocument(document), ...history.future].slice(0, MAX_HISTORY);
  return {
    ...previous,
    history: { past, future, timeline: history.timeline },
    updatedAt: new Date().toISOString(),
  };
}

export function redoEditorDocument(document: EditorCanvasDocument): EditorCanvasDocument {
  const history = document.history;
  if (!history?.future.length) {
    return document;
  }
  const future = [...history.future];
  const next = future.shift()!;
  const past = [...history.past, snapshotDocument(document)].slice(-MAX_HISTORY);
  return {
    ...next,
    history: { past, future, timeline: history.timeline },
    updatedAt: new Date().toISOString(),
  };
}

export function recordEditorLayerTransform(
  document: EditorCanvasDocument,
  layer: EditorCanvasLayer,
  action: "move" | "resize"
): EditorCanvasDocument {
  const nd = document.nonDestructive;
  if (!nd) {
    return pushEditorHistory(document, action, `${action} ${layer.label}`, layer.id);
  }
  const state = nd.layers[layer.id];
  if (state) {
    nd.layers[layer.id] = { ...state, transform: { ...layer.transform } };
  }
  return pushEditorHistory(document, action, `${action} ${layer.label}`, layer.id);
}

export function editorHistoryTimeline(document: EditorCanvasDocument): EditorHistoryEntry[] {
  return document.history?.timeline ?? [];
}
