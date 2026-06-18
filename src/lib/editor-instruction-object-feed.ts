import {
  buildMascotExpandedObjects,
  expandCharacterObjectFeed,
  isCharacterAssetDocument,
  resolveMascotExpansionKind,
} from "@/lib/editor-character-expansion";
import { buildAnimalTaxonomyFallbackParts, resolveAnimalTaxonomyKind } from "@/lib/editor-animal-parts-taxonomy";
import { buildHumanTaxonomyFallbackParts, resolveHumanTaxonomyKind } from "@/lib/editor-human-parts-taxonomy";
import { actionsForInstructionCategory } from "@/lib/editor-instruction-actions";
import { resolveHumanFirstObjectType } from "@/lib/editor-ux-cleanup";
import { attachBoundsToObjects } from "@/lib/editor-instruction-object-bounds";
import type {
  EditorInstructionObjectCategory,
  EditorInstructionObjectFeedMeta,
  EditorInstructionObjectSource,
  EditorInstructionObjectV2,
  EditorInstructionStyleTrait,
} from "@/types/editor-instruction-studio";
import type {
  EditorCanvasDocument,
  EditorCanvasLayer,
  EditorObject,
  EditorSemanticLayer,
} from "@/types/homecheff-visual-editor";
import type { EditorAssetProfile } from "@/types/editor-asset-profile";
import { editorAnalysisAppliesToBackground } from "@/lib/editor-analysis-reset";
import { documentHasRichVisionAnalysis } from "@/lib/editor-vision-v6-stability";

export type InstructionObjectFeedResult = {
  /** Editable objects for dropdown (alias: objects) */
  editableObjects: EditorInstructionObjectV2[];
  /** @deprecated use editableObjects */
  objects: EditorInstructionObjectV2[];
  styleTraits: EditorInstructionStyleTrait[];
  meta: EditorInstructionObjectFeedMeta;
};

const STYLE_TRAIT_PATTERN =
  /head\s*shape|body\s*shape|rounded\s*body|body\s*proportions|character\s*proportions|face\s*shape|outline\s*style|color\s*palette|brand\s*colors?|line\s*weight|facial\s*features|simple\s*facial|signature\s*mascot|mascot\s*head|identity\s*shape|shape\s*marker|silhouette|estimated\s*bounds|approximate\s*selection|taxonomy|proportion|marker/i;

const CATEGORY_SORT_ORDER: Record<EditorInstructionObjectCategory, number> = {
  character: 0,
  logo: 1,
  text: 2,
  tool: 3,
  clothing: 4,
  product: 5,
  packaging: 6,
  food: 7,
  vehicle: 8,
  building: 9,
  signage: 10,
  environment: 11,
  other: 12,
  background: 99,
};

function slugifyId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export function isStyleTrait(label: string): boolean {
  return STYLE_TRAIT_PATTERN.test(label.trim());
}

export function isAnalysisOnlyTrait(label: string): boolean {
  return isStyleTrait(label);
}

function isEditableObject(obj: EditorInstructionObjectV2): boolean {
  if (isStyleTrait(obj.label)) {
    return false;
  }
  if (obj.label === "Main subject") {
    return true;
  }
  return obj.category !== "other" || /face|apron|coat|globe man/i.test(obj.label);
}

function normalizeDedupeKey(label: string, category: EditorInstructionObjectCategory): string {
  const text = label.toLowerCase().trim().replace(/\s+/g, " ");
  if (category === "background" || /background|backdrop|scene/.test(text)) {
    return "background";
  }
  if (category === "logo" || /^logo\b|brand mark|brand element/.test(text)) {
    return "logo";
  }
  if (/\bglobe\b|\bearth\b|\bworld\b/.test(text) && !/globe man|globeman/.test(text)) {
    return "globe";
  }
  if (/^suit\b|^jacket\b|^clothing\b|^uniform\b|^outfit\b/.test(text)) {
    return "clothing_suit";
  }
  if (/\btie\b/.test(text)) {
    return "tie";
  }
  if (/shoe|shoes|footwear/.test(text)) {
    return "shoes";
  }
  if (/apron/.test(text)) {
    return "apron";
  }
  if (/globe man|globeman|mascot/.test(text)) {
    return "character_globe_man";
  }
  if (/\bface\b/.test(text)) {
    return "face";
  }
  if (/lab coat|white coat|labcoat/.test(text)) {
    return "lab_coat";
  }
  return `${category}:${text}`;
}

