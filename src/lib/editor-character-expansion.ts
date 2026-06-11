import { actionsForInstructionCategory } from "@/lib/editor-instruction-actions";
import { isGlobeManMascotImage } from "@/lib/editor-instruction-object-feed";
import type {
  EditorInstructionObjectCategory,
  EditorInstructionObjectV2,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type PartSpec = {
  label: string;
  category: EditorInstructionObjectCategory;
  confidence: number;
  partId: string;
};

function buildPartObject(spec: PartSpec, index: number): EditorInstructionObjectV2 {
  return {
    id: `obj_${spec.partId}`,
    label: spec.label,
    category: spec.category,
    confidence: spec.confidence,
    description:
      spec.confidence >= 0.55
        ? "Detected object"
        : "Estimated object — heuristic placement",
    suggestedActions: actionsForInstructionCategory(spec.category),
    source: "heuristic",
    layerId: spec.category === "background" ? "background" : undefined,
  };
}

export const GLOBE_MAN_CANONICAL_PARTS: PartSpec[] = [
  { partId: "character", label: "Character", category: "character", confidence: 0.58 },
  { partId: "face", label: "Face", category: "character", confidence: 0.54 },
  { partId: "eyes", label: "Eyes", category: "character", confidence: 0.5 },
  { partId: "mouth", label: "Mouth", category: "character", confidence: 0.5 },
  { partId: "jacket", label: "Jacket", category: "clothing", confidence: 0.55 },
  { partId: "shirt", label: "Shirt", category: "clothing", confidence: 0.52 },
  { partId: "tie", label: "Tie", category: "clothing", confidence: 0.52 },
  { partId: "pants", label: "Pants", category: "clothing", confidence: 0.52 },
  { partId: "shoes", label: "Shoes", category: "clothing", confidence: 0.52 },
  { partId: "hands", label: "Hands", category: "character", confidence: 0.5 },
  { partId: "globe", label: "Globe", category: "tool", confidence: 0.55 },
  { partId: "background", label: "Background", category: "background", confidence: 1 },
];

const GENERIC_CHARACTER_PARTS: PartSpec[] = [
  { partId: "character", label: "Character", category: "character", confidence: 0.56 },
  { partId: "face", label: "Face", category: "character", confidence: 0.52 },
  { partId: "jacket", label: "Jacket", category: "clothing", confidence: 0.5 },
  { partId: "shirt", label: "Shirt", category: "clothing", confidence: 0.48 },
  { partId: "tie", label: "Tie", category: "clothing", confidence: 0.48 },
  { partId: "pants", label: "Pants", category: "clothing", confidence: 0.48 },
  { partId: "shoes", label: "Shoes", category: "clothing", confidence: 0.48 },
  { partId: "hands", label: "Hands", category: "character", confidence: 0.48 },
];

export function isCharacterAssetDocument(document: EditorCanvasDocument): boolean {
  if (isGlobeManMascotImage(document)) {
    return true;
  }
  const text = [
    document.name,
    document.assetProfile?.assetType,
    document.assetProfile?.humanSummaryKey,
    document.sourceKind,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /mascot|character|person|avatar|cartoon|illustration|chef|figure/.test(text);
}

export function buildGlobeManExpandedObjects(): EditorInstructionObjectV2[] {
  return GLOBE_MAN_CANONICAL_PARTS.map((spec, index) => buildPartObject(spec, index));
}

export function expandCharacterObjectFeed(
  objects: EditorInstructionObjectV2[],
  document: EditorCanvasDocument
): EditorInstructionObjectV2[] {
  if (isGlobeManMascotImage(document)) {
    const expanded = buildGlobeManExpandedObjects();
    const logo = objects.find((o) => o.category === "logo");
    if (logo) {
      return [
        ...expanded.filter((o) => o.category !== "background"),
        logo,
        ...expanded.filter((o) => o.category === "background"),
      ];
    }
    return expanded;
  }

  if (!isCharacterAssetDocument(document)) {
    return objects;
  }

  const hasFineParts = objects.some((o) =>
    /^(jacket|shirt|tie|pants|shoes|eyes|mouth|hands)$/i.test(o.label)
  );
  if (hasFineParts) {
    return objects;
  }

  const hasCoarseClothing = objects.some((o) =>
    /lab coat|suit|clothing|apron|uniform|outfit/i.test(o.label)
  );
  if (!hasCoarseClothing && objects.filter((o) => o.category === "character").length === 0) {
    return objects;
  }

  const partObjects = GENERIC_CHARACTER_PARTS.map((spec, index) => buildPartObject(spec, index));
  const coarseClothingLabel =
    /^(suit|clothing|uniform|outfit|lab coat|white coat|white lab coat|jacket|shirt|tie|pants|shoes)$/i;
  const preserved = objects.filter(
    (o) =>
      o.category === "logo" ||
      o.category === "tool" ||
      o.category === "product" ||
      o.category === "packaging" ||
      o.category === "background" ||
      (o.category === "clothing" && !coarseClothingLabel.test(o.label.trim()))
  );
  const nonBg = [...partObjects.filter((o) => o.category !== "background"), ...preserved.filter((o) => o.category !== "background")];
  const bg = objects.find((o) => o.category === "background") ?? partObjects.find((o) => o.category === "background");
  return bg ? [...nonBg, bg] : nonBg;
}

/** @deprecated use buildGlobeManExpandedObjects */
export function buildGlobeManHeuristicObjects(): EditorInstructionObjectV2[] {
  return buildGlobeManExpandedObjects();
}
