/**
 * Visible editor parts tree — rebuilt from found data, not legacy truth-hierarchy merge.
 */

import {
  enrichAnalysisWithVisionKeyFeatureAccessories,
  resolveKeyFeatureAccessories,
} from "@/lib/editor-vision-accessory-detection";
import { resolveLegacyActionPartGroupFromPart } from "@/lib/editor-vision-hierarchy-action-mapping";
import {
  isBlockedInferredBodyPart,
  isEvidenceBackedPart,
} from "@/lib/editor-vision-evidence-audit";
import {
  resolveUserTaxonomyPlacement,
  USER_TAXONOMY_PARENT_ACCESSORIES,
  USER_TAXONOMY_PARENT_BACKGROUND,
  USER_TAXONOMY_PARENT_CHARACTER,
  USER_TAXONOMY_PARENT_CLOTHING,
  USER_TAXONOMY_PARENT_POSE,
  type UserTaxonomyParent,
} from "@/lib/editor-vision-user-taxonomy";
import { countVisionHierarchyNodes } from "@/lib/editor-vision-v6-stability";
import type { IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type { VisionTaxonomyAssetType } from "@/lib/editor-vision-accessories-taxonomy";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type {
  EditorCanvasDocument,
  EditorObject,
  EditorSemanticLayer,
  EditorVisionHierarchyNode,
  EditorVisionPartSource,
  EditorVisionTruthSection,
  EditorVisionTruthTier,
} from "@/types/homecheff-visual-editor";

export type VisiblePartsTreeDatasource =
  | "vision_parts_api"
  | "merged_analysis"
  | "vision_hierarchy"
  | "semantic_layers"
  | "detected_objects"
  | "rtdetr_fallback";

export type BuildVisibleEditorPartsTreeInput = {
  visionPartsApiParts?: IllustrationPartSpec[];
  mergedAnalysisParts?: IllustrationPartSpec[];
  visionHierarchy?: EditorVisionHierarchyNode[];
  semanticLayers?: EditorSemanticLayer[];
  detectedObjects?: EditorObject[];
  keyFeatures?: string[];
  environmentHints?: string | string[];
  assetType?: VisionTaxonomyAssetType;
  /** When basic, skip display-time portrait inference and semantic supplements. */
  analysisTier?: "basic" | "premium";
};

export type VisiblePartDropReason = {
  label: string;
  reason: string;
};

export type VisibleEditorPartsTreeDebug = {
  rawPartsCount: number;
  visibleTreeNodeCount: number;
  datasourceUsed: VisiblePartsTreeDatasource | "none";
  droppedPartsCount: number;
  droppedPartLabels: string[];
  dropReasons: VisiblePartDropReason[];
  /** Admin — labels before cleanup/filtering. */
  rawPartLabels: string[];
  /** @deprecated use rawPartLabels */
  rawFoundLabels: string[];
  mergedAnalysisPartLabels: string[];
  visibleLeafLabels: string[];
};

export type VisibleEditorPartsTreeResult = {
  tree: EditorVisionHierarchyNode[];
  debug: VisibleEditorPartsTreeDebug;
};

const FACE_DETAIL_RE = /\b(eyes?|ogen|mouth|mond|lips?|lippen|hair|haar|beard|baard|snor)\b/i;
const HEAD_FACE_RE = /\b(head|kop|face|gezicht|hoofd)\b/i;
const BODY_RE = /\b(body|lichaam|torso)\b/i;
const SHIRT_CLOTHING_RE =
  /\b(shirt|top|polo|tee|t-?shirt|blouse|clothing|kleding|jas|jacket|vest)\b/i;
const BACKGROUND_RE =
  /\b(background|landscape|sea|ocean|mountain|mountains|sky|beach|achtergrond|zee|bergen|lucht|horizon)\b/i;
const POSE_LIMB_RE = /\b(arms?|armen|hands?|handen|legs?|benen|feet|feet|pose|houding)\b/i;
const NOISE_LABEL_RE =
  /\b(mixed|main subject|hoofdonderwerp|estimated zone|safe empty area|safe area|subject|unknown|detected on image)\b/i;
const SPECIFIC_CHARACTER_RE =
  /\b(eyes?|ogen|mouth|mond|hair|haar|beard|baard|head|kop|face|gezicht|shirt|jas|jacket|tie|stropdas)\b/i;

const LABEL_NL_BY_KEY: Record<string, string> = {
  eyes: "Ogen",
  eye: "Ogen",
  mouth: "Mond",
  lips: "Lippen",
  hair: "Haar",
  beard: "Baard",
  baard: "Baard",
  head: "Hoofd",
  face: "Gezicht",
  body: "Lichaam",
  torso: "Lichaam",
  shirt: "Shirt",
  top: "Shirt",
  jacket: "Jas",
  tie: "Stropdas",
  necktie: "Stropdas",
  pants: "Broek",
  trousers: "Broek",
  shoes: "Schoenen",
  shoe: "Schoenen",
  sneakers: "Schoenen",
  arms: "Armen",
  arm: "Arm",
  hands: "Handen",
  hand: "Hand",
  legs: "Benen",
  leg: "Been",
  background: "Achtergrond",
  sky: "Lucht",
  sea: "Zee",
  ocean: "Zee",
  mountain: "Bergen",
  mountains: "Bergen",
  landscape: "Landschap",
  sunglasses: "Zonnebril",
  glasses: "Bril",
  eyewear: "Bril",
  watch: "Horloge",
  bag: "Tas",
  backpack: "Tas",
};

function partSlug(part: IllustrationPartSpec): string {
  return (part.key || part.label).toLowerCase().replace(/\s+/g, "_");
}

function partText(part: IllustrationPartSpec): string {
  return `${part.key} ${part.label} ${part.category ?? ""}`.toLowerCase();
}

function partMatches(part: IllustrationPartSpec, re: RegExp): boolean {
  return re.test(partText(part));
}

function partMatchesFaceDetail(part: IllustrationPartSpec, re: RegExp): boolean {
  const text = `${part.key} ${part.label}`.toLowerCase();
  if (/\bsunglass/i.test(text) || /\bzonnebril\b/i.test(text)) {
    return false;
  }
  return re.test(text);
}

export function translateVisiblePartLabel(part: IllustrationPartSpec): string {
  const key = part.key.toLowerCase().trim();
  if (LABEL_NL_BY_KEY[key]) {
    return LABEL_NL_BY_KEY[key]!;
  }
  const label = part.label.toLowerCase().trim();
  for (const [token, nl] of Object.entries(LABEL_NL_BY_KEY)) {
    if (label === token || label.includes(token)) {
      if (token === "glasses" && /\bsun/i.test(label)) {
        return "Zonnebril";
      }
      if (token === "eye" && label.includes("brow")) {
        continue;
      }
      return nl;
    }
  }
  if (/\bsunglasses?\b/.test(label) || /\bzonnebril\b/.test(label)) {
    return "Zonnebril";
  }
  if (/\bglasses\b/.test(label) || /\bbril\b/.test(label)) {
    return "Bril";
  }
  return part.label.trim();
}

function isNoisePart(part: IllustrationPartSpec): boolean {
  const text = partText(part);
  if (NOISE_LABEL_RE.test(text)) {
    return true;
  }
  if (part.label.trim().length <= 1) {
    return true;
  }
  return false;
}

function hasValidBbox(part: IllustrationPartSpec): boolean {
  const b = part.bbox;
  return Boolean(b && b.width > 0.02 && b.height > 0.02);
}

function classifyPartSection(
  part: IllustrationPartSpec,
  allParts: IllustrationPartSpec[],
  assetType: VisionTaxonomyAssetType
): EditorVisionTruthSection | "drop" {
  if (isNoisePart(part)) {
    return "drop";
  }

  if (part.source === "taxonomy_fallback" || part.source === "creative") {
    return "creative";
  }

  const context = { assetType };
  if (isEvidenceBackedPart(part, context)) {
    return "detected";
  }

  if (isBlockedInferredBodyPart(part) && !hasValidBbox(part) && !part.mask && !part.polygon?.length) {
    return "drop";
  }

  if (
    isBlockedInferredBodyPart(part) &&
    !isEvidenceBackedPart(part, context)
  ) {
    return "estimated";
  }

  if (part.source === "openai_vision" || part.source === "rtdetr") {
    return part.confidence >= 0.72 ? "detected" : "estimated";
  }

  return "estimated";
}

function truthTierForSection(section: EditorVisionTruthSection): EditorVisionTruthTier {
  if (section === "detected") {
    return "vision";
  }
  if (section === "estimated") {
    return "estimated";
  }
  return "creative";
}

function mergePart(existing: IllustrationPartSpec, incoming: IllustrationPartSpec): IllustrationPartSpec {
  if (incoming.confidence >= existing.confidence) {
    return { ...existing, ...incoming, confidence: Math.max(existing.confidence, incoming.confidence) };
  }
  return existing;
}

function dedupeParts(parts: IllustrationPartSpec[]): {
  parts: IllustrationPartSpec[];
  dropReasons: VisiblePartDropReason[];
} {
  const byKey = new Map<string, IllustrationPartSpec>();
  const dropReasons: VisiblePartDropReason[] = [];

  for (const part of parts) {
    const key = partSlug(part);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, part);
      continue;
    }
    dropReasons.push({ label: part.label, reason: "duplicate_key" });
    const merged = mergePart(existing, part);
    byKey.set(key, merged);
  }

  return { parts: [...byKey.values()], dropReasons };
}