export function normalizeDisplayLabel(
  label: string,
  category: EditorInstructionObjectCategory
): string {
  const text = label.trim();
  const lower = text.toLowerCase();

  if (category === "background" || /background|backdrop|^scene$/.test(lower)) {
    return "Background";
  }
  if (category === "logo" || /^logo\b|brand mark/.test(lower)) {
    return "Logo";
  }
  if (/\bglobe\b|\bearth\b|\bworld\b/.test(lower) && !/globe man|globeman/.test(lower)) {
    return "Globe";
  }
  if (/globe man|globeman/.test(lower)) {
    return "Character / Globe Man";
  }
  if (category === "clothing") {
    if (/\btie\b/.test(lower)) {
      return "Tie";
    }
    if (/shoe|shoes|footwear/.test(lower)) {
      return "Shoes";
    }
    if (/lab coat|labcoat|white coat/.test(lower)) {
      return "Jacket";
    }
    if (/^jacket\b/.test(lower)) {
      return "Jacket";
    }
    if (/^shirt\b/.test(lower)) {
      return "Shirt";
    }
    if (/^pants\b|trousers/.test(lower)) {
      return "Pants";
    }
    if (/^(suit|clothing|uniform|outfit)\b/.test(lower)) {
      return "Jacket";
    }
  }
  if (/\beyes?\b/.test(lower)) {
    return "Eyes";
  }
  if (/\bmouth\b/.test(lower)) {
    return "Mouth";
  }
  if (/\bhands?\b/.test(lower)) {
    return "Hands";
  }
  if (/\bface\b/.test(lower)) {
    return "Face";
  }
  if (category === "character" && /mascot|character|chef|person|figure/.test(lower)) {
    if (/globe man|globeman/.test(lower)) {
      return "Character / Globe Man";
    }
    return text;
  }
  return text;
}

function inferCategoryFromText(
  label: string,
  hints: string[] = []
): EditorInstructionObjectCategory {
  const text = `${label} ${hints.join(" ")}`.toLowerCase();

  if (isAnalysisOnlyTrait(label)) {
    return "other";
  }
  if (/background|backdrop|scene bg|^scene$/.test(text)) {
    return "background";
  }
  if (/^logo\b|brand mark|brand element/.test(text)) {
    return "logo";
  }
  if (/\btext\b|caption|title|typography|tekst/.test(text)) {
    return "text";
  }
  if (/globe man|globeman|mascot|character|chef|person|figure/.test(text)) {
    return "character";
  }
  if (/\btie\b/.test(text)) {
    return "clothing";
  }
  if (/shoe|shoes|footwear/.test(text)) {
    return "clothing";
  }
  if (/lab coat|labcoat|white coat/.test(text)) {
    return "clothing";
  }
  if (/\bface\b/.test(text)) {
    return "character";
  }
  if (/apron|shirt|jacket|hat|clothing|uniform|outfit|suit|pants|trousers/.test(text)) {
    return "clothing";
  }
  if (/packaging|box|carton|wrapper/.test(text) && !/^label\b/.test(text)) {
    return "packaging";
  }
  if (/cup|mug|bottle|product/.test(text)) {
    return "product";
  }
  if (/food|dish|meal|plate|pan|pot/.test(text)) {
    return "food";
  }
  if (/\bglobe\b|\bearth\b|\bworld\b/.test(text) && !/globe man|globeman/.test(text)) {
    return "tool";
  }
  if (/tool|utensil|knife|spoon/.test(text)) {
    return "tool";
  }
  if (/truck|van|vehicle|car/.test(text)) {
    return "vehicle";
  }
  if (/building|storefront|shop|facade/.test(text)) {
    return "building";
  }
  if (/sign|banner|billboard|poster/.test(text)) {
    return "signage";
  }
  if (/sky|environment|landscape|garden|outdoor/.test(text)) {
    return "environment";
  }
  return "other";
}

