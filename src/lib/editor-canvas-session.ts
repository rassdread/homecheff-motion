import {
  applyEditorObjectOperation,
  createEmptyVisualEditorSession,
} from "@/lib/homecheff-visual-editor-foundation";
import { extractEditorSemanticLayers } from "@/lib/editor-canvas-layers";
import {
  commitEditorHistory,
  ensureEditorNonDestructiveState,
  redoEditorDocument,
  undoEditorDocument,
} from "@/lib/editor-non-destructive";
import { buildEditorObjectsFromLayers, syncDetectedObjectsOnDocument } from "@/lib/editor-object-detection";
import { attachPartsToEditorObject, buildDocumentObjectHierarchies } from "@/lib/editor-part-hierarchy";
import { buildEditorVisionHierarchy } from "@/lib/editor-vision-v4-hierarchy";
import { createDefaultHierarchicalSelection } from "@/lib/editor-hierarchical-selection";
import { refreshEditorAssetProfile } from "@/lib/editor-asset-intelligence";
import { attachStudioMotionHandoff } from "@/lib/editor-studio-motion-handoff";
import { buildEditorMotionPreparations } from "@/lib/editor-motion-preparation";
import { reorderEditorLayers, renameEditorLayer } from "@/lib/editor-semantic-layer-tree";
import { bootstrapEditorObjectDetection } from "@/lib/editor-detection-bootstrap";
import { extractEditorTextLayers } from "@/lib/editor-text-layers";
import { syncLinkedPlacementsOnTargetMove } from "@/lib/editor-placement-canvas";
import { isEditorOperationAllowed } from "@/lib/editor-layer-action-eligibility";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import {
  EDITOR_CANVAS_SESSIONS_KEY,
  pruneEditorSessionStore,
  safeSetLocalStorage,
  serializeEditorSessionStore,
  stripDocumentForStorage,
} from "@/lib/editor-local-storage";
import type {
  EditorCanvasDocument,
  EditorCanvasLayer,
  EditorCanvasTransform,
  EditorLayerOperationAudit,
  EditorObjectOperation,
  EditorSourceKind,
} from "@/types/homecheff-visual-editor";

const STORAGE_KEY = EDITOR_CANVAS_SESSIONS_KEY;
const RECENT_LIMIT = 8;

export type EditorCanvasSaveResult = {
  document: EditorCanvasDocument;
  storageWarning?: "quota_exceeded";
};

function slugLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "layer";
}

export function createEditorSessionId(): string {
  return crypto.randomUUID();
}

function readStore(): Record<string, EditorCanvasDocument> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, EditorCanvasDocument>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, EditorCanvasDocument>, activeSessionId?: string): EditorCanvasSaveResult["storageWarning"] {
  if (typeof window === "undefined") {
    return undefined;
  }

  let payload = serializeEditorSessionStore(
    Object.fromEntries(
      Object.entries(store).map(([id, doc]) => [id, stripDocumentForStorage(doc)])
    )
  );
  let result = safeSetLocalStorage(STORAGE_KEY, payload);
  if (result.ok) {
    return undefined;
  }

  if (result.reason === "quota_exceeded") {
    const pruned = pruneEditorSessionStore(store, activeSessionId);
    payload = serializeEditorSessionStore(pruned);
    result = safeSetLocalStorage(STORAGE_KEY, payload);
    if (result.ok) {
      Object.keys(store).forEach((key) => {
        if (!(key in pruned)) {
          delete store[key];
        }
      });
      return "quota_exceeded";
    }
  }

  return "quota_exceeded";
}

export function loadEditorCanvasDocument(sessionId: string): EditorCanvasDocument | null {
  return readStore()[sessionId] ?? null;
}

function enrichEditorDocument(document: EditorCanvasDocument): EditorCanvasDocument {
  const semanticLayers = document.semanticLayers ?? extractEditorSemanticLayers(document.objects);
  let detectedObjects = syncDetectedObjectsOnDocument(
    document.objects,
    document.detectedObjects
  );
  const objectHierarchies =
    document.objectHierarchies ??
    buildDocumentObjectHierarchies(detectedObjects, document.objects, semanticLayers);
  detectedObjects = detectedObjects.map((obj) => {
    const hierarchy = objectHierarchies[obj.id];
    return hierarchy ? attachPartsToEditorObject(obj, hierarchy) : obj;
  });
  const textLayers = document.textLayers ?? extractEditorTextLayers(document.objects);
  const motionPreparations =
    document.motionPreparations ?? buildEditorMotionPreparations(detectedObjects, document.objects);
  const hierarchicalSelection =
    document.hierarchicalSelection ?? createDefaultHierarchicalSelection();
  const visionHierarchy =
    document.visionHierarchy ??
    buildEditorVisionHierarchy({
      objects: detectedObjects,
      layers: document.objects,
      semanticLayers,
      objectHierarchies,
      vision: document.visionAnalysis,
    });
  const withHandoff = attachStudioMotionHandoff({
    ...ensureEditorNonDestructiveState(document),
    semanticLayers,
    detectedObjects,
    textLayers,
    motionPreparations,
    objectHierarchies,
    visionHierarchy,
    hierarchicalSelection,
    workspaceMode: document.workspaceMode ?? "instruction_studio",
    importedLayers: document.importedLayers ?? [],
    libraryExports: document.libraryExports ?? [],
  });
  return refreshEditorAssetProfile({
    ...withHandoff,
    updatedAt: new Date().toISOString(),
  });
}