function enrichPartsWithKeyFeatures(
  parts: IllustrationPartSpec[],
  keyFeatures: string[] | undefined,
  environmentHints: string | string[] | undefined,
  assetType: VisionTaxonomyAssetType
): IllustrationPartSpec[] {
  let next = parts;

  if (keyFeatures?.length && resolveKeyFeatureAccessories(keyFeatures).length > 0) {
    const stubVision = {
      keyFeatures,
      objectType: assetType === "unknown" ? "human" : assetType,
    } as AssetVisionAnalysis;

    next = enrichAnalysisWithVisionKeyFeatureAccessories(
      {
        parts: next,
        characterLabel: "Subject",
        openAiUsed: next.some((p) => p.source === "openai_vision"),
        templateUsed: false,
      },
      stubVision
    ).parts.map((part) =>
      resolveKeyFeatureAccessories(keyFeatures).some((spec) => spec.key === part.key) &&
      !parts.some((p) => p.key === part.key)
        ? { ...part, confidence: Math.max(part.confidence, 0.75) }
        : part
    );
  }

  const envText = Array.isArray(environmentHints)
    ? environmentHints.join(" ")
    : (environmentHints ?? "");
  const featureText = [...(keyFeatures ?? []), envText].filter(Boolean).join(" ");
  if (!featureText.trim()) {
    return next;
  }

  const KEY_FEATURE_VISIBLE_SIGNALS = [
    {
      key: "hair",
      label: "Hair",
      category: "head" as const,
      pattern: /\b(hair|haar|curly|bald|ponytail|bun)\b/i,
      match: FACE_DETAIL_RE,
    },
    {
      key: "beard",
      label: "Beard",
      category: "head" as const,
      pattern: /\b(beard|baard|mustache|moustache|stubble|snor)\b/i,
      match: /\b(beard|baard|mustache|moustache|stubble|snor)\b/i,
    },
    {
      key: "shirt",
      label: "Shirt",
      category: "shirt" as const,
      pattern: SHIRT_CLOTHING_RE,
      match: SHIRT_CLOTHING_RE,
    },
    {
      key: "background",
      label: "Background",
      category: "prop" as const,
      pattern: BACKGROUND_RE,
      match: BACKGROUND_RE,
    },
  ] as const;

  const anchor =
    next.find((p) => partMatches(p, HEAD_FACE_RE) && hasValidBbox(p)) ??
    next.find((p) => partMatches(p, HEAD_FACE_RE));

  for (const spec of KEY_FEATURE_VISIBLE_SIGNALS) {
    if (!spec.pattern.test(featureText)) {
      continue;
    }
    if (next.some((p) => partMatches(p, spec.match) || p.key === spec.key)) {
      continue;
    }
    const bbox =
      spec.key === "background"
        ? { x: 0, y: 0, width: 1, height: 1 }
        : spec.key === "shirt" && anchor?.bbox
          ? {
              x: Math.max(0, anchor.bbox.x - anchor.bbox.width * 0.12),
              y: Math.min(0.95, anchor.bbox.y + anchor.bbox.height * 0.82),
              width: Math.min(1, anchor.bbox.width * 1.24),
              height: Math.min(0.55, 1 - (anchor.bbox.y + anchor.bbox.height * 0.82)),
            }
        : anchor?.bbox && spec.key === "hair"
          ? derivePortraitSubpartBbox(anchor.bbox, "hair")
          : { x: 0.2, y: 0.2, width: 0.6, height: 0.2 };

    next.push({
      key: spec.key,
      label: spec.label,
      category: spec.category,
      group: spec.key === "background" ? "background" : "character",
      bbox,
      source: "estimated",
      confidence: 0.62,
      editable: true,
    });
  }

  return next;
}

