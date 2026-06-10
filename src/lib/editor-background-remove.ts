import { promoteCutoutToImportedLayer, syncCompositorMasterBackground } from "@/lib/editor-compositor";
import { applySegmentCutoutToDocument } from "@/lib/editor-v6-one-click-cutout";
import { appendLibraryExport } from "@/lib/editor-library-categories";
import type { EditorCanvasDocument, EditorCanvasLayer, EditorShapePoint } from "@/types/homecheff-visual-editor";

export function findPrimarySubjectLayer(document: EditorCanvasDocument): EditorCanvasLayer | null {
  const semantic = document.objects.find(
    (layer) => layer.layerType === "semantic" && layer.visible !== false && layer.category !== "background"
  );
  if (semantic) {
    return semantic;
  }
  return document.objects.find((layer) => layer.layerType !== "background" && layer.visible !== false) ?? null;
}

export function applyBackgroundRemovalResult(
  document: EditorCanvasDocument,
  result: {
    cutoutUrl: string;
    maskUrl?: string;
    maskStorageKey?: string;
    polygon?: EditorShapePoint[];
  }
): EditorCanvasDocument {
  const subject = findPrimarySubjectLayer(document);
  if (subject) {
    const applied = applySegmentCutoutToDocument(document, subject.id, result);
    let next = applied.document;
    if (result.cutoutUrl) {
      next = syncCompositorMasterBackground(next, result.cutoutUrl);
    }
    return next;
  }

  let next = promoteCutoutToImportedLayer(document, {
    cutoutUrl: result.cutoutUrl,
    label: document.name || "Subject",
    layerId: "background_remove",
    maskUrl: result.maskUrl,
    dropPoint: { x: 0.5, y: 0.5 },
  });
  next = syncCompositorMasterBackground(next, result.cutoutUrl);
  next = appendLibraryExport(next, {
    category: "cutout",
    label: `${next.name} — no background`,
    profile: "production_ready",
    format: "png",
    url: result.cutoutUrl,
    metadata: { transparent: true, backgroundRemoved: true },
  });
  return next;
}