function inferCategoryFromLayer(layer: EditorCanvasLayer, label: string): EditorInstructionObjectCategory {
  const humanType = resolveHumanFirstObjectType(layer);
  if (layer.layerType === "background" || humanType === "background") {
    return "background";
  }
  return inferCategoryFromText(label, [
    layer.category ?? "",
    layer.semanticType ?? "",
    humanType ?? "",
  ]);
}

function inferCategoryFromEditorObject(obj: EditorObject): EditorInstructionObjectCategory {
  if (obj.category === "background") {
    return "background";
  }
  return inferCategoryFromText(obj.label, [obj.category, obj.partCategory ?? ""]);
}

function inferCategoryFromSemanticLayer(layer: EditorSemanticLayer): EditorInstructionObjectCategory {
  if (layer.type === "background" || layer.category === "background") {
    return "background";
  }
  return inferCategoryFromText(layer.label, [layer.type, layer.category]);
}

function describeObject(label: string, category: EditorInstructionObjectCategory): string {
  const normalized = label.trim() || category;
  switch (category) {
    case "clothing":
      return `${normalized} clothing item`;
    case "packaging":
      return `${normalized} packaging`;
    case "character":
      return `${normalized} character or mascot`;
    case "logo":
      return `${normalized} logo or brand mark`;
    case "background":
      return "Scene background";
    case "tool":
      return `${normalized} object or prop`;
    default:
      return normalized;
  }
}

function buildInstructionObject(
  input: {
    label: string;
    category: EditorInstructionObjectCategory;
    confidence: number;
    source: EditorInstructionObjectSource;
    layerId?: string;
    index: number;
    traits?: string[];
  }
): EditorInstructionObjectV2 {
  const category = input.category;
  const label = normalizeDisplayLabel(input.label, category);
  const slug = slugifyId(label) || category;
  return {
    id: `obj_${slug}_${input.index}`,
    label,
    category,
    confidence: input.confidence,
    description: describeObject(label, category),
    suggestedActions: actionsForInstructionCategory(category),
    layerId: input.layerId,
    source: input.source,
    traits: input.traits?.length ? input.traits : undefined,
  };
}

function sortObjects(objects: EditorInstructionObjectV2[]): EditorInstructionObjectV2[] {
  return [...objects].sort(
    (a, b) => (CATEGORY_SORT_ORDER[a.category] ?? 50) - (CATEGORY_SORT_ORDER[b.category] ?? 50)
  );
}

/** V6 semantic layers — keep per-part granularity (no label collapse). */
export function dedupeV6SemanticObjects(objects: EditorInstructionObjectV2[]): EditorInstructionObjectV2[] {
  const byKey = new Map<string, EditorInstructionObjectV2>();
  for (const obj of objects) {
    const key = obj.layerId ?? obj.id;
    if (!byKey.has(key)) {
      byKey.set(key, obj);
    }
  }
  return sortObjects([...byKey.values()]);
}

/** Merge duplicates — one Background, one Logo, near-identical labels collapsed. */
export function dedupeAndMergeObjects(objects: EditorInstructionObjectV2[]): EditorInstructionObjectV2[] {
  const byKey = new Map<string, EditorInstructionObjectV2>();

  for (const obj of objects) {
    const key = normalizeDedupeKey(obj.label, obj.category);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, obj);
      continue;
    }
    const mergedTraits = [...new Set([...(existing.traits ?? []), ...(obj.traits ?? [])])];
    byKey.set(key, {
      ...existing,
      confidence: Math.max(existing.confidence, obj.confidence),
      layerId: existing.layerId ?? obj.layerId,
      traits: mergedTraits.length ? mergedTraits : undefined,
    });
  }

  return sortObjects([...byKey.values()]);
}

