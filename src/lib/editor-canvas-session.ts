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
import { resolveVisionHierarchyForDocument, traceVisionHierarchyStage, documentHasRichVisionAnalysis } from "@/lib/editor-vision-v6-stability";
import { createDefaultHierarchicalSelection } from "@/lib/editor-hierarchical-selection";
import { refreshEditorAssetProfile } from "@/lib/editor-asset-intelligence";
import { attachStudioMotionHandoff } from "@/lib/editor-studio-motion-handoff";
import { buildEditorMotionPreparations } from "@/lib/editor-motion-preparation";
import { reorderEditorLayers, renameEditorLayer } from "@/lib/editor-semantic-layer-tree";
import {
  editorAnalysisAppliesToBackground,
} from "@/lib/editor-analysis-reset";
import { sanitizeDocumentForAssetIsolation } from "@/lib/editor-project-isolation";
import { traceVisionHierarchyRegression } from "@/lib/editor-vision-hierarchy-loss-trace";
import { traceVisionPartsLossStage } from "@/lib/editor-vision-parts-loss-trace";
import {
  executeEditorVisionAnalysisRun,
  prepareDocumentForVisionBootstrap,
  resolveEditorVisionAnalysisDepth,
  type EditorVisionAnalysisRunOptions,
} from "@/lib/editor-vision-analysis-run";
import { bootstrapEditorObjectDetection } from "@/lib/editor-detection-bootstrap";
import { extractEditorTextLayers } from "@/lib/editor-text-layers";
import { syncLinkedPlacementsOnTargetMove } from "@/lib/editor-placement-canvas";
import { isEditorOperationAllowed } from "@/lib/editor-layer-action-eligibility";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import {
  EDITOR_CANVAS_SESSIONS_KEY,
  pruneEditorSessionStore,
  safeSetLocalStorage,
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
  /** Save succeeded after pruning older sessions — not a hard failure. */
  storageWarning?: "quota_exceeded";
  /** True when the session round-trips from localStorage after write. */
  persisted: boolean;
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

  const stripped = Object.fromEntries(
    Object.entries(store).map(([id, doc]) => [id, stripDocumentForStorage(doc)])
  );
  const buildPayload = (source: Record<string, EditorCanvasDocument>) =>
    JSON.stringify(
      activeSessionId ? pruneEditorSessionStore(source, activeSessionId) : pruneEditorSessionStore(source)
    );

  let payload = buildPayload(stripped);
  let result = safeSetLocalStorage(STORAGE_KEY, payload);
  if (result.ok) {
    return undefined;
  }

  if (result.reason === "quota_exceeded") {
    const pruned = pruneEditorSessionStore(stripped, activeSessionId);
    payload = JSON.stringify(pruned);
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
  const doc = readStore()[sessionId] ?? null;
  if (!doc) {
    return null;
  }
  const normalized =
    !doc.analyzedBackgroundUrl && documentHasRichVisionAnalysis(doc)
      ? { ...doc, analyzedBackgroundUrl: doc.backgroundUrl }
      : doc;
  const sanitized = sanitizeDocumentForAssetIsolation(normalized);
  traceVisionHierarchyStage("after_loadEditorCanvasDocument", sanitized);
  return sanitized;
}

function enrichEditorDocument(document: EditorCanvasDocument): EditorCanvasDocument {
  const analysisFresh = editorAnalysisAppliesToBackground(document);
  const semanticLayers =
    analysisFresh && document.visionV6Meta?.illustrationAnalysis && document.semanticLayers?.length
      ? document.semanticLayers
      : document.semanticLayers ?? extractEditorSemanticLayers(document.objects);
  let detectedObjects =
    analysisFresh && document.visionV6Meta?.illustrationAnalysis && document.detectedObjects?.length
      ? document.detectedObjects
      : syncDetectedObjectsOnDocument(document.objects, document.detectedObjects);
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
  const visionHierarchy = resolveVisionHierarchyForDocument(document, () =>
    buildEditorVisionHierarchy({
      objects: detectedObjects,
      layers: document.objects,
      semanticLayers,
      objectHierarchies,
      vision: document.visionAnalysis,
    })
  );
  const withHandoff = attachStudioMotionHandoff({
    ...ensureEditorNonDestructiveState(document),
    semanticLayers,
    detectedObjects,
    textLayers,
    motionPreparations,
    objectHierarchies,
    visionHierarchy,
    visionV6Meta: document.visionV6Meta,
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

function persistEditorDocumentRaw(document: EditorCanvasDocument): EditorCanvasSaveResult {
  const next = {
    ...stripDocumentForStorage(document),
    updatedAt: new Date().toISOString(),
  };
  const store = readStore();
  store[next.sessionId] = next;
  const storageWarning = writeStore(store, next.sessionId);
  const persisted = Boolean(readStore()[next.sessionId]);
  return { document: next, storageWarning, persisted };
}

function persistEditorDocument(document: EditorCanvasDocument): EditorCanvasSaveResult {
  const next = enrichEditorDocument(document);
  traceVisionHierarchyStage("after_enrichEditorDocument", next);
  traceVisionHierarchyRegression("persisted_document", {
    document: stripDocumentForStorage(next),
  });
  traceVisionPartsLossStage("vision_parts_persisted", {
    sessionId: next.sessionId,
    document: next,
  });
  const store = readStore();
  store[next.sessionId] = next;
  const storageWarning = writeStore(store, next.sessionId);
  const persisted = Boolean(readStore()[next.sessionId]);
  return { document: next, storageWarning, persisted };
}

export function saveEditorCanvasDocument(document: EditorCanvasDocument): EditorCanvasDocument {
  return persistEditorDocument(document).document;
}

export function saveEditorCanvasDocumentWithStatus(
  document: EditorCanvasDocument
): EditorCanvasSaveResult {
  return persistEditorDocument(document);
}

/** Skip enrich — smaller payload for wizard localStorage fallback. */
export function saveEditorCanvasDocumentRawWithStatus(
  document: EditorCanvasDocument
): EditorCanvasSaveResult {
  return persistEditorDocumentRaw(document);
}

export function listRecentEditorDocuments(limit = RECENT_LIMIT): EditorCanvasDocument[] {
  return Object.values(readStore())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export function removeEditorCanvasSession(sessionId: string): void {
  const id = sessionId.trim();
  if (!id || typeof window === "undefined") {
    return;
  }
  const store = readStore();
  if (!(id in store)) {
    return;
  }
  delete store[id];
  writeStore(store);
}

/** Clears hcProjectId from editor sessions without removing session data. */
export function detachHcProjectFromEditorSessions(hcProjectId: string): number {
  const id = hcProjectId.trim();
  if (!id || typeof window === "undefined") {
    return 0;
  }
  const store = readStore();
  let count = 0;
  const now = new Date().toISOString();
  for (const sessionId of Object.keys(store)) {
    const doc = store[sessionId];
    if (doc?.instructionStudioState?.hcProjectId !== id) {
      continue;
    }
    store[sessionId] = {
      ...doc,
      updatedAt: now,
      instructionStudioState: {
        ...doc.instructionStudioState,
        hcProjectId: undefined,
      },
    };
    count += 1;
  }
  if (count > 0) {
    writeStore(store);
  }
  return count;
}

/** Updates document.name for all editor sessions linked to an HC project. */
export function syncHcProjectTitleInEditorSessions(hcProjectId: string, title: string): number {
  const id = hcProjectId.trim();
  const nextTitle = title.trim();
  if (!id || !nextTitle || typeof window === "undefined") {
    return 0;
  }
  const store = readStore();
  let count = 0;
  const now = new Date().toISOString();
  for (const sessionId of Object.keys(store)) {
    const doc = store[sessionId];
    if (doc?.instructionStudioState?.hcProjectId !== id) {
      continue;
    }
    store[sessionId] = {
      ...doc,
      name: nextTitle,
      updatedAt: now,
    };
    count += 1;
  }
  if (count > 0) {
    writeStore(store);
  }
  return count;
}

export function __resetEditorCanvasSessionsForTests(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
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
    projectOrigin: "local",
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
    projectOrigin: "local",
    createdAt: now,
    updatedAt: now,
  };
}

export async function runEditorVisionAndObjectDetection(
  document: EditorCanvasDocument,
  options?: EditorVisionAnalysisRunOptions
): Promise<EditorCanvasDocument> {
  const analysisDepth = resolveEditorVisionAnalysisDepth({
    analysisDepth: options?.analysisDepth,
    trigger: options?.trigger,
  });
  return executeEditorVisionAnalysisRun(
    document,
    async (run, reportStage) => {
      const prepared = prepareDocumentForVisionBootstrap(document, {
        preserveUserEdits: options?.preserveUserEdits,
        analysisDepth,
        trigger: options?.trigger,
      });
      traceVisionHierarchyStage("before_bootstrapEditorObjectDetection", prepared);
      const analyzed = await bootstrapEditorObjectDetection(prepared, {
        onStage: reportStage,
        onProgress: options?.onProgress,
        runScope: run,
        analysisDepth,
        trigger: options?.trigger,
      });
      traceVisionHierarchyStage("before_saveEditorCanvasDocument", analyzed);
      const saved = saveEditorCanvasDocument(analyzed);
      traceVisionHierarchyStage("after_saveEditorCanvasDocument", saved);
      return saved;
    },
    options
  );
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