function derivePortraitSubpartBbox(
  anchor: IllustrationPartSpec["bbox"],
  kind: "eyes" | "mouth" | "hair"
): IllustrationPartSpec["bbox"] {
  const b = anchor;
  if (kind === "eyes") {
    return {
      x: b.x + b.width * 0.15,
      y: b.y + b.height * 0.22,
      width: b.width * 0.7,
      height: Math.max(0.04, b.height * 0.22),
    };
  }
  if (kind === "mouth") {
    return {
      x: b.x + b.width * 0.22,
      y: b.y + b.height * 0.62,
      width: b.width * 0.56,
      height: Math.max(0.04, b.height * 0.18),
    };
  }
  return {
    x: Math.max(0, b.x - b.width * 0.06),
    y: Math.max(0, b.y - b.height * 0.28),
    width: Math.min(1, b.width * 1.12),
    height: Math.max(0.06, b.height * 0.42),
  };
}

function inferPortraitMissingParts(
  parts: IllustrationPartSpec[],
  assetType: VisionTaxonomyAssetType
): IllustrationPartSpec[] {
  if (assetType !== "human" && assetType !== "unknown") {
    return parts;
  }

  const anchor =
    parts.find((p) => partMatches(p, HEAD_FACE_RE) && hasValidBbox(p)) ??
    parts.find((p) => partMatches(p, HEAD_FACE_RE));
  if (!anchor?.bbox || anchor.bbox.width <= 0.02) {
    return parts;
  }

  const next = [...parts];
  const addEstimated = (
    key: string,
    label: string,
    category: IllustrationPartSpec["category"],
    match: RegExp,
    bbox: IllustrationPartSpec["bbox"]
  ) => {
    if (next.some((p) => partMatchesFaceDetail(p, match) || p.key === key)) {
      return;
    }
    next.push({
      key,
      label,
      category,
      group: "character",
      bbox,
      source: "estimated",
      confidence: 0.55,
      editable: true,
    });
  };

  const b = anchor.bbox;
  addEstimated("eyes", "Eyes", "eyes", /\b(eyes?|ogen)\b/i, derivePortraitSubpartBbox(b, "eyes"));
  addEstimated("mouth", "Mouth", "mouth", /\b(mouth|mond|lips?)\b/i, derivePortraitSubpartBbox(b, "mouth"));
  addEstimated("hair", "Hair", "head", /\b(hair|haar|beard|baard)\b/i, derivePortraitSubpartBbox(b, "hair"));

  if (!next.some((p) => partMatches(p, SHIRT_CLOTHING_RE))) {
    addEstimated(
      "shirt",
      "Shirt",
      "shirt",
      SHIRT_CLOTHING_RE,
      {
        x: Math.max(0, b.x - b.width * 0.12),
        y: Math.min(0.95, b.y + b.height * 0.82),
        width: Math.min(1, b.width * 1.24),
        height: Math.min(0.55, Math.max(0.12, 1 - (b.y + b.height * 0.82))),
      }
    );
  }

  if (!next.some((p) => partMatches(p, BACKGROUND_RE) || p.key === "background")) {
    next.push({
      key: "background",
      label: "Background",
      category: "prop",
      group: "background",
      bbox: { x: 0, y: 0, width: 1, height: 1 },
      source: "estimated",
      confidence: 0.5,
      editable: true,
    });
  }

  return next;
}

