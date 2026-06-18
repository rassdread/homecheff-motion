/**
 * Editor Vision V6 — illustration part analysis (template + OpenAI merge).
 */

import { mergeIllustrationPartsWithVisionTaxonomy, resolveVisionTaxonomy } from "@/lib/editor-vision-taxonomy";
import { classifyEditorSemanticFeature } from "@/lib/editor-semantic-layer-taxonomy";
import { boundsToPolygon } from "@/lib/editor-object-mask";
import {
  attachPartsToEditorObject,
  buildDocumentObjectHierarchies,
} from "@/lib/editor-part-hierarchy";
import { buildEditorObjectsFromLayers } from "@/lib/editor-object-detection";
import { semanticLayerToCanvasLayer } from "@/lib/editor-semantic-layers-from-vision";
import { buildEditorVisionV6Hierarchy } from "@/lib/editor-vision-v6-hierarchy";
import type { ObjectDetection } from "@/server/animation-export/local-vision/object-detector-types";
import type { IllustrationPartAnalysisResult, IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type { AssetVisionAnalysis, AssetVisionObjectType } from "@/types/studio-asset-vision-analysis";
import type {
  EditorCanvasBounds,
  EditorCanvasDocument,
  EditorCanvasLayer,
  EditorObjectHierarchy,
  EditorPartCategory,
  EditorSemanticLayer,
  EditorVisionPartSource,
  EditorVisionV6LayerSource,
  EditorVisionV6Meta,
} from "@/types/homecheff-visual-editor";

const ILLUSTRATION_OBJECT_TYPES = new Set<AssetVisionObjectType>([
  "mascot",
  "character",
  "human",
  "illustration",
  "logo",
  "brand_asset",
  "animal",
]);

const GENERIC_RT_DETR_LABELS = new Set([
  "person",
  "sports ball",
  "tie",
  "cell phone",
  "book",
  "chair",
  "dining table",
]);

const CHARACTER_ROOT: EditorCanvasBounds = { x: 0.18, y: 0.05, width: 0.48, height: 0.88 };
const GLOBE_ROOT: EditorCanvasBounds = { x: 0.52, y: 0.36, width: 0.34, height: 0.34 };

function offsetBounds(
  relative: EditorCanvasBounds,
  parent: EditorCanvasBounds
): EditorCanvasBounds {
  return {
    x: parent.x + relative.x * parent.width,
    y: parent.y + relative.y * parent.height,
    width: relative.width * parent.width,
    height: relative.height * parent.height,
  };
}

function part(
  input: Omit<IllustrationPartSpec, "bbox"> & { relative: EditorCanvasBounds; root?: EditorCanvasBounds }
): IllustrationPartSpec {
  const root = input.root ?? CHARACTER_ROOT;
  return {
    key: input.key,
    label: input.label,
    category: input.category,
    parentKey: input.parentKey,
    group: input.group,
    source: input.source,
    confidence: input.confidence,
    editable: input.editable,
    bbox: offsetBounds(input.relative, root),
  };
}

function buildMascotTemplateParts(vision: AssetVisionAnalysis): IllustrationPartSpec[] {
  const characterLabel =
    vision.objectType === "mascot"
      ? "Mascot"
      : vision.brandIdentity?.trim() || vision.objectTypeLabel || "Character";

  const hasGlobe = vision.keyFeatures.some((f) => /globe|world|earth|planet/i.test(f));
  const parts: IllustrationPartSpec[] = [
    part({ key: "head", label: "Head", category: "head", group: "character", relative: { x: 0.18, y: 0.02, width: 0.64, height: 0.22 }, source: "estimated", confidence: 0.62, editable: true }),
    part({ key: "face", label: "Face", category: "face", parentKey: "head", group: "character", relative: { x: 0.28, y: 0.08, width: 0.44, height: 0.14 }, source: "estimated", confidence: 0.6, editable: true }),
    part({ key: "eyes", label: "Eyes", category: "eyes", parentKey: "face", group: "character", relative: { x: 0.32, y: 0.1, width: 0.36, height: 0.05 }, source: "estimated", confidence: 0.58, editable: true }),
    part({ key: "mouth", label: "Mouth", category: "mouth", parentKey: "face", group: "character", relative: { x: 0.38, y: 0.16, width: 0.24, height: 0.04 }, source: "estimated", confidence: 0.58, editable: true }),
    part({ key: "outline", label: "Face outline", category: "outline", parentKey: "head", group: "character", relative: { x: 0.22, y: 0.04, width: 0.56, height: 0.18 }, source: "estimated", confidence: 0.55, editable: true }),
    part({ key: "body", label: "Body", category: "torso", group: "character", relative: { x: 0.22, y: 0.24, width: 0.56, height: 0.34 }, source: "estimated", confidence: 0.6, editable: true }),
    part({ key: "jacket", label: "Jacket", category: "jacket", parentKey: "body", group: "character", relative: { x: 0.18, y: 0.26, width: 0.64, height: 0.28 }, source: "estimated", confidence: 0.58, editable: true }),
    part({ key: "shirt", label: "Shirt", category: "shirt", parentKey: "body", group: "character", relative: { x: 0.28, y: 0.34, width: 0.44, height: 0.18 }, source: "estimated", confidence: 0.56, editable: true }),
    part({ key: "tie", label: "Tie", category: "tie", parentKey: "body", group: "character", relative: { x: 0.42, y: 0.32, width: 0.16, height: 0.22 }, source: "estimated", confidence: 0.58, editable: true }),
    part({ key: "arms", label: "Arms", category: "arms", parentKey: "body", group: "character", relative: { x: 0.04, y: 0.28, width: 0.92, height: 0.18 }, source: "estimated", confidence: 0.55, editable: true }),
    part({ key: "left_arm", label: "Left arm", category: "left_arm", parentKey: "arms", group: "character", relative: { x: 0.04, y: 0.3, width: 0.22, height: 0.16 }, source: "estimated", confidence: 0.55, editable: true }),
    part({ key: "right_arm", label: "Right arm", category: "right_arm", parentKey: "arms", group: "character", relative: { x: 0.74, y: 0.3, width: 0.22, height: 0.16 }, source: "estimated", confidence: 0.55, editable: true }),
    part({ key: "hands", label: "Hands", category: "hands", parentKey: "arms", group: "character", relative: { x: 0.02, y: 0.4, width: 0.96, height: 0.1 }, source: "estimated", confidence: 0.55, editable: true }),
    part({ key: "left_hand", label: "Left hand", category: "left_hand", parentKey: "hands", group: "character", relative: { x: 0.02, y: 0.42, width: 0.14, height: 0.08 }, source: "estimated", confidence: 0.55, editable: true }),
    part({ key: "right_hand", label: "Right hand", category: "right_hand", parentKey: "hands", group: "character", relative: { x: 0.84, y: 0.42, width: 0.14, height: 0.08 }, source: "estimated", confidence: 0.55, editable: true }),
    part({ key: "pants", label: "Pants", category: "pants", parentKey: "body", group: "character", relative: { x: 0.26, y: 0.52, width: 0.48, height: 0.24 }, source: "estimated", confidence: 0.56, editable: true }),
    part({ key: "shoes", label: "Shoes", category: "shoes", parentKey: "body", group: "character", relative: { x: 0.22, y: 0.76, width: 0.56, height: 0.12 }, source: "estimated", confidence: 0.56, editable: true }),
  ];

  if (hasGlobe) {
    parts.push(
      part({
        key: "globe",
        label: "World globe",
        category: "globe",
        group: "prop",
        root: GLOBE_ROOT,
        relative: { x: 0, y: 0, width: 1, height: 1 },
        source: "estimated",
        confidence: 0.6,
        editable: true,
      }),
      part({
        key: "globe_ocean",
        label: "Blue ocean",
        category: "globe",
        parentKey: "globe",
        group: "prop",
        root: GLOBE_ROOT,
        relative: { x: 0.08, y: 0.1, width: 0.84, height: 0.8 },
        source: "estimated",
        confidence: 0.55,
        editable: true,
      }),
      part({
        key: "globe_continents",
        label: "Green continents",
        category: "globe",
        parentKey: "globe",
        group: "prop",
        root: GLOBE_ROOT,
        relative: { x: 0.18, y: 0.22, width: 0.64, height: 0.56 },
        source: "estimated",
        confidence: 0.55,
        editable: true,
      })
    );
  }

  parts.push(
    {
      key: "bg_surface",
      label: "White background",
      category: "prop",
      group: "background",
      bbox: { x: 0, y: 0, width: 1, height: 1 },
      source: "estimated",
      confidence: 0.7,
      editable: true,
    },
    {
      key: "bg_shadow",
      label: "Shadow",
      category: "shadow",
      group: "background",
      bbox: { x: 0.2, y: 0.82, width: 0.55, height: 0.1 },
      source: "estimated",
      confidence: 0.5,
      editable: true,
    },
    {
      key: "bg_safe_area",
      label: "Safe empty area",
      category: "prop",
      group: "background",
      bbox: { x: 0.05, y: 0.05, width: 0.9, height: 0.9 },
      source: "estimated",
      confidence: 0.45,
      editable: false,
    }
  );

  if (vision.visualStyle) {
    parts.push({
      key: "style_visual",
      label: vision.visualStyle,
      category: "prop",
      group: "style",
      bbox: { x: 0, y: 0, width: 0, height: 0 },
      source: "openai_vision",
      confidence: vision.confidence,
      editable: false,
    });
  }
  for (const color of vision.colors.slice(0, 4)) {
    parts.push({
      key: `style_color_${color.label}`,
      label: color.label ?? color.hex ?? "Color",
      category: "prop",
      group: "style",
      bbox: { x: 0, y: 0, width: 0, height: 0 },
      source: "openai_vision",
      confidence: 0.6,
      editable: false,
    });
  }

  void characterLabel;
  return parts;
}

export function isIllustrationLikeImage(vision: AssetVisionAnalysis): boolean {
  if (ILLUSTRATION_OBJECT_TYPES.has(vision.objectType)) {
    return true;
  }
  const style = vision.visualStyle.toLowerCase();
  if (/cartoon|illustration|flat|storybook|vector|mascot|logo|brand/.test(style)) {
    return true;
  }
  const features = vision.keyFeatures.join(" ").toLowerCase();
  return /mascot|globe|cartoon|illustration|logo|character|chef|brand/.test(features);
}

export function isWeakRtdetrDetection(detections: ObjectDetection[]): boolean {
  if (detections.length === 0) {
    return true;
  }
  const useful = detections.filter(
    (d) => d.confidence >= 0.35 && !GENERIC_RT_DETR_LABELS.has(d.label.toLowerCase())
  );
  if (useful.length === 0) {
    return true;
  }
  if (detections.length === 1 && GENERIC_RT_DETR_LABELS.has(detections[0]!.label.toLowerCase())) {
    return true;
  }
  return detections.length < 2;
}

export function shouldRunIllustrationPartAnalysis(input: {
  vision: AssetVisionAnalysis;
  detections: ObjectDetection[];
  semanticLayerCount: number;
  sourceKind?: import("@/types/homecheff-visual-editor").EditorSourceKind;
  documentName?: string;
  semanticLayerLabels?: string[];
}): boolean {
  if (input.sourceKind === "character" || input.sourceKind === "logo") {
    return true;
  }
  if (isIllustrationLikeImage(input.vision)) {
    return true;
  }
  const taxonomy = resolveVisionTaxonomy({
    vision: input.vision,
    documentName: input.documentName,
    semanticLayerLabels: input.semanticLayerLabels,
    sourceKind: input.sourceKind,
  });
  if (taxonomy) {
    return true;
  }
  return isWeakRtdetrDetection(input.detections) || input.semanticLayerCount < 4;
}

export function buildTemplateIllustrationPartAnalysis(
  vision: AssetVisionAnalysis,
  context?: {
    documentName?: string;
    semanticLayerLabels?: string[];
    sourceKind?: import("@/types/homecheff-visual-editor").EditorSourceKind;
  }
): IllustrationPartAnalysisResult {
  const partContext = {
    vision,
    documentName: context?.documentName,
    semanticLayerLabels: context?.semanticLayerLabels,
    sourceKind: context?.sourceKind,
  };
  const base: IllustrationPartAnalysisResult = {
    parts: buildMascotTemplateParts(vision),
    characterLabel: vision.objectType === "mascot" ? "Mascot" : vision.objectTypeLabel || "Character",
    propLabel: vision.keyFeatures.some((f) => /globe|world/i.test(f)) ? "World globe" : undefined,
    openAiUsed: false,
    templateUsed: true,
  };
  return mergeIllustrationPartsWithVisionTaxonomy(base, partContext).analysis;
}

function mergeRtdetrIntoParts(
  parts: IllustrationPartSpec[],
  detections: ObjectDetection[]
): IllustrationPartSpec[] {
  const merged = [...parts];
  for (const det of detections) {
    const label = det.label.toLowerCase();
    const matchIdx = merged.findIndex((p) => {
      const pl = p.label.toLowerCase();
      return pl.includes(label) || label.includes(pl) || (label === "person" && p.group === "character");
    });
    if (matchIdx >= 0) {
      merged[matchIdx] = {
        ...merged[matchIdx]!,
        bbox: det.box,
        source: "rtdetr",
        confidence: det.confidence,
      };
    } else if (!GENERIC_RT_DETR_LABELS.has(label) || det.confidence >= 0.5) {
      merged.push({
        key: `rtdetr_${label}_${merged.length}`,
        label: det.label.charAt(0).toUpperCase() + det.label.slice(1),
        category: "prop",
        group: label === "sports ball" ? "prop" : "character",
        bbox: det.box,
        source: "rtdetr",
        confidence: det.confidence,
        editable: true,
      });
    }
  }
  return merged;
}

function partToSemanticLayer(
  spec: IllustrationPartSpec,
  parentLayerId: string | undefined,
  vision: AssetVisionAnalysis,
  index: number
): EditorSemanticLayer {
  const classified = classifyEditorSemanticFeature(spec.label, vision.objectType);
  const type = spec.category === "globe" ? "held_object" : classified.type;
  return {
    id: `v6_${spec.key}_${index}`,
    label: spec.label,
    type,
    category: classified.category,
    bounds: spec.bbox,
    confidence: spec.confidence,
    visible: true,
    locked: false,
    editable: spec.editable,
    source:
      spec.source === "rtdetr"
        ? "onnx_detector"
        : spec.source === "openai_vision"
          ? "vision"
          : spec.source === "manual"
            ? "manual"
            : spec.source === "taxonomy_fallback"
              ? "generated"
              : "generated",
    parentId: parentLayerId,
    children: [],
    metadata: {
      taxonomyKey: type,
      estimatedBounds: spec.source !== "rtdetr",
      approximateSelection: spec.source !== "rtdetr",
      selectionMode: "box",
      visionPartSource: spec.source,
      partCategory: spec.category,
    },
  };
}

function buildSemanticLayersFromParts(
  analysis: IllustrationPartAnalysisResult,
  vision: AssetVisionAnalysis
): EditorSemanticLayer[] {
  const layers: EditorSemanticLayer[] = [];
  const keyToLayerId = new Map<string, string>();

  const characterRoot: EditorSemanticLayer = {
    id: "v6_character_root",
    label: analysis.characterLabel,
    type: "character",
    category: "character",
    bounds: CHARACTER_ROOT,
    confidence: vision.confidence,
    visible: true,
    locked: false,
    editable: true,
    source: "vision",
    children: [],
    metadata: { taxonomyKey: "character", visionPartSource: "openai_vision" },
  };
  layers.push(characterRoot);
  keyToLayerId.set("character", characterRoot.id);

  let propRootId: string | undefined;
  if (analysis.propLabel) {
    const propRoot: EditorSemanticLayer = {
      id: "v6_prop_root",
      label: analysis.propLabel,
      type: "held_object",
      category: "prop",
      bounds: GLOBE_ROOT,
      confidence: vision.confidence * 0.9,
      visible: true,
      locked: false,
      editable: true,
      source: "vision",
      children: [],
      metadata: { taxonomyKey: "held_object", visionPartSource: "estimated" },
    };
    layers.push(propRoot);
    propRootId = propRoot.id;
    keyToLayerId.set("globe", propRoot.id);
  }

  const bgLayer: EditorSemanticLayer = {
    id: "semantic_background",
    label: "Background",
    type: "background",
    category: "background",
    bounds: { x: 0, y: 0, width: 1, height: 1 },
    confidence: 1,
    visible: true,
    locked: true,
    editable: false,
    source: "vision",
    children: [],
    metadata: { taxonomyKey: "background" },
  };
  layers.push(bgLayer);

  const characterParts = analysis.parts.filter((p) => p.group === "character");
  const propParts = analysis.parts.filter((p) => p.group === "prop");
  const bgParts = analysis.parts.filter((p) => p.group === "background");

  characterParts.forEach((spec, index) => {
    const parentKey = spec.parentKey;
    const parentId =
      parentKey && keyToLayerId.has(parentKey)
        ? keyToLayerId.get(parentKey)
        : characterRoot.id;
    const layer = partToSemanticLayer(spec, parentId, vision, index);
    layers.push(layer);
    keyToLayerId.set(spec.key, layer.id);
    if (parentId) {
      const parent = layers.find((l) => l.id === parentId);
      if (parent) {
        parent.children.push(layer.id);
      }
    }
  });

  propParts.forEach((spec, index) => {
    const parentId =
      spec.parentKey && keyToLayerId.has(spec.parentKey)
        ? keyToLayerId.get(spec.parentKey)
        : propRootId;
    if (!parentId) {
      return;
    }
    const layer = partToSemanticLayer(spec, parentId, vision, 100 + index);
    layers.push(layer);
    keyToLayerId.set(spec.key, layer.id);
    const parent = layers.find((l) => l.id === parentId);
    if (parent) {
      parent.children.push(layer.id);
    }
  });

  bgParts.forEach((spec, index) => {
    if (spec.key === "bg_surface") {
      return;
    }
    const layer = partToSemanticLayer(spec, bgLayer.id, vision, 200 + index);
    layers.push(layer);
    bgLayer.children.push(layer.id);
  });

  return layers;
}

function partsToObjectHierarchies(
  analysis: IllustrationPartAnalysisResult,
  detectedObjects: ReturnType<typeof buildEditorObjectsFromLayers>,
  semanticLayers: EditorSemanticLayer[],
  vision: AssetVisionAnalysis
): Record<string, EditorObjectHierarchy> {
  const base = buildDocumentObjectHierarchies(
    detectedObjects,
    detectedObjects.map((o) => ({
      id: o.layerId,
      label: o.label,
      layerType: o.category === "background" ? "background" : "semantic",
      bounds: o.bbox,
      sourceKind: "upload",
      assetId: null,
      storageKey: "",
      previewUrl: "",
      transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
      locked: false,
      visible: true,
      children: semanticLayers.filter((l) => l.parentId === o.layerId).map((l) => l.id),
    })) as EditorCanvasLayer[],
    semanticLayers,
    vision.objectType
  );

  for (const object of detectedObjects) {
    if (object.category === "background") {
      continue;
    }
    const charParts = analysis.parts.filter((p) => p.group === "character");
    if (charParts.length > 0 && (object.category === "mascot" || object.category === "person")) {
      const parts = charParts.map((spec, index) => ({
        id: `part_${spec.key}`,
        label: spec.label,
        partCategory: spec.category,
        parentPartId: spec.parentKey ? `part_${spec.parentKey}` : undefined,
        childPartIds: [] as string[],
        bbox: spec.bbox,
        polygon: boundsToPolygon(spec.bbox),
        confidence: spec.confidence,
        visible: true,
        locked: false,
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        animationProfile: "none" as const,
        estimatedBounds: spec.source !== "rtdetr",
      }));
      for (const p of parts) {
        if (p.parentPartId) {
          const parent = parts.find((x) => x.id === p.parentPartId);
          if (parent) {
            parent.childPartIds.push(p.id);
          }
        }
      }
      base[object.id] = {
        rootObjectId: object.id,
        rootLayerId: object.layerId,
        rootLabel: object.label,
        parts,
      };
    }
  }
  return base;
}

export function applyIllustrationPartAnalysisToDocument(input: {
  document: EditorCanvasDocument;
  vision: AssetVisionAnalysis;
  detections: ObjectDetection[];
  analysis: IllustrationPartAnalysisResult;
  previewUrl: string;
  sourceKind: EditorCanvasDocument["sourceKind"];
}): EditorCanvasDocument {
  const mergedAnalysis: IllustrationPartAnalysisResult = {
    ...input.analysis,
    parts: mergeRtdetrIntoParts(input.analysis.parts, input.detections),
  };

  const semanticLayers = buildSemanticLayersFromParts(mergedAnalysis, input.vision);
  const canvasLayers = semanticLayers.map((layer) =>
    semanticLayerToCanvasLayer(layer, input.sourceKind, input.previewUrl)
  );

  const bg = input.document.objects.find((o) => o.id === "background");
  if (bg) {
    const bgIndex = canvasLayers.findIndex((l) => l.layerType === "background");
    if (bgIndex >= 0) {
      canvasLayers[bgIndex] = { ...canvasLayers[bgIndex]!, ...bg, id: "background" };
    }
  }

  const detectedObjects = buildEditorObjectsFromLayers(canvasLayers, {
    visionObjectType: input.vision.objectType,
  }).map((obj) => {
    if (obj.category !== "background" && (obj.category === "unknown" || obj.category === "foreground")) {
      return {
        ...obj,
        category: input.vision.objectType === "mascot" ? ("mascot" as const) : ("person" as const),
        label: mergedAnalysis.characterLabel,
      };
    }
    return obj;
  });

  const objectHierarchies = partsToObjectHierarchies(
    mergedAnalysis,
    detectedObjects,
    semanticLayers,
    input.vision
  );

  const detectedWithParts = detectedObjects.map((obj) => {
    const hierarchy = objectHierarchies[obj.id];
    return hierarchy ? attachPartsToEditorObject(obj, hierarchy) : obj;
  });

  const visionHierarchy = buildEditorVisionV6Hierarchy({
    analysis: mergedAnalysis,
    objects: detectedWithParts,
    layers: canvasLayers,
    semanticLayers,
    objectHierarchies,
    vision: input.vision,
  });

  const layerSources: EditorVisionV6LayerSource[] = semanticLayers
    .filter((l) => l.type !== "background")
    .map((l) => ({
      layerId: l.id,
      label: l.label,
      source: (l.metadata?.visionPartSource as EditorVisionPartSource) ?? "estimated",
      estimated: l.metadata?.estimatedBounds ?? true,
    }));

  const visionV6Meta: EditorVisionV6Meta = {
    illustrationAnalysis: true,
    rtdetrCount: input.detections.length,
    visionPartCount: mergedAnalysis.parts.filter((p) => p.group === "character" || p.group === "prop").length,
    mergedLayerCount: semanticLayers.filter((l) => l.type !== "background").length,
    openAiPartsUsed: mergedAnalysis.openAiUsed,
    layerSources,
    taxonomyType: resolveVisionTaxonomy({
      vision: input.vision,
      documentName: input.document.name,
      semanticLayerLabels: semanticLayers.map((l) => l.label),
      sourceKind: input.sourceKind,
    })?.type,
  };

  return {
    ...input.document,
    objects: canvasLayers,
    semanticLayers,
    detectedObjects: detectedWithParts,
    objectHierarchies,
    visionHierarchy,
    visionV6Meta,
    visionAnalysis: input.vision,
  };
}

export function mergeOpenAiIllustrationParts(
  template: IllustrationPartAnalysisResult,
  openAi: IllustrationPartAnalysisResult
): IllustrationPartAnalysisResult {
  const byKey = new Map(template.parts.map((p) => [p.key, p]));
  for (const part of openAi.parts) {
    const existing = byKey.get(part.key);
    if (existing) {
      byKey.set(part.key, {
        ...existing,
        label: part.label || existing.label,
        bbox: part.bbox.width > 0 ? part.bbox : existing.bbox,
        source: "openai_vision",
        confidence: Math.max(existing.confidence, part.confidence),
      });
    } else {
      byKey.set(part.key, { ...part, source: "openai_vision" });
    }
  }
  return {
    characterLabel: openAi.characterLabel || template.characterLabel,
    propLabel: openAi.propLabel ?? template.propLabel,
    parts: [...byKey.values()],
    openAiUsed: true,
    templateUsed: true,
  };
}