function persistEditorDocument(document: EditorCanvasDocument): EditorCanvasSaveResult {
  const next = enrichEditorDocument(document);
  const store = readStore();
  store[next.sessionId] = next;
  const storageWarning = writeStore(store, next.sessionId);
  return { document: next, storageWarning };
}

export function saveEditorCanvasDocument(document: EditorCanvasDocument): EditorCanvasDocument {
  return persistEditorDocument(document).document;
}

export function saveEditorCanvasDocumentWithStatus(
  document: EditorCanvasDocument
): EditorCanvasSaveResult {
  return persistEditorDocument(document);
}

export function listRecentEditorDocuments(limit = RECENT_LIMIT): EditorCanvasDocument[] {
  return Object.values(readStore())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export function createEditorDocumentFromUpload(params: {
  name: string;
  backgroundUrl: string;
  backgroundStorageKey?: string;
  workspaceMode?: import("@/types/homecheff-visual-editor").EditorWorkspaceMode;
}): EditorCanvasDocument {
  const sessionId = createEditorSessionId();
  const now = new Date().toISOString();
  return {
    sessionId,
    name: params.name,
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: params.backgroundUrl,
    backgroundStorageKey: params.backgroundStorageKey,
    workflowStep: "visual_editor",
    objects: [
      {
        id: "background",
        label: "Background",
        sourceKind: "upload",
        assetId: null,
        storageKey: params.backgroundStorageKey ?? "",
        previewUrl: params.backgroundUrl,
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        locked: true,
        visible: true,
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        layerType: "background",
        confidence: 1,
      },
    ],
    placements: [],
    workspaceMode: params.workspaceMode ?? "instruction_studio",
    status: "editing",
    createdAt: now,
    updatedAt: now,
  };
}

export function mapLibrarySourceKind(source: AssetDerivationSourceListItem): EditorSourceKind {
  if (source.isCanonicalCharacterBase) {
    return "canonical";
  }
  if (source.sourceType === "upload") {
    return "upload";
  }
  if (source.identityAssetType === "mascot" || source.identityAssetType === "character") {
    return "character";
  }
  return "generated";
}

export function assetPickerSelectionToDerivationSource(
  asset: { id: string; name: string; url?: string; storageKey?: string; category: string }
): AssetDerivationSourceListItem {
  const kindMap: Record<string, AssetDerivationSourceListItem["kind"]> = {
    characters: "character",
    locations: "location",
    props: "prop",
    worlds: "world",
    images: "prop",
    generated: "prop",
    voice: "character",
    music: "character",
  };
  return {
    sourceType: "library_asset",
    kind: kindMap[asset.category] ?? "prop",
    assetId: asset.id,
    name: asset.name,
    referenceImageUrl: asset.url ?? "",
    referenceStorageKey: asset.storageKey ?? "",
    thumbnailUrl: asset.url ?? "",
  };
}

export function createEditorDocumentFromLibrarySource(
  source: AssetDerivationSourceListItem
): EditorCanvasDocument {
  const sessionId = createEditorSessionId();
  const now = new Date().toISOString();
  const sourceKind = mapLibrarySourceKind(source);
  return {
    sessionId,
    name: source.name,
    sourceKind,
    sourceAssetId: source.assetId,
    backgroundUrl: source.referenceImageUrl,
    backgroundStorageKey: source.referenceStorageKey || undefined,
    workflowStep: "object_detection",
    objects: [
      {
        id: "background",
        label: "Background",
        sourceKind,
        assetId: source.assetId,
        storageKey: source.referenceStorageKey ?? "",
        previewUrl: source.referenceImageUrl,
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        locked: true,
        visible: true,
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        layerType: "background",
        confidence: 1,
      },
    ],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
  };
}

export async function runEditorVisionAndObjectDetection(
  document: EditorCanvasDocument
): Promise<EditorCanvasDocument> {
  const analyzed = await bootstrapEditorObjectDetection(document);
  return saveEditorCanvasDocument(analyzed);
}

export function applyEditorLayerOperation(
  document: EditorCanvasDocument,
  layerId: string,
  operation: EditorObjectOperation,
  patch?: Partial<EditorCanvasLayer>
): EditorCanvasDocument {
  const target = document.objects.find((layer) => layer.id === layerId);
  if (!target || !isEditorOperationAllowed(target, operation)) {
    return document;
  }

  const audit: EditorLayerOperationAudit = {
    layerId,
    operation,
    at: new Date().toISOString(),
  };

  const objects = document.objects.flatMap((layer) => {
    if (layer.id !== layerId) {
      return [layer];
    }
    if (operation === "delete") {
      return [];
    }
    if (operation === "duplicate") {
      const duplicated = applyEditorObjectOperation(layer, operation, patch) as EditorCanvasLayer;
      return [layer, { ...duplicated, id: `${layer.id}_copy_${Date.now()}`, layerSource: "manual" as const }];
    }
    const nextLayer = applyEditorObjectOperation(layer, operation, patch) as EditorCanvasLayer;
    if (operation === "rename") {
      return [{ ...nextLayer, layerSource: "manual" as const }];
    }
    return [nextLayer];
  });

  const historyAction =
    operation === "delete"
      ? ("remove" as const)
      : operation === "scale"
        ? ("resize" as const)
        : operation === "move"
          ? ("move" as const)
          : operation === "replace"
            ? ("replace" as const)
            : operation === "rename"
              ? ("rename" as const)
              : operation === "visibility"
                ? ("visibility" as const)
                : operation === "lock"
                  ? ("lock" as const)
                  : operation === "duplicate"
                    ? ("duplicate" as const)
                    : undefined;

  const nextDoc = {
    ...document,
    objects,
    layerOperations: [...(document.layerOperations ?? []), audit],
    detectedObjects: syncDetectedObjectsOnDocument(objects, document.detectedObjects),
    textLayers: extractEditorTextLayers(objects),
    motionPreparations: buildEditorMotionPreparations(
      syncDetectedObjectsOnDocument(objects, document.detectedObjects),
      objects
    ),
  };

  if (historyAction) {
    return saveEditorCanvasDocument(
      commitEditorHistory(document, nextDoc, historyAction, `${historyAction} ${target.label}`, layerId)
    );
  }
  return saveEditorCanvasDocument(nextDoc);
}

export function patchEditorLayerTransform(
  document: EditorCanvasDocument,
  layerId: string,
  transform: Partial<EditorCanvasTransform>
): EditorCanvasDocument {
  const target = document.objects.find((layer) => layer.id === layerId);
  if (!target || !isEditorOperationAllowed(target, "move")) {
    return document;
  }
  const nextTarget = {
    ...target,
    transform: { ...target.transform, ...transform },
  };
  const withTarget = saveEditorCanvasDocument({
    ...document,
    objects: document.objects.map((layer) => (layer.id === layerId ? nextTarget : layer)),
  });
  return saveEditorCanvasDocument(
    syncLinkedPlacementsOnTargetMove(withTarget, layerId, target, nextTarget)
  );
}

export function patchEditorLayerFields(
  document: EditorCanvasDocument,
  layerId: string,
  patch: Partial<EditorCanvasLayer>
): EditorCanvasDocument {
  const target = document.objects.find((layer) => layer.id === layerId);
  if (!target) {
    return document;
  }
  if (patch.label !== undefined && !isEditorOperationAllowed(target, "rename")) {
    return document;
  }
  return saveEditorCanvasDocument({
    ...document,
    objects: document.objects.map((layer) =>
      layer.id === layerId
        ? {
            ...layer,
            ...patch,
            layerSource: patch.label ? ("manual" as const) : layer.layerSource,
          }
        : layer
    ),
  });
}

export function markEditorDocumentDraftSaved(document: EditorCanvasDocument): EditorCanvasDocument {
  return saveEditorCanvasDocument({
    ...document,
    status: "draft_saved",
    workflowStep: "save_asset",
  });
}

export function buildEditorDownloadFilename(document: EditorCanvasDocument): string {
  return `${slugLabel(document.name)}-editor-${document.sessionId.slice(0, 8)}.png`;
}

export function reorderEditorLayerInDocument(
  document: EditorCanvasDocument,
  layerId: string,
  direction: "up" | "down"
): EditorCanvasDocument {
  const objects = reorderEditorLayers(document.objects, layerId, direction);
  const detectedObjects = syncDetectedObjectsOnDocument(objects, document.detectedObjects);
  const next = {
    ...document,
    objects,
    detectedObjects,
  };
  return saveEditorCanvasDocument(
    commitEditorHistory(document, next, "reorder", `reorder ${layerId}`, layerId)
  );
}

export function renameEditorLayerInDocument(
  document: EditorCanvasDocument,
  layerId: string,
  label: string
): EditorCanvasDocument {
  const objects = renameEditorLayer(document.objects, layerId, label);
  const detectedObjects = syncDetectedObjectsOnDocument(objects, document.detectedObjects);
  const next = { ...document, objects, detectedObjects };
  return saveEditorCanvasDocument(
    commitEditorHistory(document, next, "rename", `rename ${label}`, layerId)
  );
}

export { undoEditorDocument, redoEditorDocument };

export function toVisualEditorSession(document: EditorCanvasDocument) {
  const base = createEmptyVisualEditorSession(document.sourceAssetId);
  return {
    ...base,
    sessionId: document.sessionId,
    sourceAssetId: document.sourceAssetId,
    backgroundUrl: document.backgroundUrl,
    objects: document.objects.filter((o) => o.layerType !== "background"),
    placements: document.placements,
    bodyDesigner: document.bodyDesigner,
  };
}
