import { buildEditorSavePayload } from "@/lib/editor-canvas-export";
import { promoteCutoutToImportedLayer } from "@/lib/editor-compositor";
import { buildEditorCutoutAsset, editorCutoutReady, upsertEditorCutoutAsset } from "@/lib/editor-cutout-layers";
import { appendLibraryExport } from "@/lib/editor-library-categories";
import { findEditorObjectByLayerId } from "@/lib/editor-object-detection";
import { detachObjectCutoutLayer } from "@/lib/editor-object-mask";
import type {
  EditorCanvasDocument,
  EditorCanvasLayer,
  EditorCutoutAsset,
  EditorShapePoint,
} from "@/types/homecheff-visual-editor";

export type OneClickCutoutResult = {
  document: EditorCanvasDocument;
  cutout: EditorCutoutAsset | null;
  needsSegmentation: boolean;
  downloadUrl?: string;
};

export function layerHasCutoutReady(layer: EditorCanvasLayer | null): boolean {
  return editorCutoutReady(layer);
}

export function applySegmentCutoutToDocument(
  document: EditorCanvasDocument,
  layerId: string,
  result: {
    cutoutUrl: string;
    maskUrl?: string;
    maskStorageKey?: string;
    polygon?: EditorShapePoint[];
  }
): OneClickCutoutResult {
  const layer = document.objects.find((o) => o.id === layerId);
  if (!layer) {
    return { document, cutout: null, needsSegmentation: false };
  }

  const nextLayer = detachObjectCutoutLayer(layer, result.cutoutUrl, result.maskUrl);
  const detectedObjects = document.detectedObjects ?? [];
  const editorObject = findEditorObjectByLayerId(detectedObjects, layerId);
  let cutout: EditorCutoutAsset | null = null;

  if (editorObject) {
    cutout = buildEditorCutoutAsset({
      object: editorObject,
      layer: nextLayer,
      cutoutUrl: result.cutoutUrl,
      maskUrl: result.maskUrl,
      maskStorageKey: result.maskStorageKey,
      polygon: result.polygon,
    });
  }

  const objects = document.objects.map((o) => (o.id === layerId ? nextLayer : o));
  let next: EditorCanvasDocument = {
    ...document,
    objects,
    cutoutAssets: cutout ? upsertEditorCutoutAsset(document.cutoutAssets, cutout) : document.cutoutAssets,
    updatedAt: new Date().toISOString(),
  };

  next = promoteCutoutToImportedLayer(next, {
    cutoutUrl: result.cutoutUrl,
    label: layer.label,
    layerId,
    maskUrl: result.maskUrl,
    dropPoint: {
      x: nextLayer.transform.x,
      y: nextLayer.transform.y,
    },
  });

  next = appendLibraryExport(next, {
    category: "cutout",
    label: `${layer.label} — cutout`,
    profile: "production_ready",
    format: "png",
    url: result.cutoutUrl,
    metadata: result.maskUrl ? { transparent: true, maskUrl: result.maskUrl } : { transparent: true },
  });

  return {
    document: next,
    cutout,
    needsSegmentation: false,
    downloadUrl: result.cutoutUrl,
  };
}

export function planOneClickCutout(
  document: EditorCanvasDocument,
  layerId: string
): OneClickCutoutResult {
  const layer = document.objects.find((o) => o.id === layerId) ?? null;
  const existing = document.cutoutAssets?.find((c) => c.layerId === layerId);

  if (existing) {
    const next = appendLibraryExport(document, {
      category: "cutout",
      label: `${existing.label}`,
      profile: "production_ready",
      format: "png",
      url: existing.cutoutUrl,
      metadata: { reusable: true },
    });
    return {
      document: next,
      cutout: existing,
      needsSegmentation: false,
      downloadUrl: existing.cutoutUrl,
    };
  }

  if (layer && layerHasCutoutReady(layer)) {
    const cutoutUrl = layer.selectionShape?.cutoutUrl ?? layer.previewUrl;
    if (cutoutUrl) {
      return applySegmentCutoutToDocument(document, layerId, {
        cutoutUrl,
        maskUrl: layer.selectionShape?.maskUrl,
        polygon: layer.selectionShape?.polygon,
      });
    }
  }

  return {
    document,
    cutout: null,
    needsSegmentation: true,
  };
}

export function cutoutSavePayloadHint(document: EditorCanvasDocument): string {
  const payload = buildEditorSavePayload(document);
  return payload.downloadableHint;
}
