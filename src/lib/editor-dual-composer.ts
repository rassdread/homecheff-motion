import type {
  EditorCanvasDocument,
  EditorDualComposerState,
  EditorImportedLayer,
} from "@/types/homecheff-visual-editor";

export function createDualComposerState(document: EditorCanvasDocument): EditorDualComposerState {
  return {
    targetSessionId: document.sessionId,
    active: false,
  };
}

export function openDualComposer(
  document: EditorCanvasDocument,
  source: {
    imageUrl: string;
    storageKey?: string;
    assetId?: string | null;
    name?: string;
  }
): EditorCanvasDocument {
  return {
    ...document,
    workspaceMode: "compose",
    composerState: {
      targetSessionId: document.sessionId,
      active: true,
      sourceImageUrl: source.imageUrl,
      sourceStorageKey: source.storageKey,
      sourceAssetId: source.assetId ?? null,
      sourceName: source.name,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function closeDualComposer(document: EditorCanvasDocument): EditorCanvasDocument {
  return {
    ...document,
    composerState: document.composerState
      ? { ...document.composerState, active: false }
      : undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function isDualComposerActive(document: EditorCanvasDocument): boolean {
  return Boolean(document.composerState?.active && document.composerState.sourceImageUrl);
}

export function composerHasSource(document: EditorCanvasDocument): boolean {
  return Boolean(document.composerState?.sourceImageUrl);
}

export function nextImportedLayerZIndex(layers: EditorImportedLayer[] | undefined): number {
  if (!layers?.length) {
    return 10;
  }
  return Math.max(...layers.map((l) => l.zIndex)) + 1;
}
