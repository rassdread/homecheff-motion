import { upsertPartLibraryAsset } from "@/lib/editor-part-library";
import type { EditorInstructionObjectV2 } from "@/types/editor-instruction-studio";
import type {
  EditorCanvasDocument,
  EditorCanvasBounds,
  EditorPartLibraryAsset,
} from "@/types/homecheff-visual-editor";

export type PartExtractionQuality = "mask" | "estimated_crop" | "manual";

export type PartExtractionAssetType =
  | "character_part"
  | "prop"
  | "logo"
  | "background"
  | "style_reference";

export type ExtractPartInput = {
  object: EditorInstructionObjectV2;
  targetPartId?: string;
  targetLayerId?: string;
  quality?: PartExtractionQuality;
};

function defaultBounds(): EditorCanvasBounds {
  return { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
}

function assetTypeForObject(object: EditorInstructionObjectV2): PartExtractionAssetType {
  if (object.category === "logo") {
    return "logo";
  }
  if (object.category === "background") {
    return "background";
  }
  if (object.category === "character") {
    return "character_part";
  }
  if (/\bglobe\b|prop|product/i.test(object.label)) {
    return "prop";
  }
  return "prop";
}

function partCategoryFromObject(object: EditorInstructionObjectV2): EditorPartLibraryAsset["partCategory"] {
  const label = object.label.toLowerCase();
  if (object.category === "logo" || /logo/.test(label)) {
    return "logo";
  }
  if (object.category === "background" || /background|shadow/.test(label)) {
    return "shadow";
  }
  if (/globe|earth|world|prop|ball/.test(label)) {
    return "globe";
  }
  if (/tie|jacket|shirt|shoe|hand|head|eye|mouth|face/.test(label)) {
    return label.includes("shoe")
      ? "shoes"
      : label.includes("tie")
        ? "tie"
        : label.includes("hand")
          ? "hands"
          : label.includes("head")
            ? "head"
            : label.includes("eye")
              ? "eyes"
              : label.includes("mouth")
                ? "mouth"
                : "face";
  }
  return "prop";
}

export function buildPartLibraryAssetFromInstructionObject(
  document: EditorCanvasDocument,
  input: ExtractPartInput
): EditorPartLibraryAsset {
  const { object, targetPartId, targetLayerId, quality = "estimated_crop" } = input;
  const bounds = object.bounds ?? defaultBounds();
  const detected = document.detectedObjects?.find((o) => o.layerId === object.layerId);
  const hasMask = Boolean(detected?.maskStorageKey || detected?.mask);
  const extractionQuality: PartExtractionQuality = hasMask ? "mask" : quality;
  const assetId = `lib_${slugify(object.label)}_${targetPartId ?? object.layerId ?? object.id}`;

  return {
    id: assetId,
    label: object.label,
    partCategory: partCategoryFromObject(object),
    parentObjectLabel: document.name,
    parentObjectId: document.sessionId,
    parentLayerId: targetLayerId ?? object.layerId ?? "background",
    assetType: extractionQuality === "mask" ? "cutout" : "part",
    boundingBox: bounds,
    createdAt: new Date().toISOString(),
    extractionMeta: {
      sourceSessionId: document.sessionId,
      sourceImageUrl: document.backgroundUrl,
      sourcePartId: targetPartId,
      sourcePartLabel: object.label,
      assetType: assetTypeForObject(object),
      extractionQuality,
    },
  };
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
}

export function extractPartToLibrary(
  document: EditorCanvasDocument,
  input: ExtractPartInput
): EditorCanvasDocument {
  const asset = buildPartLibraryAssetFromInstructionObject(document, input);
  return {
    ...document,
    partLibraryAssets: upsertPartLibraryAsset(document.partLibraryAssets, asset),
    updatedAt: new Date().toISOString(),
  };
}
