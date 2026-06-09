import { classifyEditorSemanticFeature, isIdentityShapeMarkerLabel } from "@/lib/editor-semantic-layer-taxonomy";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetIdentityFingerprint } from "@/types/studio-asset-identity-preservation";
import type { AssetSemanticRecord } from "@/types/studio-asset-semantic-record";
import type { AssetVisionAnalysis, AssetVisionObjectType } from "@/types/studio-asset-vision-analysis";
import type {
  EditorCanvasBounds,
  EditorSemanticLayer,
  EditorSemanticLayerSource,
  EditorSourceKind,
} from "@/types/homecheff-visual-editor";

const ESTIMATED_CONFIDENCE_FACTOR = 0.62;
const LOW_CONFIDENCE_THRESHOLD = 0.55;

export type BuildEditorSemanticLayersInput = {
  vision: AssetVisionAnalysis;
  styleDna?: AssetStyleDna | null;
  semanticRecord?: Partial<AssetSemanticRecord> | null;
  identityFingerprint?: AssetIdentityFingerprint;
  imageDimensions?: { width: number; height: number };
  sourceKind: EditorSourceKind;
};

function isHomeCheffBrand(vision: AssetVisionAnalysis): boolean {
  const brand = `${vision.brandIdentity} ${vision.assetFamily}`.toLowerCase();
  return brand.includes("homecheff") || brand.includes("home cheff");
}

function shouldIncludeLabel(label: string, vision: AssetVisionAnalysis): boolean {
  const lower = label.toLowerCase();
  const homeCheffOnly = ["globe", "chef hat", "garden", "designer", "homecheff"].some((t) =>
    lower.includes(t)
  );
  if (homeCheffOnly && !isHomeCheffBrand(vision)) {
    return false;
  }
  return label.trim().length > 0;
}

function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

function slugId(label: string, index: number): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "layer";
  return `semantic_${index}_${slug}`;
}

const BOUNDS_BY_TYPE: Record<string, EditorCanvasBounds> = {
  background: { x: 0, y: 0, width: 1, height: 1 },
  character: { x: 0.22, y: 0.12, width: 0.56, height: 0.78 },
  head: { x: 0.32, y: 0.06, width: 0.36, height: 0.28 },
  face: { x: 0.36, y: 0.1, width: 0.28, height: 0.2 },
  eyes: { x: 0.38, y: 0.14, width: 0.24, height: 0.08 },
  mouth: { x: 0.4, y: 0.22, width: 0.2, height: 0.06 },
  hair: { x: 0.3, y: 0.04, width: 0.4, height: 0.14 },
  body: { x: 0.28, y: 0.28, width: 0.44, height: 0.42 },
  arms: { x: 0.12, y: 0.3, width: 0.76, height: 0.22 },
  hands: { x: 0.08, y: 0.42, width: 0.84, height: 0.12 },
  legs: { x: 0.3, y: 0.58, width: 0.4, height: 0.32 },
  feet: { x: 0.28, y: 0.82, width: 0.44, height: 0.12 },
  clothing: { x: 0.26, y: 0.3, width: 0.48, height: 0.48 },
  headwear: { x: 0.3, y: 0.02, width: 0.4, height: 0.16 },
  accessory: { x: 0.62, y: 0.28, width: 0.22, height: 0.18 },
  identity_shape_marker: { x: 0.32, y: 0.04, width: 0.36, height: 0.22 },
  product_body: { x: 0.25, y: 0.18, width: 0.5, height: 0.64 },
  label: { x: 0.32, y: 0.38, width: 0.36, height: 0.2 },
  logo: { x: 0.34, y: 0.2, width: 0.32, height: 0.18 },
  cap: { x: 0.34, y: 0.1, width: 0.32, height: 0.16 },
  packaging: { x: 0.18, y: 0.12, width: 0.64, height: 0.76 },
  shadow: { x: 0.2, y: 0.72, width: 0.6, height: 0.14 },
  foreground: { x: 0.1, y: 0.55, width: 0.8, height: 0.35 },
  subject: { x: 0.2, y: 0.15, width: 0.6, height: 0.7 },
  table: { x: 0.08, y: 0.58, width: 0.84, height: 0.28 },
  wall: { x: 0, y: 0, width: 1, height: 0.55 },
  poster: { x: 0.28, y: 0.12, width: 0.44, height: 0.36 },
  box: { x: 0.22, y: 0.28, width: 0.56, height: 0.52 },
  mark: { x: 0.3, y: 0.25, width: 0.4, height: 0.35 },
  text: { x: 0.2, y: 0.62, width: 0.6, height: 0.14 },
  brand_color_area: { x: 0.15, y: 0.15, width: 0.7, height: 0.7 },
  held_object: { x: 0.58, y: 0.42, width: 0.24, height: 0.24 },
  object: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
};