function ensureBackground(
  objects: EditorInstructionObjectV2[],
  source: EditorInstructionObjectSource
): EditorInstructionObjectV2[] {
  if (objects.some((o) => o.category === "background")) {
    return objects;
  }
  return [
    ...objects,
    buildInstructionObject({
      label: "Background",
      category: "background",
      confidence: 1,
      source,
      layerId: "background",
      index: objects.length,
    }),
  ];
}

export {
  buildGlobeManHeuristicObjects,
  buildGlobeManExpandedObjects,
  isGlobeManMascotImage,
  resolveMascotExpansionKind,
} from "@/lib/editor-character-expansion";

type RawSplit = {
  editable: EditorInstructionObjectV2[];
  traits: string[];
};

/** Filter analysis fragments; normalize labels and categories. */
export function cleanRawObjectFeed(raw: EditorInstructionObjectV2[]): RawSplit {
  const traits: string[] = [];
  const editable: EditorInstructionObjectV2[] = [];

  for (const obj of raw) {
    if (isStyleTrait(obj.label)) {
      traits.push(obj.label.trim());
      continue;
    }

    const category = inferCategoryFromText(obj.label, [obj.category]);
    if (category === "other" && isAnalysisOnlyTrait(obj.label)) {
      traits.push(obj.label.trim());
      continue;
    }

    editable.push(
      buildInstructionObject({
        label: obj.label,
        category,
        confidence: obj.confidence,
        source: obj.source ?? "objects",
        layerId: obj.layerId,
        index: editable.length,
        traits: obj.traits,
      })
    );
  }

  let cleaned = dedupeAndMergeObjects(editable);

  if (traits.length > 0) {
    const characterIdx = cleaned.findIndex((o) => o.category === "character");
    if (characterIdx >= 0) {
      const character = cleaned[characterIdx]!;
      cleaned = cleaned.map((o, i) =>
        i === characterIdx
          ? { ...o, traits: [...new Set([...(o.traits ?? []), ...traits])] }
          : o
      );
    } else if (cleaned.some((o) => o.category !== "background")) {
      cleaned = [
        buildInstructionObject({
          label: "Character",
          category: "character",
          confidence: 0.5,
          source: "fallback",
          index: 0,
          traits,
        }),
        ...cleaned,
      ];
    }
  }

  return { editable: cleaned, traits };
}

function findLogoInRaw(raw: EditorInstructionObjectV2[]): EditorInstructionObjectV2 | undefined {
  return raw.find((o) => !isAnalysisOnlyTrait(o.label) && inferCategoryFromText(o.label) === "logo");
}

function applyTaxonomyPartFeed(
  parts: Array<{ label: string; category: import("@/types/homecheff-visual-editor").EditorPartCategory }>,
  raw: EditorInstructionObjectV2[],
  sourcesUsed: EditorInstructionObjectSource[],
  document: EditorCanvasDocument
): InstructionObjectFeedResult {
  const { traits } = cleanRawObjectFeed(raw);
  let objects = parts.map((part, index) =>
    buildInstructionObject({
      label: part.label,
      category:
        part.category === "face" ||
        part.category === "eyes" ||
        part.category === "mouth" ||
        part.category === "head" ||
        part.category === "torso" ||
        part.category === "arms" ||
        part.category === "hands" ||
        part.category === "legs"
          ? "character"
          : part.category === "clothing" || part.category === "shirt" || part.category === "jacket" || part.category === "pants" || part.category === "shoes"
            ? "clothing"
            : "other",
      confidence: 0.55,
      source: "heuristic",
      index,
      traits: traits.length > 0 ? traits : undefined,
    })
  );

  objects = ensureBackground(objects, "heuristic");
  const mergedSources: EditorInstructionObjectSource[] = sourcesUsed.includes("heuristic")
    ? sourcesUsed
    : [...sourcesUsed, "heuristic"];
  return splitFeedResult(
    objects,
    {
      source: "heuristic",
      rawCount: raw.length,
      lowConfidence: true,
      sourcesUsed: mergedSources,
    },
    document
  );
}

