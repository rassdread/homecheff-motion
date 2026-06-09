import { createEmptyReferencePlacement } from "@/lib/studio-asset-reference-placement";
import { createDefaultCanvasTransform } from "@/lib/homecheff-visual-editor-foundation";
import type {
  EditorCanvasDocument,
  EditorCanvasLayer,
  EditorPlacementExactnessMode,
  EditorPlacementItem,
  PlacementCanvasItem,
} from "@/types/homecheff-visual-editor";
import type {
  ReferencePlacementImportance,
  ReferencePlacementType,
} from "@/types/studio-asset-generation-workbench";

const RECENT_PLACEMENTS_KEY = "hc-editor-recent-placements-v1";
const RECENT_LIMIT = 8;

export function defaultEditorPlacementExactness(
  placementType: ReferencePlacementType
): EditorPlacementExactnessMode {
  if (
    placementType === "logo" ||
    placementType === "icon" ||
    placementType === "badge" ||
    placementType === "label" ||
    placementType === "sticker"
  ) {
    return "pixel_overlay";
  }
  if (placementType === "poster" || placementType === "photo") {
    return "hybrid";
  }
  return "image_reference";
}

export function createEditorPlacementItem(params: {
  sourceName: string;
  sourcePreviewUrl: string;
  sourceStorageKey: string;
  sourceAssetId?: string | null;
  placementType?: ReferencePlacementType;
  targetLayer?: EditorCanvasLayer | null;
  customTarget?: boolean;
  importance?: ReferencePlacementImportance;
  exactnessMode?: EditorPlacementExactnessMode;
}): EditorPlacementItem {
  const now = new Date().toISOString();
  const target = params.targetLayer;
  const bounds = target?.bounds ?? { x: 0.35, y: 0.35, width: 0.3, height: 0.2 };
  const placementType = params.placementType ?? "logo";
  const importance = params.importance ?? "high_priority";
  const exactnessMode = params.exactnessMode ?? defaultEditorPlacementExactness(placementType);
  const base = createEmptyReferencePlacement();
  return {
    ...base,
    assetId: params.sourceAssetId ?? null,
    storageKey: params.sourceStorageKey,
    previewUrl: params.sourcePreviewUrl,
    sourceName: params.sourceName,
    placementType,
    placementTarget: params.customTarget ? "custom" : inferPlacementTargetFromLayer(target),
    placementTargetCustom: params.customTarget ? "Custom area" : target?.label,
    importance,
    locked: importance === "exact" || importance === "required",
    objectTarget: target
      ? {
          objectId: target.id,
          objectLabel: target.label,
          objectKind: mapLayerCategoryToObjectKind(target),
        }
      : undefined,
    canvasTransform: {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
      scale: 1,
      rotation: 0,
    },
    linkedObjectId: target?.id,
    canvasLocked: importance === "exact" || importance === "required",
    opacity: 1,
    zIndex: 10,
    exactnessMode,
    visible: true,
    targetLabel: target?.label ?? "Custom area",
    customTarget: params.customTarget ?? !target,
    canvasWidth: bounds.width,
    canvasHeight: bounds.height,
    createdAt: now,
    updatedAt: now,
  };
}

function mapLayerCategoryToObjectKind(
  layer: EditorCanvasLayer
): "character" | "prop" | "packaging" | "clothing" | "background" | "other" {
  if (layer.category === "clothing" || layer.category === "accessory") {
    return "clothing";
  }
  if (layer.category === "product" || layer.category === "package" || layer.category === "label") {
    return "packaging";
  }
  if (layer.category === "background" || layer.category === "environment") {
    return "background";
  }
  if (layer.category === "prop") {
    return "prop";
  }
  if (layer.category === "character" || layer.category === "body" || layer.category === "face") {
    return "character";
  }
  return "other";
}

function inferPlacementTargetFromLayer(
  layer: EditorCanvasLayer | null | undefined
): PlacementCanvasItem["placementTarget"] {
  if (!layer) {
    return "custom";
  }
  const label = layer.label.toLowerCase();
  if (/apron|shirt|jacket|torso|chest/.test(label)) {
    return "apron_center";
  }
  if (/hat|cap|headwear/.test(label)) {
    return "hat_front";
  }
  if (/box|package|packaging|product/.test(label)) {
    return "packaging_front";
  }
  if (/poster|wall|background/.test(label)) {
    return "background_poster";
  }
  if (/sleeve|arm/.test(label)) {
    return "sleeve";
  }
  return "object_surface";
}

export function patchEditorPlacement(
  document: EditorCanvasDocument,
  placementId: string,
  patch: Partial<EditorPlacementItem>
): EditorCanvasDocument {
  return {
    ...document,
    placements: document.placements.map((p) =>
      p.id === placementId ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
    ),
  };
}

export function addEditorPlacement(
  document: EditorCanvasDocument,
  placement: EditorPlacementItem
): EditorCanvasDocument {
  const maxZ = document.placements.reduce((max, p) => Math.max(max, p.zIndex ?? 0), 0);
  return {
    ...document,
    placements: [...document.placements, { ...placement, zIndex: maxZ + 1 }],
  };
}

export function removeEditorPlacement(document: EditorCanvasDocument, placementId: string): EditorCanvasDocument {
  return {
    ...document,
    placements: document.placements.filter((p) => p.id !== placementId),
  };
}