function estimateBounds(type: string, index: number): { bounds: EditorCanvasBounds; estimated: boolean } {
  const base = BOUNDS_BY_TYPE[type] ?? BOUNDS_BY_TYPE.object!;
  const offset = (index % 3) * 0.02;
  return {
    bounds: {
      x: Math.min(0.92, base.x + offset),
      y: Math.min(0.92, base.y + offset * 0.5),
      width: base.width,
      height: base.height,
    },
    estimated: !BOUNDS_BY_TYPE[type],
  };
}

function transformFromBounds(bounds: EditorCanvasBounds) {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
    scale: 1,
    rotation: 0,
  };
}

type LayerSeed = {
  label: string;
  source: EditorSemanticLayerSource;
  forceType?: string;
  forceLocked?: boolean;
  forceIdentityMarker?: boolean;
};

function collectFeatureSeeds(input: BuildEditorSemanticLayersInput): LayerSeed[] {
  const { vision, styleDna, semanticRecord, identityFingerprint } = input;
  const fingerprint = identityFingerprint ?? vision.identityFingerprint;
  const seeds: LayerSeed[] = [];
  const seen = new Set<string>();

  const push = (seed: LayerSeed) => {
    const key = seed.label.toLowerCase();
    if (seen.has(key) || !shouldIncludeLabel(seed.label, vision)) {
      return;
    }
    seen.add(key);
    seeds.push(seed);
  };

  for (const marker of fingerprint.identityShapeMarkers ?? []) {
    push({
      label: normalizeLabel(marker),
      source: "fingerprint",
      forceType: "identity_shape_marker",
      forceLocked: true,
      forceIdentityMarker: true,
    });
  }

  for (const feature of vision.keyFeatures) {
    push({ label: normalizeLabel(feature), source: "vision" });
  }

  for (const feature of vision.suggestedPreserve) {
    push({ label: normalizeLabel(feature), source: "semantic_record" });
  }

  if (styleDna?.outfitHints?.trim()) {
    for (const part of styleDna.outfitHints.split(/[,;]+/)) {
      const label = normalizeLabel(part);
      if (label) {
        push({ label, source: "vision" });
      }
    }
  }

  if (styleDna?.mascotTraits?.trim()) {
    for (const part of styleDna.mascotTraits.split(/[,;]+/)) {
      const label = normalizeLabel(part);
      if (label) {
        push({ label, source: "vision" });
      }
    }
  }

  for (const color of vision.colors.slice(0, 3)) {
    if (vision.objectType === "logo" || vision.objectType === "brand_asset") {
      push({
        label: `${color.label} brand color`.trim(),
        source: "vision",
        forceType: "brand_color_area",
      });
    }
  }

  if (vision.environmentHints?.trim()) {
    for (const part of vision.environmentHints.split(/[,;]+/)) {
      const label = normalizeLabel(part);
      if (label) {
        push({ label, source: "vision" });
      }
    }
  }

  if (fingerprint.accessoryPattern?.trim()) {
    for (const part of fingerprint.accessoryPattern.split(/[,;]+/)) {
      const label = normalizeLabel(part);
      if (label) {
        push({ label, source: "fingerprint" });
      }
    }
  }

  for (const placement of semanticRecord?.referencePlacements ?? []) {
    push({
      label: placement.sourceName?.trim() || placement.placementType || "Placement asset",
      source: "composition_graph",
      forceType: "logo",
    });
  }

  for (const accessory of semanticRecord?.dynamicAccessories ?? []) {
    push({
      label: normalizeLabel(accessory.label),
      source: "semantic_record",
      forceLocked: accessory.action === "identity_marker",
      forceIdentityMarker: accessory.action === "identity_marker",
    });
  }

  if (seeds.length === 0) {
    push({ label: vision.objectTypeLabel || "Subject", source: "vision", forceType: "subject" });
  }

  return seeds.slice(0, 24);
}

function needsCharacterRoot(objectType: AssetVisionObjectType): boolean {
  return ["character", "mascot", "human", "animal"].includes(objectType);
}