function applyHumanTaxonomyFeed(
  raw: EditorInstructionObjectV2[],
  sourcesUsed: EditorInstructionObjectSource[],
  document: EditorCanvasDocument
): InstructionObjectFeedResult | null {
  const vision = document.visionAnalysis;
  if (!vision) {
    return null;
  }
  const kind = resolveHumanTaxonomyKind({
    vision,
    documentName: document.name,
    semanticLayerLabels: document.semanticLayers?.map((l) => l.label),
    sourceKind: document.sourceKind,
  });
  if (!kind) {
    return null;
  }
  const parts = buildHumanTaxonomyFallbackParts(kind);
  return applyTaxonomyPartFeed(parts, raw, sourcesUsed, document);
}

function applyAnimalTaxonomyFeed(
  raw: EditorInstructionObjectV2[],
  sourcesUsed: EditorInstructionObjectSource[],
  document: EditorCanvasDocument
): InstructionObjectFeedResult | null {
  const vision = document.visionAnalysis;
  if (!vision) {
    return null;
  }
  const kind = resolveAnimalTaxonomyKind({
    vision,
    documentName: document.name,
    semanticLayerLabels: document.semanticLayers?.map((l) => l.label),
    sourceKind: document.sourceKind,
  });
  if (!kind) {
    return null;
  }
  const parts = buildAnimalTaxonomyFallbackParts(kind);
  return applyTaxonomyPartFeed(parts, raw, sourcesUsed, document);
}

function applyMascotFeed(
  kind: import("@/lib/editor-character-expansion").MascotExpansionKind,
  raw: EditorInstructionObjectV2[],
  sourcesUsed: EditorInstructionObjectSource[],
  document: EditorCanvasDocument
): InstructionObjectFeedResult {
  const { traits } = cleanRawObjectFeed(raw);
  const logo = findLogoInRaw(raw);

  let objects = buildMascotExpandedObjects(kind);

  if (traits.length > 0) {
    objects = objects.map((o) =>
      o.category === "character" ? { ...o, traits: [...new Set([...(o.traits ?? []), ...traits])] } : o
    );
  }

  if (logo) {
    const hasLogo = objects.some((o) => o.category === "logo");
    if (!hasLogo) {
      objects = dedupeAndMergeObjects([
        ...objects.filter((o) => o.category !== "background"),
        buildInstructionObject({
          label: "Logo",
          category: "logo",
          confidence: logo.confidence,
          source: logo.source ?? "detectedObjects",
          layerId: logo.layerId,
          index: objects.length,
        }),
        ...objects.filter((o) => o.category === "background"),
      ]);
    }
  }

  objects = ensureBackground(objects, "heuristic");

  const mergedSources: EditorInstructionObjectSource[] = sourcesUsed.includes("heuristic")
    ? sourcesUsed
    : [...sourcesUsed, "heuristic"];

  return splitFeedResult(
    objects,
    {
      source: sourcesUsed.includes("heuristic") ? "heuristic" : "mixed",
      rawCount: raw.length,
      lowConfidence: true,
      sourcesUsed: mergedSources,
    },
    document
  );
}

