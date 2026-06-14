import { actionsForInstructionCategory } from "@/lib/editor-instruction-actions";
import type {
  EditorInstructionObjectCategory,
  EditorInstructionObjectV2,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type MascotExpansionKind = "globe_man" | "chef" | "garden" | "designer";

type PartSpec = {
  label: string;
  category: EditorInstructionObjectCategory;
  confidence: number;
  partId: string;
};

function buildPartObject(spec: PartSpec): EditorInstructionObjectV2 {
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

function buildFromParts(parts: PartSpec[]): EditorInstructionObjectV2[] {
  return parts.map((spec) => buildPartObject(spec));
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

export const CHEF_MASCOT_CANONICAL_PARTS: PartSpec[] = [
  { partId: "character", label: "Chef Character", category: "character", confidence: 0.58 },
  { partId: "face", label: "Face", category: "character", confidence: 0.54 },
  { partId: "eyes", label: "Eyes", category: "character", confidence: 0.5 },
  { partId: "mouth", label: "Mouth", category: "character", confidence: 0.5 },
  { partId: "hat", label: "Hat", category: "clothing", confidence: 0.54 },
  { partId: "apron", label: "Apron", category: "clothing", confidence: 0.55 },
  { partId: "shirt", label: "Shirt", category: "clothing", confidence: 0.52 },
  { partId: "pants", label: "Pants", category: "clothing", confidence: 0.52 },
  { partId: "shoes", label: "Shoes", category: "clothing", confidence: 0.52 },
  { partId: "hands", label: "Hands", category: "character", confidence: 0.5 },
  { partId: "tools", label: "Tools", category: "tool", confidence: 0.52 },
  { partId: "background", label: "Background", category: "background", confidence: 1 },
];

export const GARDEN_MASCOT_CANONICAL_PARTS: PartSpec[] = [
  { partId: "character", label: "Garden Character", category: "character", confidence: 0.58 },
  { partId: "face", label: "Face", category: "character", confidence: 0.54 },
  { partId: "eyes", label: "Eyes", category: "character", confidence: 0.5 },
  { partId: "mouth", label: "Mouth", category: "character", confidence: 0.5 },
  { partId: "hat", label: "Hat", category: "clothing", confidence: 0.54 },
  { partId: "shirt", label: "Shirt", category: "clothing", confidence: 0.52 },
  { partId: "pants", label: "Pants", category: "clothing", confidence: 0.52 },
  { partId: "shoes", label: "Shoes", category: "clothing", confidence: 0.52 },
  { partId: "hands", label: "Hands", category: "character", confidence: 0.5 },
  { partId: "basket", label: "Basket", category: "tool", confidence: 0.52 },
  { partId: "plants", label: "Plants", category: "environment", confidence: 0.5 },
  { partId: "background", label: "Background", category: "background", confidence: 1 },
];

export const DESIGNER_MASCOT_CANONICAL_PARTS: PartSpec[] = [
  { partId: "character", label: "Designer Character", category: "character", confidence: 0.58 },
  { partId: "face", label: "Face", category: "character", confidence: 0.54 },
  { partId: "eyes", label: "Eyes", category: "character", confidence: 0.5 },
  { partId: "mouth", label: "Mouth", category: "character", confidence: 0.5 },
  { partId: "shirt", label: "Shirt", category: "clothing", confidence: 0.52 },
  { partId: "pants", label: "Pants", category: "clothing", confidence: 0.52 },
  { partId: "shoes", label: "Shoes", category: "clothing", confidence: 0.52 },
  { partId: "hands", label: "Hands", category: "character", confidence: 0.5 },
  { partId: "tools", label: "Tools", category: "tool", confidence: 0.52 },
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
  { partId: "background", label: "Background", category: "background", confidence: 1 },
];

const MASCOT_PARTS: Record<MascotExpansionKind, PartSpec[]> = {
  globe_man: GLOBE_MAN_CANONICAL_PARTS,
  chef: CHEF_MASCOT_CANONICAL_PARTS,
  garden: GARDEN_MASCOT_CANONICAL_PARTS,
  designer: DESIGNER_MASCOT_CANONICAL_PARTS,
};

export function documentMascotSignals(document: EditorCanvasDocument): string {
  return [
    document.name,
    document.assetProfile?.assetType,
    document.assetProfile?.humanSummaryKey,
    document.assetProfile?.variantGroup?.baseLabel,
    document.assetProfile?.variantGroup?.groupId,
    document.sourceKind,
    document.visionAnalysis?.objectType,
    document.visionAnalysis?.objectTypeLabel,
    document.visionAnalysis?.visualStyle,
    ...(document.visionAnalysis?.keyFeatures ?? []),
    ...(document.semanticLayers?.map((l) => l.label) ?? []),
    ...(document.detectedObjects?.map((o) => o.label) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function resolveMascotExpansionKind(
  document: EditorCanvasDocument
): MascotExpansionKind | null {
  const text = documentMascotSignals(document);

  if (
    /globe\s*man|globe-man|globeman|mascot.*globe|globe.*mascot/.test(text) ||
    (document.assetProfile?.variantGroup?.groupId === "globe_man" &&
      /globe|globeman|globe\s*man/.test(text))
  ) {
    return "globe_man";
  }

  if (
    /\bchef\b|chef[-_.]|chef.host|chef_host|chef mascot|homecheff chef|chef character/.test(text) ||
    (document.assetProfile?.assetType === "mascot" && /chef/.test(text))
  ) {
    return "chef";
  }

  if (
    /\bgarden\b|garden[-_.]|homegarden|garden_guide|garden mascot|garden character/.test(text) ||
    (document.assetProfile?.assetType === "mascot" && /garden/.test(text))
  ) {
    return "garden";
  }

  if (
    /\bdesigner\b|designer[-_.]|homedesigner|design_creator|design mascot|designer character/.test(text) ||
    (document.assetProfile?.assetType === "mascot" && /designer|design[-_.]mascot/.test(text))
  ) {
    return "designer";
  }

  if (
    document.assetProfile?.assetType === "mascot" ||
    /mascot|avatar|cartoon character|illustration character/.test(text)
  ) {
    if (/\bchef\b/.test(text)) {
      return "chef";
    }
    if (/\bgarden\b/.test(text)) {
      return "garden";
    }
    if (/\bdesign/.test(text)) {
      return "designer";
    }
  }

  return null;
}

/** @deprecated use resolveMascotExpansionKind(document) === "globe_man" */
export function isGlobeManMascotImage(document: EditorCanvasDocument): boolean {
  return resolveMascotExpansionKind(document) === "globe_man";
}

export function buildMascotExpandedObjects(kind: MascotExpansionKind): EditorInstructionObjectV2[] {
  return buildFromParts(MASCOT_PARTS[kind]);
}

export function buildGlobeManExpandedObjects(): EditorInstructionObjectV2[] {
  return buildMascotExpandedObjects("globe_man");
}

export function isCharacterAssetDocument(document: EditorCanvasDocument): boolean {
  if (resolveMascotExpansionKind(document)) {
    return true;
  }
  const text = documentMascotSignals(document);
  return /mascot|character|person|avatar|cartoon|illustration|chef|garden|designer|figure/.test(
    text
  );
}

export function expandCharacterObjectFeed(
  objects: EditorInstructionObjectV2[],
  document: EditorCanvasDocument
): EditorInstructionObjectV2[] {
  const mascotKind = resolveMascotExpansionKind(document);
  if (mascotKind) {
    const expanded = buildMascotExpandedObjects(mascotKind);
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

  const foreground = objects.filter((o) => o.category !== "background");
  if (foreground.length === 0) {
    const parts = buildFromParts(GENERIC_CHARACTER_PARTS);
    const bg = objects.find((o) => o.category === "background") ?? parts.find((o) => o.category === "background");
    const nonBg = parts.filter((o) => o.category !== "background");
    return bg ? [...nonBg, bg] : nonBg;
  }

  const hasFineParts = objects.some((o) =>
    /^(jacket|shirt|tie|pants|shoes|eyes|mouth|hands|hat|apron|basket|plants|tools)$/i.test(o.label)
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

  const partObjects = buildFromParts(GENERIC_CHARACTER_PARTS);
  const coarseClothingLabel =
    /^(suit|clothing|uniform|outfit|lab coat|white coat|white lab coat|jacket|shirt|tie|pants|shoes|hat|apron)$/i;
  const preserved = objects.filter(
    (o) =>
      o.category === "logo" ||
      o.category === "tool" ||
      o.category === "product" ||
      o.category === "packaging" ||
      o.category === "background" ||
      o.category === "environment" ||
      (o.category === "clothing" && !coarseClothingLabel.test(o.label.trim()))
  );
  const nonBg = [
    ...partObjects.filter((o) => o.category !== "background"),
    ...preserved.filter((o) => o.category !== "background"),
  ];
  const bg =
    objects.find((o) => o.category === "background") ??
    partObjects.find((o) => o.category === "background");
  return bg ? [...nonBg, bg] : nonBg;
}

/** @deprecated use buildGlobeManExpandedObjects */
export function buildGlobeManHeuristicObjects(): EditorInstructionObjectV2[] {
  return buildGlobeManExpandedObjects();
}
