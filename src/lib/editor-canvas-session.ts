import { analyzeAssetStyleDnaApi } from "@/lib/studio-asset-derivation-client";
import {
  applyEditorObjectOperation,
  createEmptyVisualEditorSession,
} from "@/lib/homecheff-visual-editor-foundation";
import { seedEditorLayersFromVision } from "@/lib/editor-canvas-layers";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import type {
  EditorCanvasDocument,
  EditorCanvasLayer,
  EditorCanvasTransform,
  EditorObjectOperation,
  EditorSourceKind,
} from "@/types/homecheff-visual-editor";

const STORAGE_KEY = "hc-editor-canvas-sessions-v1";
const RECENT_LIMIT = 8;

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

function writeStore(store: Record<string, EditorCanvasDocument>): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadEditorCanvasDocument(sessionId: string): EditorCanvasDocument | null {
  return readStore()[sessionId] ?? null;
}

export function saveEditorCanvasDocument(document: EditorCanvasDocument): EditorCanvasDocument {
  const next = { ...document, updatedAt: new Date().toISOString() };
  const store = readStore();
  store[next.sessionId] = next;
  writeStore(store);
  return next;
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
  const res = await analyzeAssetStyleDnaApi({
    imageUrl: document.backgroundUrl,
    sourceKind: "character",
    sourceName: document.name,
    derivationJobId: document.sessionId,
  });
  if (!res.ok) {
    return { ...document, workflowStep: "visual_editor", updatedAt: new Date().toISOString() };
  }
  const layers = seedEditorLayersFromVision({
    vision: res.data.visionAnalysis,
    sourceKind: document.sourceKind,
    preserveBackground: document.objects.find((o) => o.id === "background"),
  });
  return saveEditorCanvasDocument({
    ...document,
    workflowStep: "visual_editor",
    visionAnalysisHash: res.data.visionAnalysis.identityFingerprint.fingerprintHash,
    objects: layers,
  });
}

export function applyEditorLayerOperation(
  document: EditorCanvasDocument,
  layerId: string,
  operation: EditorObjectOperation,
  patch?: Partial<EditorCanvasLayer>
): EditorCanvasDocument {
  const objects = document.objects.flatMap((layer) => {
    if (layer.id !== layerId) {
      return [layer];
    }
    if (operation === "delete") {
      return [];
    }
    if (operation === "duplicate") {
      const duplicated = applyEditorObjectOperation(layer, operation, patch) as EditorCanvasLayer;
      return [layer, { ...duplicated, id: `${layer.id}_copy_${Date.now()}` }];
    }
    return [applyEditorObjectOperation(layer, operation, patch) as EditorCanvasLayer];
  });
  return { ...document, objects };
}

export function patchEditorLayerTransform(
  document: EditorCanvasDocument,
  layerId: string,
  transform: Partial<EditorCanvasTransform>
): EditorCanvasDocument {
  return {
    ...document,
    objects: document.objects.map((layer) =>
      layer.id === layerId && !layer.locked
        ? { ...layer, transform: { ...layer.transform, ...transform } }
        : layer
    ),
  };
}

export function patchEditorLayerFields(
  document: EditorCanvasDocument,
  layerId: string,
  patch: Partial<EditorCanvasLayer>
): EditorCanvasDocument {
  return {
    ...document,
    objects: document.objects.map((layer) => (layer.id === layerId ? { ...layer, ...patch } : layer)),
  };
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