function collapseRedundantBody(parts: IllustrationPartSpec[]): {
  parts: IllustrationPartSpec[];
  dropReasons: VisiblePartDropReason[];
} {
  const hasSpecific = parts.some((part) => partMatches(part, SPECIFIC_CHARACTER_RE));
  if (!hasSpecific) {
    return { parts, dropReasons: [] };
  }
  const dropReasons: VisiblePartDropReason[] = [];
  const kept = parts.filter((part) => {
    if (!partMatches(part, BODY_RE)) {
      return true;
    }
    const keep = hasValidBbox(part) && part.confidence >= 0.8;
    if (!keep) {
      dropReasons.push({ label: part.label, reason: "collapsed_body" });
    }
    return keep;
  });
  return { parts: kept, dropReasons };
}

function objectPartToSpec(part: {
  id: string;
  label: string;
  partCategory: IllustrationPartSpec["category"];
  bbox: IllustrationPartSpec["bbox"];
  confidence: number;
  estimatedBounds?: boolean;
  mask?: string;
  polygon?: IllustrationPartSpec["polygon"];
}): IllustrationPartSpec {
  const key = part.id.replace(/^part_/, "");
  return {
    key,
    label: part.label,
    category: part.partCategory,
    group: "character",
    bbox: part.bbox,
    source: part.estimatedBounds ? "estimated" : "rtdetr",
    confidence: part.confidence,
    editable: true,
    mask: part.mask,
    polygon: part.polygon,
  };
}