export function buildEditorSemanticLayersFromVision(
  input: BuildEditorSemanticLayersInput
): EditorSemanticLayer[] {
  const { vision } = input;
  const baseConfidence = vision.confidence;
  const seeds = collectFeatureSeeds(input);
  const layers: EditorSemanticLayer[] = [];
  const typeToId = new Map<string, string>();

  if (needsCharacterRoot(vision.objectType)) {
    const bounds = BOUNDS_BY_TYPE.character!;
    const root: EditorSemanticLayer = {
      id: "semantic_root_character",
      label: vision.objectType === "mascot" ? "Mascot" : "Character",
      type: "character",
      category: "character",
      bounds,
      confidence: baseConfidence,
      visible: true,
      locked: false,
      editable: true,
      source: "vision",
      children: [],
      metadata: { taxonomyKey: "character" },
    };
    layers.push(root);
    typeToId.set("character", root.id);
  }

  if (vision.objectType === "product" || vision.objectType === "packaging" || vision.objectType === "food_item") {
    const hasProductBody = seeds.some((s) => classifyEditorSemanticFeature(s.label, vision.objectType).type === "product_body");
    if (!hasProductBody) {
      const bounds = BOUNDS_BY_TYPE.product_body!;
      const productRoot: EditorSemanticLayer = {
        id: "semantic_root_product",
        label: "Product",
        type: "product_body",
        category: "product",
        bounds,
        confidence: baseConfidence,
        visible: true,
        locked: false,
        editable: true,
        source: "vision",
        children: [],
        metadata: { taxonomyKey: "product_body" },
      };
      layers.push(productRoot);
      typeToId.set("product_body", productRoot.id);
    }
  }

  seeds.forEach((seed, index) => {
    const classified = classifyEditorSemanticFeature(seed.label, vision.objectType);
    const type = seed.forceType ?? classified.type;
    const category = classified.category;
    const { bounds, estimated } = estimateBounds(type, index);
    const confidence = estimated ? baseConfidence * ESTIMATED_CONFIDENCE_FACTOR : baseConfidence;
    const identityRelevance = seed.forceIdentityMarker
      ? "identity_marker"
      : isIdentityShapeMarkerLabel(seed.label)
        ? "identity_marker"
        : classified.identityRelevance;
    const locked = seed.forceLocked ?? classified.defaultLocked ?? identityRelevance === "identity_marker";

    let parentId: string | undefined;
    if (classified.parentType) {
      parentId = typeToId.get(classified.parentType);
    }
    if (!parentId && typeToId.has("character")) {
      parentId = typeToId.get("character");
    }
    if (!parentId && typeToId.has("product_body") && type !== "product_body") {
      parentId = typeToId.get("product_body");
    }

    const id = slugId(seed.label, index);
    const layer: EditorSemanticLayer = {
      id,
      label: seed.label,
      type,
      category,
      bounds,
      confidence,
      visible: true,
      locked,
      editable: !locked,
      source: seed.source,
      parentId,
      children: [],
      metadata: {
        taxonomyKey: type,
        rawFeature: seed.label,
        identityRelevance,
        estimatedBounds: estimated || confidence < LOW_CONFIDENCE_THRESHOLD,
      },
    };

    layers.push(layer);
    if (!typeToId.has(type)) {
      typeToId.set(type, id);
    }
    if (parentId) {
      const parent = layers.find((l) => l.id === parentId);
      if (parent) {
        parent.children.push(id);
      }
    }
  });

  const hasBackground = layers.some((l) => l.type === "background");
  if (!hasBackground) {
    layers.unshift({
      id: "semantic_background",
      label: "Background",
      type: "background",
      category: "background",
      bounds: BOUNDS_BY_TYPE.background!,
      confidence: 1,
      visible: true,
      locked: true,
      editable: false,
      source: "vision",
      children: [],
      metadata: { identityRelevance: "none" },
    });
  }

  return layers;
}

export function semanticLayerToCanvasLayer(
  layer: EditorSemanticLayer,
  sourceKind: EditorSourceKind,
  previewUrl = ""
): import("@/types/homecheff-visual-editor").EditorCanvasLayer {
  return {
    id: layer.id === "semantic_background" ? "background" : layer.id,
    label: layer.label,
    sourceKind,
    assetId: null,
    storageKey: "",
    previewUrl,
    transform: transformFromBounds(layer.bounds),
    locked: layer.locked,
    visible: layer.visible,
    parentObjectId: layer.parentId,
    bounds: layer.bounds,
    layerType: layer.type === "background" ? "background" : "semantic",
    confidence: layer.confidence,
    semanticType: layer.type,
    category: layer.category,
    layerSource: layer.source,
    editable: layer.editable,
    children: layer.children,
    metadata: layer.metadata,
  };
}

export function canvasLayerToSemanticLayer(
  layer: import("@/types/homecheff-visual-editor").EditorCanvasLayer
): EditorSemanticLayer | null {
  if (layer.layerType === "background" && layer.id === "background") {
    return {
      id: "semantic_background",
      label: layer.label,
      type: "background",
      category: "background",
      bounds: layer.bounds,
      confidence: layer.confidence ?? 1,
      visible: layer.visible,
      locked: layer.locked,
      editable: false,
      source: layer.layerSource ?? "vision",
      children: layer.children ?? [],
      metadata: layer.metadata,
    };
  }
  if (layer.layerType !== "semantic") {
    return null;
  }
  return {
    id: layer.id,
    label: layer.label,
    type: layer.semanticType ?? "object",
    category: layer.category ?? "unknown",
    bounds: layer.bounds,
    confidence: layer.confidence ?? 0.5,
    visible: layer.visible,
    locked: layer.locked,
    editable: layer.editable ?? !layer.locked,
    source: layer.layerSource ?? "vision",
    parentId: layer.parentObjectId,
    children: layer.children ?? [],
    metadata: layer.metadata,
  };
}