function documentHasLikelyForegroundSubject(document: EditorCanvasDocument): boolean {
  if (document.name && !/^background|bg\.|wallpaper|blank/i.test(document.name)) {
    return true;
  }
  if (document.assetProfile && document.assetProfile.assetType !== "background") {
    return true;
  }
  if (document.sourceKind === "character" || document.sourceKind === "logo" || document.sourceKind === "product_photo") {
    return true;
  }
  if ((document.detectionMeta?.count ?? 0) > 0) {
    return true;
  }
  if (document.semanticLayers?.some((layer) => layer.type !== "background")) {
    return true;
  }
  if (document.detectedObjects?.some((obj) => obj.category !== "background")) {
    return true;
  }
  return false;
}

function mapCanvasLayers(document: EditorCanvasDocument): EditorInstructionObjectV2[] {
  return document.objects.map((layer, index) =>
    buildInstructionObject({
      label: layer.label?.trim() || `Object ${index + 1}`,
      category: inferCategoryFromLayer(layer, layer.label ?? ""),
      confidence: layer.confidence ?? 0.72,
      source: "objects",
      layerId: layer.id,
      index,
    })
  );
}

function mapDetectedObjects(document: EditorCanvasDocument): EditorInstructionObjectV2[] {
  return (document.detectedObjects ?? []).map((obj, index) =>
    buildInstructionObject({
      label: obj.label?.trim() || `Object ${index + 1}`,
      category: inferCategoryFromEditorObject(obj),
      confidence: obj.confidence ?? 0.7,
      source: "detectedObjects",
      layerId: obj.layerId,
      index,
    })
  );
}

function mapSemanticLayers(document: EditorCanvasDocument): EditorInstructionObjectV2[] {
  return (document.semanticLayers ?? []).map((layer, index) =>
    buildInstructionObject({
      label: layer.label?.trim() || `Object ${index + 1}`,
      category: inferCategoryFromSemanticLayer(layer),
      confidence: layer.confidence ?? 0.68,
      source: "semanticLayers",
      layerId: layer.id,
      index,
    })
  );
}

function collectRawCandidates(document: EditorCanvasDocument): {
  raw: EditorInstructionObjectV2[];
  sourcesUsed: EditorInstructionObjectSource[];
} {
  const sourcesUsed: EditorInstructionObjectSource[] = [];
  const raw: EditorInstructionObjectV2[] = [];

  const fromDetected = mapDetectedObjects(document);
  if (fromDetected.length > 0) {
    raw.push(...fromDetected);
    sourcesUsed.push("detectedObjects");
  }

  const fromLayers = mapCanvasLayers(document);
  if (fromLayers.length > 0) {
    raw.push(...fromLayers);
    sourcesUsed.push("objects");
  }

  const fromSemantic = mapSemanticLayers(document);
  if (fromSemantic.length > 0) {
    raw.push(...fromSemantic);
    sourcesUsed.push("semanticLayers");
  }

  return { raw, sourcesUsed };
}

function nonBackgroundCount(objects: EditorInstructionObjectV2[]): number {
  return objects.filter((o) => o.category !== "background").length;
}

function isCoarseBrandSheetObjectFeed(objects: EditorInstructionObjectV2[]): boolean {
  const labels = objects.map((o) => o.label.toLowerCase());
  const hasLogo = labels.some((l) => l === "logo");
  const hasBrandSheetRegion = labels.some((l) =>
    /globe man|kleurenkaart|tekst|icoon|banner|product|afbeelding|color card/.test(l)
  );
  return hasLogo && hasBrandSheetRegion;
}

function feedHasFineCharacterParts(objects: EditorInstructionObjectV2[]): boolean {
  return objects.some((o) =>
    /^(eyes|mouth|face|tie|shoes|head|jacket|shirt|hands|nose|eyebrows|ears|outfit)$/i.test(o.label.trim())
  );
}

function resolvePrimarySource(sourcesUsed: EditorInstructionObjectSource[]): EditorInstructionObjectSource | "mixed" {
  if (sourcesUsed.length === 0) {
    return "fallback";
  }
  if (sourcesUsed.length === 1) {
    return sourcesUsed[0]!;
  }
  return "mixed";
}