export function extractPartsFromObjectHierarchies(
  document: Pick<EditorCanvasDocument, "objectHierarchies">
): IllustrationPartSpec[] {
  const parts: IllustrationPartSpec[] = [];
  for (const hierarchy of Object.values(document.objectHierarchies ?? {})) {
    for (const part of hierarchy.parts) {
      parts.push(objectPartToSpec(part));
    }
  }
  return parts;
}

function partsFromHierarchyLeaves(
  nodes: EditorVisionHierarchyNode[] | undefined
): IllustrationPartSpec[] {
  const parts: IllustrationPartSpec[] = [];
  const walk = (list: EditorVisionHierarchyNode[]) => {
    for (const node of list) {
      if (node.truthSection) {
        walk(node.children);
        continue;
      }
      if (node.children.length > 0) {
        walk(node.children);
        continue;
      }
      if (!node.partId && !node.editable) {
        continue;
      }
      const key = node.partId?.replace(/^part_/, "") ?? node.id.replace(/^visible_part_/, "");
      parts.push({
        key,
        label: node.label,
        category: "face",
        group: "character",
        bbox: node.bbox ?? { x: 0, y: 0, width: 0, height: 0 },
        source: (node.source ?? "estimated") as EditorVisionPartSource,
        confidence: node.confidence ?? 0.5,
        editable: node.editable,
        taxonomyTab: node.taxonomyTab,
      });
    }
  };
  walk(nodes ?? []);
  return parts;
}