export function duplicateEditorPlacement(
  document: EditorCanvasDocument,
  placementId: string
): EditorCanvasDocument {
  const source = document.placements.find((p) => p.id === placementId);
  if (!source) {
    return document;
  }
  const copy: EditorPlacementItem = {
    ...(source as EditorPlacementItem),
    id: crypto.randomUUID(),
    sourceName: `${source.sourceName} (copy)`,
    canvasTransform: {
      ...source.canvasTransform,
      x: source.canvasTransform.x + 0.03,
      y: source.canvasTransform.y + 0.03,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return addEditorPlacement(document, copy);
}

export function centerPlacementOnTarget(
  document: EditorCanvasDocument,
  placementId: string
): EditorCanvasDocument {
  const placement = document.placements.find((p) => p.id === placementId);
  if (!placement?.linkedObjectId) {
    return document;
  }
  const target = document.objects.find((o) => o.id === placement.linkedObjectId);
  if (!target) {
    return document;
  }
  return patchEditorPlacement(document, placementId, {
    canvasTransform: {
      ...placement.canvasTransform,
      x: target.transform.x,
      y: target.transform.y,
    },
    canvasWidth: target.bounds.width * 0.6,
    canvasHeight: target.bounds.height * 0.5,
  });
}

export function syncLinkedPlacementsOnTargetMove(
  document: EditorCanvasDocument,
  targetLayerId: string,
  prevTarget: EditorCanvasLayer,
  nextTarget: EditorCanvasLayer
): EditorCanvasDocument {
  const dx = nextTarget.transform.x - prevTarget.transform.x;
  const dy = nextTarget.transform.y - prevTarget.transform.y;
  if (dx === 0 && dy === 0) {
    return document;
  }
  return {
    ...document,
    placements: document.placements.map((placement) => {
      if (placement.linkedObjectId !== targetLayerId) {
        return placement;
      }
      return {
        ...placement,
        canvasTransform: {
          ...placement.canvasTransform,
          x: Math.min(1, Math.max(0, placement.canvasTransform.x + dx)),
          y: Math.min(1, Math.max(0, placement.canvasTransform.y + dy)),
        },
        updatedAt: new Date().toISOString(),
      };
    }),
  };
}

export function reorderEditorPlacementZIndex(
  document: EditorCanvasDocument,
  placementId: string,
  direction: "forward" | "backward"
): EditorCanvasDocument {
  const sorted = [...document.placements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const index = sorted.findIndex((p) => p.id === placementId);
  if (index < 0) {
    return document;
  }
  const swapIndex = direction === "forward" ? index + 1 : index - 1;
  if (swapIndex < 0 || swapIndex >= sorted.length) {
    return document;
  }
  const current = sorted[index]!;
  const swap = sorted[swapIndex]!;
  const currentZ = current.zIndex ?? index;
  const swapZ = swap.zIndex ?? swapIndex;
  return {
    ...document,
    placements: document.placements.map((p) => {
      if (p.id === current.id) {
        return { ...p, zIndex: swapZ };
      }
      if (p.id === swap.id) {
        return { ...p, zIndex: currentZ };
      }
      return p;
    }),
  };
}

export function visibleEditorPlacements(document: EditorCanvasDocument): EditorPlacementItem[] {
  return document.placements.filter((p) => p.visible !== false) as EditorPlacementItem[];
}

export function rememberRecentEditorPlacement(source: {
  sourceName: string;
  sourcePreviewUrl: string;
  sourceStorageKey: string;
  sourceAssetId?: string | null;
  placementType?: ReferencePlacementType;
}): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const raw = window.localStorage.getItem(RECENT_PLACEMENTS_KEY);
    const list = raw ? (JSON.parse(raw) as typeof source[]) : [];
    const next = [source, ...list.filter((item) => item.sourceStorageKey !== source.sourceStorageKey)].slice(
      0,
      RECENT_LIMIT
    );
    window.localStorage.setItem(RECENT_PLACEMENTS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function listRecentEditorPlacements(): Array<{
  sourceName: string;
  sourcePreviewUrl: string;
  sourceStorageKey: string;
  sourceAssetId?: string | null;
  placementType?: ReferencePlacementType;
}> {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(RECENT_PLACEMENTS_KEY);
    return raw ? (JSON.parse(raw) as ReturnType<typeof listRecentEditorPlacements>) : [];
  } catch {
    return [];
  }
}

export function editorDocumentUsesPlacementSource(
  document: EditorCanvasDocument,
  params: { assetId: string; storageKey?: string | null }
): boolean {
  const storageKey = params.storageKey?.trim() ?? "";
  return document.placements.some(
    (p) =>
      (params.assetId && p.assetId === params.assetId) ||
      (storageKey.length > 0 && p.storageKey === storageKey)
  );
}

export function editorPlacementToReferencePlacement(item: EditorPlacementItem): PlacementCanvasItem {
  return {
    ...item,
    objectTarget: item.linkedObjectId
      ? {
          objectId: item.linkedObjectId,
          objectLabel: item.targetLabel,
          objectKind: item.objectTarget?.objectKind ?? "other",
        }
      : item.objectTarget,
  };
}

export function resetEditorPlacementTransform(placement: EditorPlacementItem): EditorPlacementItem {
  return {
    ...placement,
    canvasTransform: createDefaultCanvasTransform(),
    opacity: 1,
    updatedAt: new Date().toISOString(),
  };
}

export function listEditorSessionsUsingPlacementSource(params: {
  assetId: string;
  storageKey?: string | null;
}): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem("hc-editor-canvas-sessions-v1");
    if (!raw) {
      return [];
    }
    const store = JSON.parse(raw) as Record<string, EditorCanvasDocument>;
    return Object.values(store)
      .filter((doc) => editorDocumentUsesPlacementSource(doc, params))
      .map((doc) => doc.sessionId);
  } catch {
    return [];
  }
}

export function editorPlacementBlocksHardDelete(
  editorSessionIds: string[],
  assetId: string
): boolean {
  return editorSessionIds.length > 0 && Boolean(assetId);
}