function splitFeedResult(
  objects: EditorInstructionObjectV2[],
  meta: Omit<EditorInstructionObjectFeedMeta, "count" | "traitCount">,
  document: EditorCanvasDocument
): InstructionObjectFeedResult {
  const styleTraits: EditorInstructionStyleTrait[] = [];
  const seenTraits = new Set<string>();

  for (const obj of objects) {
    for (const trait of obj.traits ?? []) {
      const key = trait.toLowerCase();
      if (!seenTraits.has(key)) {
        seenTraits.add(key);
        styleTraits.push({
          id: `trait_${slugifyId(trait)}`,
          label: trait,
          source: obj.source,
        });
      }
    }
  }

  const editableOnly = dedupeAndMergeObjects(objects.filter(isEditableObject));
  const editableObjects = attachBoundsToObjects(editableOnly, document);

  return {
    editableObjects,
    objects: editableObjects,
    styleTraits,
    meta: {
      ...meta,
      count: editableObjects.length,
      traitCount: styleTraits.length,
    },
  };
}

function finalizeFeed(
  objects: EditorInstructionObjectV2[],
  rawCount: number,
  sourcesUsed: EditorInstructionObjectSource[],
  lowConfidence: boolean,
  document: EditorCanvasDocument
): InstructionObjectFeedResult {
  const deduped = ensureBackground(dedupeAndMergeObjects(objects), sourcesUsed[sourcesUsed.length - 1] ?? "fallback");
  const cleaned = expandCharacterObjectFeed(deduped, document);
  return splitFeedResult(
    cleaned,
    {
      source: resolvePrimarySource(sourcesUsed),
      rawCount,
      lowConfidence,
      sourcesUsed: [...new Set(sourcesUsed)],
    },
    document
  );
}

function buildFromV6SemanticLayers(
  document: EditorCanvasDocument
): InstructionObjectFeedResult | null {
  const fromSemantic = mapSemanticLayers(document);
  if (fromSemantic.filter((o) => o.category !== "background").length === 0) {
    return null;
  }
  const editableOnly = dedupeV6SemanticObjects(fromSemantic.filter(isEditableObject));
  const editableObjects = attachBoundsToObjects(editableOnly, document);
  return {
    editableObjects,
    objects: editableObjects,
    styleTraits: [],
    meta: {
      source: "semanticLayers",
      count: editableObjects.length,
      traitCount: 0,
      rawCount: fromSemantic.length,
      lowConfidence: fromSemantic.some((o) => o.confidence < 0.6),
      sourcesUsed: ["semanticLayers"],
    },
  };
}

/**
 * Builds instruction-studio object intelligence from all available document signals.
 * Raw sources are merged, filtered, deduped, and grouped before display.
 */
