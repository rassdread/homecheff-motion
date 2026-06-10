import { createImportedLayerFromCutout } from "@/lib/editor-imported-layers";
import { nextImportedLayerZIndex } from "@/lib/editor-dual-composer";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import type { EditorCanvasDocument, EditorImportedLayer } from "@/types/homecheff-visual-editor";

export type LibraryDragPayload = {
  sourceAssetId: string | null;
  imageUrl: string;
  storageKey?: string;
  label: string;
  kind: "cutout" | "logo" | "mascot" | "product" | "generic";
  dropPoint?: { x: number; y: number };
};

export function librarySourceToDragPayload(
  source: AssetDerivationSourceListItem,
  dropPoint?: { x: number; y: number }
): LibraryDragPayload {
  const kind =
    source.kind === "character"
      ? "mascot"
      : source.kind === "prop"
        ? "product"
        : source.name.toLowerCase().includes("logo")
          ? "logo"
          : "generic";

  return {
    sourceAssetId: source.assetId,
    imageUrl: source.referenceImageUrl || source.thumbnailUrl,
    storageKey: source.referenceStorageKey,
    label: source.name,
    kind,
    dropPoint: dropPoint ?? { x: 0.5, y: 0.5 },
  };
}

export function dropLibraryAssetOnCanvas(
  document: EditorCanvasDocument,
  payload: LibraryDragPayload
): EditorCanvasDocument {
  const layer = createImportedLayerFromCutout({
    label: payload.label,
    sourceAssetId: payload.sourceAssetId,
    sourceImageUrl: payload.imageUrl,
    sourceStorageKey: payload.storageKey,
    cutoutUrl: payload.imageUrl,
    dropPoint: payload.dropPoint,
  });
  layer.zIndex = nextImportedLayerZIndex(document.importedLayers);

  return {
    ...document,
    importedLayers: [...(document.importedLayers ?? []), layer],
    workspaceMode: document.workspaceMode ?? "photo_edit",
    updatedAt: new Date().toISOString(),
  };
}

export function filterLibrarySourcesForDrag(
  sources: AssetDerivationSourceListItem[]
): AssetDerivationSourceListItem[] {
  return sources.filter((s) => Boolean(s.referenceImageUrl?.trim() || s.thumbnailUrl?.trim()));
}

export function importedLayerFromPayload(payload: LibraryDragPayload): EditorImportedLayer {
  return createImportedLayerFromCutout({
    label: payload.label,
    sourceAssetId: payload.sourceAssetId,
    sourceImageUrl: payload.imageUrl,
    sourceStorageKey: payload.storageKey,
    cutoutUrl: payload.imageUrl,
    dropPoint: payload.dropPoint,
  });
}
