import { humanPartLabel } from "@/lib/editor-part-human-labels";
import type {
  EditorCanvasDocument,
  EditorObjectHierarchy,
  EditorObjectPart,
  EditorPartLibraryAsset,
} from "@/types/homecheff-visual-editor";

export function buildPartLibraryAsset(input: {
  hierarchy: EditorObjectHierarchy;
  part: EditorObjectPart;
}): EditorPartLibraryAsset {
  const { hierarchy, part } = input;
  const assetType =
    part.partCategory === "logo" ? "logo" : part.cutoutUrl ? "cutout" : "part";

  return {
    id: `lib_${part.id}`,
    label: `${hierarchy.rootLabel} ${humanPartLabel(part.partCategory, part.label)}`,
    partCategory: part.partCategory,
    parentObjectLabel: hierarchy.rootLabel,
    parentObjectId: hierarchy.rootObjectId,
    parentLayerId: hierarchy.rootLayerId,
    assetType,
    cutoutUrl: part.cutoutUrl,
    maskUrl: part.mask,
    maskStorageKey: part.maskStorageKey,
    boundingBox: part.bbox,
    animationProfile: part.animationProfile,
    createdAt: new Date().toISOString(),
  };
}

export function upsertPartLibraryAsset(
  assets: EditorPartLibraryAsset[] | undefined,
  asset: EditorPartLibraryAsset
): EditorPartLibraryAsset[] {
  const list = assets ?? [];
  return [...list.filter((a) => a.id !== asset.id), asset];
}

export function savePartToLibrary(
  document: EditorCanvasDocument,
  rootObjectId: string,
  partId: string
): EditorCanvasDocument {
  const hierarchy = document.objectHierarchies?.[rootObjectId];
  if (!hierarchy) return document;
  const part = hierarchy.parts.find((p) => p.id === partId);
  if (!part) return document;

  const asset = buildPartLibraryAsset({ hierarchy, part });
  return {
    ...document,
    partLibraryAssets: upsertPartLibraryAsset(document.partLibraryAssets, asset),
    updatedAt: new Date().toISOString(),
  };
}

export function findLibraryAssetsForObject(
  assets: EditorPartLibraryAsset[] | undefined,
  parentObjectId: string
): EditorPartLibraryAsset[] {
  return assets?.filter((a) => a.parentObjectId === parentObjectId) ?? [];
}

export function libraryAssetReusableInMotion(asset: EditorPartLibraryAsset): boolean {
  return Boolean(asset.cutoutUrl || asset.maskUrl);
}