function partsFromSemanticLayers(layers: EditorSemanticLayer[] | undefined): IllustrationPartSpec[] {
  return (layers ?? [])
    .filter((layer) => layer.type !== "background" && !NOISE_LABEL_RE.test(layer.label))
    .map((layer, index) => {
      const key = layer.id.replace(/^v6_/, "").replace(/_\d+$/, "") || `semantic_${index}`;
      return {
        key,
        label: layer.label,
        category: "face",
        group: "character" as const,
        bbox: layer.bounds ?? { x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
        source: "estimated" as const,
        confidence: 0.45,
        editable: true,
      };
    });
}

function partsFromDetectedObjects(objects: EditorObject[] | undefined): IllustrationPartSpec[] {
  const parts: IllustrationPartSpec[] = [];
  for (const object of objects ?? []) {
    if (object.category === "background") {
      continue;
    }
    for (const part of object.parts ?? []) {
      parts.push(objectPartToSpec(part));
    }
    if (!object.parts?.length && object.partCategory && !NOISE_LABEL_RE.test(object.label)) {
      parts.push({
        key: object.id,
        label: object.label,
        category: object.partCategory,
        group: "character",
        bbox: object.bbox,
        source: "rtdetr",
        confidence: object.confidence,
        editable: true,
      });
    }
  }
  return parts;
}

function collectRawParts(input: BuildVisibleEditorPartsTreeInput): {
  parts: IllustrationPartSpec[];
  datasource: VisiblePartsTreeDatasource;
  dropReasons: VisiblePartDropReason[];
  rawPartLabels: string[];
} {
  const apiParts = input.visionPartsApiParts ?? [];
  const mergedParts = input.mergedAnalysisParts ?? [];
  let primary = [...apiParts, ...mergedParts];

  if (primary.length > 0 && input.analysisTier !== "basic") {
    const looksLikeThinPortrait =
      primary.length <= 3 &&
      primary.some(
        (part) =>
          partMatches(part, HEAD_FACE_RE) ||
          /\b(sunglass|zonnebril|glasses|bril)\b/i.test(partText(part))
      );
    if (looksLikeThinPortrait && primary.length < 6) {
      const supplemental = [
        ...partsFromSemanticLayers(input.semanticLayers),
        ...partsFromDetectedObjects(input.detectedObjects),
        ...partsFromHierarchyLeaves(input.visionHierarchy),
      ];
      if (supplemental.length > 0) {
        primary = [...primary, ...supplemental];
      }
    }

    const rawPartLabels = primary.map((p) => p.label);
    const { parts, dropReasons } = dedupeParts(primary);
    return {
      parts,
      datasource: apiParts.length > 0 ? "vision_parts_api" : "merged_analysis",
      dropReasons,
      rawPartLabels,
    };
  }

  const fromHierarchy = partsFromHierarchyLeaves(input.visionHierarchy);
  if (fromHierarchy.length > 0) {
    const rawPartLabels = fromHierarchy.map((p) => p.label);
    const { parts, dropReasons } = dedupeParts(fromHierarchy);
    return { parts, datasource: "vision_hierarchy", dropReasons, rawPartLabels };
  }

  const fromSemantic = partsFromSemanticLayers(input.semanticLayers);
  if (fromSemantic.length > 0) {
    const rawPartLabels = fromSemantic.map((p) => p.label);
    const { parts, dropReasons } = dedupeParts(fromSemantic);
    return { parts, datasource: "semantic_layers", dropReasons, rawPartLabels };
  }

  const fromDetected = partsFromDetectedObjects(input.detectedObjects);
  if (fromDetected.length > 0) {
    const rawPartLabels = fromDetected.map((p) => p.label);
    const { parts, dropReasons } = dedupeParts(fromDetected);
    return { parts, datasource: "detected_objects", dropReasons, rawPartLabels };
  }

  const rtdetrOnly = (input.detectedObjects ?? [])
    .filter((o) => o.category !== "background" && !NOISE_LABEL_RE.test(o.label))
    .map((o) => ({
      key: o.id,
      label: o.label,
      category: o.partCategory ?? ("face" as const),
      group: "character" as const,
      bbox: o.bbox,
      source: "rtdetr" as const,
      confidence: o.confidence,
      editable: true,
    }));
  const rawPartLabels = rtdetrOnly.map((p) => p.label);
  const { parts, dropReasons } = dedupeParts(rtdetrOnly);
  return { parts, datasource: "rtdetr_fallback", dropReasons, rawPartLabels };
}

function groupContainer(
  id: string,
  parent: UserTaxonomyParent,
  sub: string | undefined,
  children: EditorVisionHierarchyNode[]
): EditorVisionHierarchyNode | null {
  if (children.length === 0) {
    return null;
  }
  return {
    id,
    label: sub ?? parent,
    category: parent === USER_TAXONOMY_PARENT_BACKGROUND ? "background" : "objects",
    editable: false,
    taxonomyTab: sub ?? parent,
    taxonomyParentTab: sub ? parent : undefined,
    children,
  };
}

function partLeaf(
  part: IllustrationPartSpec,
  assetType: VisionTaxonomyAssetType,
  section: EditorVisionTruthSection
): EditorVisionHierarchyNode {
  const placement = resolveUserTaxonomyPlacement(part, assetType);
  return {
    id: `visible_part_${partSlug(part)}`,
    label: translateVisiblePartLabel(part),
    category:
      placement.parent === USER_TAXONOMY_PARENT_CLOTHING
        ? "clothing"
        : placement.parent === USER_TAXONOMY_PARENT_BACKGROUND
          ? "background"
          : "objects",
    partId: `part_${part.key}`,
    bbox: part.bbox,
    editable: part.editable,
    source: part.source,
    truthTier: truthTierForSection(section),
    truthSection: undefined,
    confidence: part.confidence,
    taxonomyTab: placement.sub,
    taxonomyParentTab: placement.parent,
    actionPartGroup: resolveLegacyActionPartGroupFromPart(part, assetType),
    children: [],
  };
}

function buildCategoryGroups(
  parts: IllustrationPartSpec[],
  assetType: VisionTaxonomyAssetType,
  section: EditorVisionTruthSection
): EditorVisionHierarchyNode[] {
  const hasFaceDetail = parts.some((part) => partMatchesFaceDetail(part, FACE_DETAIL_RE));
  const gezichtParts: EditorVisionHierarchyNode[] = [];
  const personageFaceDetail: EditorVisionHierarchyNode[] = [];
  const personageBody: EditorVisionHierarchyNode[] = [];
  const clothing: EditorVisionHierarchyNode[] = [];
  const accessories: EditorVisionHierarchyNode[] = [];
  const pose: EditorVisionHierarchyNode[] = [];
  const background: EditorVisionHierarchyNode[] = [];

  for (const part of parts) {
    const leaf = partLeaf(part, assetType, section);
    const placement = resolveUserTaxonomyPlacement(part, assetType);

    if (placement.parent === USER_TAXONOMY_PARENT_CLOTHING) {
      clothing.push(leaf);
      continue;
    }
    if (placement.parent === USER_TAXONOMY_PARENT_ACCESSORIES) {
      accessories.push(leaf);
      continue;
    }
    if (placement.parent === USER_TAXONOMY_PARENT_POSE || partMatches(part, POSE_LIMB_RE)) {
      pose.push(leaf);
      continue;
    }
    if (placement.parent === USER_TAXONOMY_PARENT_BACKGROUND) {
      background.push(leaf);
      continue;
    }

    if (partMatches(part, HEAD_FACE_RE)) {
      if (hasFaceDetail) {
        gezichtParts.push(leaf);
      } else {
        personageFaceDetail.push(leaf);
      }
      continue;
    }

    if (partMatchesFaceDetail(part, FACE_DETAIL_RE)) {
      personageFaceDetail.push(leaf);
      continue;
    }

    if (partMatches(part, BODY_RE) || placement.sub === "body") {
      personageBody.push(leaf);
      continue;
    }

    personageBody.push(leaf);
  }

  const personageChildren: EditorVisionHierarchyNode[] = [];
  const gezichtGroup = groupContainer(
    `visible_group_gezicht_${section}`,
    USER_TAXONOMY_PARENT_CHARACTER,
    "face",
    gezichtParts
  );
  if (gezichtGroup) {
    personageChildren.push(gezichtGroup);
  }
  personageChildren.push(...personageFaceDetail);
  const bodyGroup = groupContainer(
    `visible_group_lichaam_${section}`,
    USER_TAXONOMY_PARENT_CHARACTER,
    "body",
    personageBody
  );
  if (bodyGroup) {
    personageChildren.push(bodyGroup);
  }

  const roots: EditorVisionHierarchyNode[] = [];
  const personage = groupContainer(
    `visible_group_personage_${section}`,
    USER_TAXONOMY_PARENT_CHARACTER,
    undefined,
    personageChildren
  );
  if (personage) {
    roots.push(personage);
  }

  for (const [parent, id, children] of [
    [USER_TAXONOMY_PARENT_CLOTHING, `visible_group_clothing_${section}`, clothing],
    [USER_TAXONOMY_PARENT_ACCESSORIES, `visible_group_accessories_${section}`, accessories],
    [USER_TAXONOMY_PARENT_POSE, `visible_group_pose_${section}`, pose],
    [USER_TAXONOMY_PARENT_BACKGROUND, `visible_group_background_${section}`, background],
  ] as const) {
    const group = groupContainer(id, parent, undefined, children);
    if (group) {
      roots.push(group);
    }
  }

  return roots;
}

function buildSectionedTree(
  parts: IllustrationPartSpec[],
  assetType: VisionTaxonomyAssetType,
  dropReasons: VisiblePartDropReason[]
): EditorVisionHierarchyNode[] {
  const buckets: Record<EditorVisionTruthSection, IllustrationPartSpec[]> = {
    detected: [],
    estimated: [],
    creative: [],
    debug: [],
  };

  for (const part of parts) {
    const section = classifyPartSection(part, parts, assetType);
    if (section === "drop") {
      dropReasons.push({
        label: part.label,
        reason: isNoisePart(part) ? "noise_label" : "blocked_no_evidence",
      });
      continue;
    }
    buckets[section].push(part);
  }

  const sections: EditorVisionTruthSection[] = ["detected", "estimated", "creative"];
  const roots: EditorVisionHierarchyNode[] = [];

  for (const section of sections) {
    const sectionParts = buckets[section];
    if (sectionParts.length === 0) {
      continue;
    }
    const groups = buildCategoryGroups(sectionParts, assetType, section);
    if (groups.length === 0) {
      continue;
    }
    roots.push({
      id: `visible_section_${section}`,
      label: section,
      category: "objects",
      editable: false,
      truthSection: section,
      children: groups,
    });
  }

  return roots;
}

function collectVisibleLeafLabels(nodes: EditorVisionHierarchyNode[]): string[] {
  const labels: string[] = [];
  const walk = (list: EditorVisionHierarchyNode[]) => {
    for (const node of list) {
      if (node.partId && node.children.length === 0) {
        labels.push(node.label);
      }
      walk(node.children);
    }
  };
  walk(nodes);
  return labels;
}

export function buildVisibleEditorPartsTree(
  input: BuildVisibleEditorPartsTreeInput
): VisibleEditorPartsTreeResult {
  const assetType = input.assetType ?? "unknown";
  const {
    parts: rawParts,
    datasource,
    dropReasons: collectDropReasons,
    rawPartLabels,
  } = collectRawParts(input);
  const dropReasons: VisiblePartDropReason[] = [...collectDropReasons];

  const enriched = enrichPartsWithKeyFeatures(
    rawParts,
    input.keyFeatures,
    input.environmentHints,
    assetType
  );
  const inferred =
    input.analysisTier === "basic"
      ? enriched
      : inferPortraitMissingParts(enriched, assetType);
  const { parts: collapsed, dropReasons: collapseDropReasons } = collapseRedundantBody(inferred);
  dropReasons.push(...collapseDropReasons);

  const mergedAnalysisPartLabels = collapsed.map((part) => part.label);
  const tree = collapsed.length > 0 ? buildSectionedTree(collapsed, assetType, dropReasons) : [];
  const visibleLeafLabels = collectVisibleLeafLabels(tree);

  for (const part of collapsed) {
    const translated = translateVisiblePartLabel(part);
    if (
      !visibleLeafLabels.includes(translated) &&
      !dropReasons.some((row) => row.label === part.label)
    ) {
      dropReasons.push({ label: part.label, reason: "not_mapped_to_visible_leaf" });
    }
  }

  return {
    tree,
    debug: {
      rawPartsCount: collapsed.length,
      visibleTreeNodeCount: countVisionHierarchyNodes(tree),
      datasourceUsed: collapsed.length > 0 ? datasource : "none",
      droppedPartsCount: dropReasons.length,
      droppedPartLabels: dropReasons.map((row) => row.label),
      dropReasons,
      rawPartLabels,
      rawFoundLabels: rawPartLabels,
      mergedAnalysisPartLabels,
      visibleLeafLabels,
    },
  };
}

export function buildVisibleEditorPartsTreeFromDocument(
  document: EditorCanvasDocument
): VisibleEditorPartsTreeResult {
  const meta = document.visionV6Meta;
  const storedParts = meta?.mergedAnalysisParts ?? [];
  const objectParts = storedParts.length === 0 ? extractPartsFromObjectHierarchies(document) : [];
  const mergedAnalysisParts = storedParts.length > 0 ? storedParts : objectParts;
  const visionPartsApiParts = meta?.openAiPartsUsed
    ? mergedAnalysisParts.filter((part) => part.source === "openai_vision")
    : undefined;

  return buildVisibleEditorPartsTree({
    visionPartsApiParts,
    mergedAnalysisParts,
    visionHierarchy: document.visionHierarchy,
    semanticLayers: document.semanticLayers,
    detectedObjects: document.detectedObjects,
    keyFeatures: document.visionAnalysis?.keyFeatures,
    environmentHints: document.visionAnalysis?.environmentHints,
    assetType: meta?.taxonomyType ?? document.visionAnalysis?.objectType ?? "unknown",
    analysisTier: meta?.analysisTier ?? (meta?.openAiPartsUsed ? "premium" : "basic"),
  });
}