export function buildInstructionObjectsFromDocument(
  document: EditorCanvasDocument
): InstructionObjectFeedResult {
  const explicit = document.instructionStudioState?.instructionObjects;
  if (explicit?.length && editorAnalysisAppliesToBackground(document)) {
    const { editable } = cleanRawObjectFeed(explicit);
    const objects = ensureBackground(editable, "instructionObjects");
    return splitFeedResult(
      objects,
      {
        source: "instructionObjects",
        rawCount: explicit.length,
        lowConfidence: false,
        sourcesUsed: ["instructionObjects"],
      },
      document
    );
  }

  if (documentHasRichVisionAnalysis(document) && editorAnalysisAppliesToBackground(document)) {
    const v6Feed = buildFromV6SemanticLayers(document);
    if (v6Feed && nonBackgroundCount(v6Feed.editableObjects) > 0) {
      const mascotKind = resolveMascotExpansionKind(document);
      if (
        mascotKind &&
        (!feedHasFineCharacterParts(v6Feed.editableObjects) ||
          isCoarseBrandSheetObjectFeed(v6Feed.editableObjects))
      ) {
        const { raw, sourcesUsed } = collectRawCandidates(document);
        return applyMascotFeed(mascotKind, raw.length > 0 ? raw : v6Feed.editableObjects, sourcesUsed, document);
      }
      return v6Feed;
    }
  }

  const { raw, sourcesUsed } = collectRawCandidates(document);
  const rawCount = raw.length;

  if (
    document.visionAnalysis &&
    !feedHasFineCharacterParts(raw) &&
    resolveHumanTaxonomyKind({
      vision: document.visionAnalysis,
      documentName: document.name,
      semanticLayerLabels: document.semanticLayers?.map((l) => l.label),
      sourceKind: document.sourceKind,
    })
  ) {
    const humanFeed = applyHumanTaxonomyFeed(raw, sourcesUsed, document);
    if (humanFeed) {
      return humanFeed;
    }
  }

  if (
    document.visionAnalysis &&
    !feedHasFineCharacterParts(raw) &&
    resolveAnimalTaxonomyKind({
      vision: document.visionAnalysis,
      documentName: document.name,
      semanticLayerLabels: document.semanticLayers?.map((l) => l.label),
      sourceKind: document.sourceKind,
    })
  ) {
    const animalFeed = applyAnimalTaxonomyFeed(raw, sourcesUsed, document);
    if (animalFeed) {
      return animalFeed;
    }
  }

  const mascotKind = resolveMascotExpansionKind(document);
  if (mascotKind) {
    return applyMascotFeed(mascotKind, raw, sourcesUsed, document);
  }

  if (rawCount === 0) {
    if (documentHasRichVisionAnalysis(document) && editorAnalysisAppliesToBackground(document)) {
      const v6Feed = buildFromV6SemanticLayers(document);
      if (v6Feed) {
        return v6Feed;
      }
    }
    if (documentHasLikelyForegroundSubject(document) && !isCharacterAssetDocument(document)) {
      const objects = ensureBackground(
        [
          buildInstructionObject({
            label: "Main subject",
            category: "other",
            confidence: 0.48,
            source: "fallback",
            index: 0,
          }),
        ],
        "fallback"
      );
      return splitFeedResult(
        objects,
        {
          source: "fallback",
          rawCount: 0,
          lowConfidence: true,
          sourcesUsed: ["fallback"],
        },
        document
      );
    }
    if (isCharacterAssetDocument(document)) {
      return finalizeFeed([], rawCount, sourcesUsed, true, document);
    }
    const objects = ensureBackground([], "fallback");
    return splitFeedResult(
      objects,
      {
        source: "fallback",
        rawCount: 0,
        lowConfidence: false,
        sourcesUsed: ["fallback"],
      },
      document
    );
  }

  const { editable } = cleanRawObjectFeed(raw);
  let objects = editable;
  let lowConfidence = objects.some((o) => o.confidence < 0.6);

  if (
    nonBackgroundCount(objects) === 0 &&
    documentHasLikelyForegroundSubject(document) &&
    !isCharacterAssetDocument(document)
  ) {
    if (documentHasRichVisionAnalysis(document) && editorAnalysisAppliesToBackground(document)) {
      const v6Feed = buildFromV6SemanticLayers(document);
      if (v6Feed) {
        return v6Feed;
      }
    }
    objects = ensureBackground(
      [
        buildInstructionObject({
          label: "Main subject",
          category: "other",
          confidence: 0.48,
          source: "fallback",
          index: 0,
        }),
      ],
      "fallback"
    );
    sourcesUsed.push("fallback");
    lowConfidence = true;
  } else if (nonBackgroundCount(objects) === 0 && isCharacterAssetDocument(document)) {
    return finalizeFeed([], rawCount, sourcesUsed, true, document);
  } else {
    objects = ensureBackground(objects, sourcesUsed[sourcesUsed.length - 1] ?? "fallback");
  }

  return finalizeFeed(objects, rawCount, sourcesUsed, lowConfidence, document);
}
