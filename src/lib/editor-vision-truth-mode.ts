/**
 * Vision Truth Mode — strict evidence-based separation of detected vs estimated vs creative.
 * Detected requires visual evidence (bbox/mask); never trusts source label alone.
 */

import {
  groupPartsByUserTaxonomy,
  resolveUserTaxonomyPlacement,
  shouldShowCharacterBodySubGroup,
  userTaxonomyParentOrder,
  userTaxonomySubOrder,
  USER_TAXONOMY_PARENT_CHARACTER,
  type UserTaxonomyParent,
} from "@/lib/editor-vision-user-taxonomy";
import { resolveLegacyActionPartGroupFromPart } from "@/lib/editor-vision-hierarchy-action-mapping";
import {
  coerceIllustrationPartsArray,
  resolvePartTaxonomyTab,
} from "@/lib/editor-vision-accessories-taxonomy";
import {
  HARD_EVIDENCE_BODY_PART_MIN_CONFIDENCE,
  isAccessoryPart,
  requiredAccessoryConfidence,
} from "@/lib/editor-vision-accessory-detection";
import { labelDedupeKey } from "@/lib/editor-taxonomy-shared";
import {
  DETECTED_MIN_CONFIDENCE,
  DETECTED_SMALL_PART_MIN_CONFIDENCE,
  ESTIMATED_MAX_CONFIDENCE,
  ESTIMATED_MIN_CONFIDENCE,
  explainPartDetectionDecision,
  hasValidVisualBbox,
  isEvidenceBackedPart,
  type EditorVisionTruthAssetType,
  type EditorVisionTruthContext,
} from "@/lib/editor-vision-evidence-audit";
import type { IllustrationPartAnalysisResult, IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type {
  EditorVisionHierarchyNode,
  EditorVisionPartSource,
  EditorVisionTruthSection,
  EditorVisionTruthTier,
  EditorCanvasBounds,
} from "@/types/homecheff-visual-editor";

export {
  ACCESSORY_MIN_CONFIDENCE,
  BODY_PART_MIN_CONFIDENCE,
  DETECTED_MIN_CONFIDENCE,
  DETECTED_SMALL_PART_MIN_CONFIDENCE,
  ESTIMATED_MAX_CONFIDENCE,
  ESTIMATED_MIN_CONFIDENCE,
  HARD_EVIDENCE_BODY_PART_MIN_CONFIDENCE,
  SMALL_ACCESSORY_ON_HEAD_MIN_CONFIDENCE,
  hasHardDetectorEvidence,
  hasValidVisualBbox,
  isEvidenceBackedPart,
  type EditorVisionTruthAssetType,
  type EditorVisionTruthContext,
} from "@/lib/editor-vision-evidence-audit";
export {
  ACCESSORIES_TAXONOMY_TAB,
  assignAccessoriesTaxonomyToParts,
  groupPartsByTaxonomyTab,
  normalizeAccessoryCanonicalKey,
  resolvePartTaxonomyTab,
  visionTaxonomyGroupLabelKey,
} from "@/lib/editor-vision-accessories-taxonomy";

export type EditorVisionTruthSections = {
  detected: IllustrationPartSpec[];
  estimated: IllustrationPartSpec[];
  creative: IllustrationPartSpec[];
  debug: IllustrationPartSpec[];
};

/** Hard detector sources — still require valid bbox + confidence thresholds. */
export const VISION_DETECTOR_SOURCES: ReadonlySet<EditorVisionPartSource> = new Set([
  "rtdetr",
  "manual",
]);

export const VISION_OPENAI_SOURCE: EditorVisionPartSource = "openai_vision";

/** @deprecated use tier-specific thresholds below */
export const VISION_DETECTION_CONFIDENCE_THRESHOLD = 0.75;

const DEBUG_LABEL_RE =
  /\b(realistic|cartoon|cinematic|photograph|photo|illustration|vector|flat|safe empty|shadow|outline|style|background surface|main subject|color\b|ocean|continent)\b/i;

/** Standalone color swatches — not concrete parts (but not "Blue shirt"). */
const DEBUG_COLOR_SWATCH_RE =
  /^(white|black|blue|red|green|brown|gray|grey|yellow|orange|purple|pink|beige|navy|teal)$/i;

/** Real visible attributes — higher confidence threshold, but never hidden when evidenced. */
const VISIBLE_ATTRIBUTE_RE =
  /\b(glasses|sunglasses|eyeglasses|spectacles|hat|cap|earring|earrings|necklace|watch|wristwatch|bag|backpack|purse|handbag|phone|smartphone|microphone|mic|headphones|earbuds|beard|moustache|mustache|tattoo|tattoos|collar|leash|tag|harness|bow|bandana|toy|bowl|globe|world|logo|badge)\b/i;

/** Standard visible clothing — normal detected threshold when evidenced. */
const STANDARD_CLOTHING_RE =
  /\b(shirt|t-shirt|tee|blouse|jacket|hoodie|sweater|outfit|blazer|coat|vest|cardigan|dress|skirt|jeans|trousers|pants)\b/i;

/** Often off-crop or taxonomy guesses — require hard detector (RT-DETR/manual) + high confidence. */
const HARD_EVIDENCE_ONLY_RE =
  /\b(tie|necktie|shoe|shoes|sneakers|boot|boots|paw|paws|claw|claws|tail|hand|hands|finger|fingers|feet|foot|umbrella|suitcase|luggage|torso|legs|arms)\b/i;

const NON_ACTIONABLE_DETECTED_RE =
  /\b(main subject|subject|object|character|realistic|photograph|safe empty|shadow|outline|style|background)\b/i;

const HUMAN_ONLY_CLOTHING_RE =
  /\b(tie|necktie|pants|trousers|shirt|jacket|dress|shoes|suit|umbrella|suitcase|blazer|coat|skirt|jeans|sweater|hoodie)\b/i;

/** Animal anatomy labels invalid on humans — not used to block animal accessories. */
const ANIMAL_ANATOMY_ON_HUMAN_RE = /\b(paw|paws|tail|claw|claws|muzzle|whiskers|beak|hoof|hooves)\b/i;

const DEBUG_PART_KEYS = new Set([
  "bg_safe_area",
  "bg_shadow",
  "bg_surface",
  "style_visual",
  "outline",
  "main",
]);

export function isVisionDetectedSource(source: EditorVisionPartSource): boolean {
  return VISION_DETECTOR_SOURCES.has(source) || source === VISION_OPENAI_SOURCE;
}

export function isCreativeCapabilityPart(part: IllustrationPartSpec): boolean {
  if (part.source === "taxonomy_fallback") {
    return true;
  }
  if (part.taxonomyTab === "morph") {
    return true;
  }
  if (part.key.startsWith("morph_")) {
    return true;
  }
  return false;
}

export function isVisibleAttributePart(part: IllustrationPartSpec): boolean {
  const label = part.label.toLowerCase();
  const key = part.key.toLowerCase();
  return (
    VISIBLE_ATTRIBUTE_RE.test(label) ||
    VISIBLE_ATTRIBUTE_RE.test(key) ||
    STANDARD_CLOTHING_RE.test(label) ||
    STANDARD_CLOTHING_RE.test(key)
  );
}

export function isDebugOnlyPart(part: IllustrationPartSpec): boolean {
  if (isVisibleAttributePart(part) && part.group !== "style" && part.group !== "background") {
    return false;
  }
  if (part.group === "style") {
    return true;
  }
  if (part.group === "background") {
    return true;
  }
  if (DEBUG_PART_KEYS.has(part.key)) {
    return true;
  }
  if (part.key.startsWith("style_") || part.key.startsWith("bg_") || part.key.startsWith("color_")) {
    return true;
  }
  if (part.category === "shadow" || part.category === "outline") {
    return true;
  }
  if (DEBUG_COLOR_SWATCH_RE.test(part.label.trim())) {
    return true;
  }
  if (DEBUG_LABEL_RE.test(part.label)) {
    return true;
  }
  return false;
}

export function isConcreteEditableVisualPart(part: IllustrationPartSpec): boolean {
  if (!part.editable) {
    return false;
  }
  if (isVisibleAttributePart(part)) {
    return true;
  }
  if (part.key === "body" && NON_ACTIONABLE_DETECTED_RE.test(part.label)) {
    return false;
  }
  if (NON_ACTIONABLE_DETECTED_RE.test(part.label) && part.confidence < DETECTED_MIN_CONFIDENCE) {
    return false;
  }
  return true;
}

export function requiredDetectedConfidence(
  part: IllustrationPartSpec,
  allParts: IllustrationPartSpec[] = [],
  context?: EditorVisionTruthContext
): number {
  if (isAccessoryPart(part, context?.assetType)) {
    return requiredAccessoryConfidence(part, allParts);
  }
  const label = part.label.toLowerCase();
  const key = part.key.toLowerCase();
  if (HARD_EVIDENCE_ONLY_RE.test(label) || HARD_EVIDENCE_ONLY_RE.test(key)) {
    return HARD_EVIDENCE_BODY_PART_MIN_CONFIDENCE;
  }
  return DETECTED_MIN_CONFIDENCE;
}

export function requiresHardDetectorForDetected(part: IllustrationPartSpec): boolean {
  const label = part.label.toLowerCase();
  const key = part.key.toLowerCase();
  return HARD_EVIDENCE_ONLY_RE.test(label) || HARD_EVIDENCE_ONLY_RE.test(key);
}

export function isAssetCompatiblePart(
  part: IllustrationPartSpec,
  assetType: EditorVisionTruthAssetType = "unknown"
): boolean {
  const label = part.label.toLowerCase();
  const key = part.key.toLowerCase();

  if (assetType === "animal") {
    if (HUMAN_ONLY_CLOTHING_RE.test(label) || HUMAN_ONLY_CLOTHING_RE.test(key)) {
      return false;
    }
    if (/\b(arms|hands|legs|feet)\b/.test(label) && !/\b(front|left|right)\b/.test(label)) {
      return false;
    }
  }

  if (assetType === "human") {
    if (ANIMAL_ANATOMY_ON_HUMAN_RE.test(label) || ANIMAL_ANATOMY_ON_HUMAN_RE.test(key)) {
      return false;
    }
  }

  return true;
}

export function hasSoftVisionEvidence(part: IllustrationPartSpec): boolean {
  if (!hasValidVisualBbox(part.bbox) && !part.mask && !part.polygon?.length) {
    return false;
  }
  return part.source === VISION_OPENAI_SOURCE;
}

export function qualifiesForDetectedTier(
  part: IllustrationPartSpec,
  context?: EditorVisionTruthContext & { allParts?: IllustrationPartSpec[] }
): boolean {
  if (isCreativeCapabilityPart(part) || isDebugOnlyPart(part)) {
    return false;
  }
  if (!isConcreteEditableVisualPart(part)) {
    return false;
  }
  if (!isAssetCompatiblePart(part, context?.assetType)) {
    return false;
  }
  if (!isEvidenceBackedPart(part, context)) {
    return false;
  }

  const allParts = context?.allParts ?? [];
  const minConf = requiredDetectedConfidence(part, allParts, context);
  if (part.confidence < minConf) {
    return false;
  }

  return true;
}

export function classifyPartTruthTier(
  part: IllustrationPartSpec,
  context?: EditorVisionTruthContext & { allParts?: IllustrationPartSpec[] }
): EditorVisionTruthTier {
  if (isCreativeCapabilityPart(part)) {
    return "creative";
  }
  if (isDebugOnlyPart(part)) {
    return "debug";
  }
  if (qualifiesForDetectedTier(part, context)) {
    return "vision";
  }

  if (part.source === "estimated" || part.confidence <= ESTIMATED_MAX_CONFIDENCE) {
    if (part.confidence >= ESTIMATED_MIN_CONFIDENCE) {
      return "estimated";
    }
    return "debug";
  }

  if (isVisionDetectedSource(part.source) && !hasValidVisualBbox(part.bbox)) {
    return "estimated";
  }

  if (part.confidence < ESTIMATED_MIN_CONFIDENCE) {
    return "debug";
  }

  return "estimated";
}

function partEvidenceScore(part: IllustrationPartSpec, tier: EditorVisionTruthTier): number {
  let score = part.confidence;
  if (tier === "vision") {
    score += 10;
  }
  if (part.source === "rtdetr") {
    score += 5;
  }
  if (hasValidVisualBbox(part.bbox)) {
    score += 2;
  }
  return score;
}

/** Keep the strongest evidence per label within each tier bucket. */
export function dedupeTruthParts(parts: IllustrationPartSpec[], tier: EditorVisionTruthTier): IllustrationPartSpec[] {
  const byLabel = new Map<string, IllustrationPartSpec>();
  for (const part of parts) {
    const key = labelDedupeKey(part.label);
    const existing = byLabel.get(key);
    if (!existing || partEvidenceScore(part, tier) > partEvidenceScore(existing, tier)) {
      byLabel.set(key, part);
    }
  }
  return [...byLabel.values()];
}

export function splitPartsIntoTruthSections(
  parts: IllustrationPartSpec[],
  creativeCapabilities: IllustrationPartSpec[] = [],
  context?: EditorVisionTruthContext
): EditorVisionTruthSections {
  const enriched = { ...context, allParts: parts };
  const detected: IllustrationPartSpec[] = [];
  const estimated: IllustrationPartSpec[] = [];
  const creative: IllustrationPartSpec[] = [...creativeCapabilities];
  const debug: IllustrationPartSpec[] = [];

  for (const part of parts) {
    const tier = classifyPartTruthTier(part, enriched);
    if (tier === "vision") {
      detected.push(part);
    } else if (tier === "estimated") {
      estimated.push(part);
    } else if (tier === "creative") {
      creative.push(part);
    } else {
      debug.push(part);
    }
  }

  return {
    detected: dedupeTruthParts(detected, "vision"),
    estimated: dedupeTruthParts(estimated, "estimated"),
    creative: dedupeTruthParts(creative, "creative"),
    debug: dedupeTruthParts(debug, "debug"),
  };
}

export function splitAnalysisIntoTruthSections(
  analysis: IllustrationPartAnalysisResult,
  context?: EditorVisionTruthContext
): EditorVisionTruthSections {
  return splitPartsIntoTruthSections(
    coerceIllustrationPartsArray(analysis.parts),
    analysis.creativeCapabilities ?? [],
    context
  );
}

export function detectedPartLabels(
  analysis: IllustrationPartAnalysisResult,
  context?: EditorVisionTruthContext
): string[] {
  return splitAnalysisIntoTruthSections(analysis, context).detected.filter((p) => p.editable).map((p) => p.label);
}

export function truthTierToHierarchySource(tier: EditorVisionTruthTier): EditorVisionPartSource {
  switch (tier) {
    case "vision":
      return "openai_vision";
    case "estimated":
      return "estimated";
    case "creative":
      return "creative";
    case "debug":
      return "estimated";
  }
}

function hierarchyNode(
  input: Omit<EditorVisionHierarchyNode, "children"> & { children?: EditorVisionHierarchyNode[] }
): EditorVisionHierarchyNode {
  return { ...input, children: input.children ?? [] };
}

function bboxDedupeSuffix(bbox?: EditorCanvasBounds): string {
  if (!bbox || bbox.width <= 0 || bbox.height <= 0) {
    return "";
  }
  return `@${bbox.x.toFixed(4)}:${bbox.y.toFixed(4)}:${bbox.width.toFixed(4)}:${bbox.height.toFixed(4)}`;
}

/** Stable dedupe key for part nodes within a taxonomy group. */
export function hierarchyPartDedupeKey(node: EditorVisionHierarchyNode): string {
  if (node.partId?.trim()) {
    return node.partId;
  }
  return `${labelDedupeKey(node.label)}${bboxDedupeSuffix(node.bbox)}`;
}

function partEvidenceFromNode(node: EditorVisionHierarchyNode): number {
  let score = node.confidence ?? 0;
  if (node.source === "rtdetr") {
    score += 5;
  }
  if (node.bbox && hasValidVisualBbox(node.bbox)) {
    score += 2;
  }
  return score;
}

/** Merge duplicate part leaves inside the same taxonomy group. */
export function dedupeHierarchyPartChildren(
  children: EditorVisionHierarchyNode[]
): EditorVisionHierarchyNode[] {
  const byKey = new Map<string, EditorVisionHierarchyNode>();
  for (const child of children) {
    const key = hierarchyPartDedupeKey(child);
    const existing = byKey.get(key);
    if (!existing || partEvidenceFromNode(child) > partEvidenceFromNode(existing)) {
      byKey.set(key, child);
    }
  }
  return [...byKey.values()];
}

export function visionTruthGroupId(
  section: EditorVisionTruthSection,
  tier: EditorVisionTruthTier,
  taxonomyTab: string,
  index = 0
): string {
  const base = `truth_${section}_${tier}_${taxonomyTab}`;
  return index > 0 ? `${base}_${index}` : base;
}

function visionTruthGroupMergeKey(
  section: EditorVisionTruthSection,
  tier: EditorVisionTruthTier,
  taxonomyTab: string
): string {
  return `${section}::${tier}::${taxonomyTab}`;
}

function visionTruthSubGroupId(
  section: EditorVisionTruthSection,
  tier: EditorVisionTruthTier,
  parent: string,
  sub: string
): string {
  return visionTruthGroupId(section, tier, `${parent}_${sub}`);
}

function visionTruthSubGroupMergeKey(
  section: EditorVisionTruthSection,
  tier: EditorVisionTruthTier,
  parent: string,
  sub: string
): string {
  return `${section}::${tier}::${parent}::${sub}`;
}

function mergeSubTaxonomyGroupNodes(
  section: EditorVisionTruthSection,
  tier: EditorVisionTruthTier,
  parent: UserTaxonomyParent,
  groups: EditorVisionHierarchyNode[]
): EditorVisionHierarchyNode[] {
  const merged = new Map<string, EditorVisionHierarchyNode>();
  const order: string[] = [];

  for (const group of groups) {
    const sub = group.taxonomyTab ?? group.label;
    const key = visionTruthSubGroupMergeKey(section, tier, parent, sub);
    const existing = merged.get(key);
    if (existing) {
      existing.children = dedupeHierarchyPartChildren([...existing.children, ...group.children]);
      continue;
    }
    const normalized = hierarchyNode({
      ...group,
      id: visionTruthSubGroupId(section, tier, parent, sub),
      taxonomyTab: sub,
      taxonomyParentTab: parent,
      children: dedupeHierarchyPartChildren(group.children),
    });
    merged.set(key, normalized);
    order.push(key);
  }

  return order.map((key) => merged.get(key)!);
}

function userTaxonomySubGroupNode(
  parent: UserTaxonomyParent,
  sub: string,
  tier: EditorVisionTruthTier,
  section: EditorVisionTruthSection,
  parts: IllustrationPartSpec[],
  keyToLayerId: Map<string, string>,
  objectId?: string,
  context?: EditorVisionTruthContext & { allParts?: IllustrationPartSpec[] }
): EditorVisionHierarchyNode | null {
  if (parts.length === 0) {
    return null;
  }

  return hierarchyNode({
    id: visionTruthSubGroupId(section, tier, parent, sub),
    label: sub,
    category: "objects",
    editable: false,
    source: truthTierToHierarchySource(tier),
    truthTier: tier,
    taxonomyTab: sub,
    taxonomyParentTab: parent,
    children: dedupeHierarchyPartChildren(
      parts.map((p) => partToHierarchyNode(p, tier, keyToLayerId, objectId, context))
    ),
  });
}

function buildCharacterParentChildren(
  subMap: Map<string, IllustrationPartSpec[]>,
  tier: EditorVisionTruthTier,
  section: EditorVisionTruthSection,
  keyToLayerId: Map<string, string>,
  objectId?: string,
  context?: EditorVisionTruthContext & { allParts?: IllustrationPartSpec[] }
): EditorVisionHierarchyNode[] {
  const showBodySub = shouldShowCharacterBodySubGroup(subMap);
  const bodyParts = subMap.get("body") ?? [];
  const subGroups: EditorVisionHierarchyNode[] = [];

  for (const sub of userTaxonomySubOrder(USER_TAXONOMY_PARENT_CHARACTER)) {
    if (sub === "body") {
      if (showBodySub) {
        const group = userTaxonomySubGroupNode(
          USER_TAXONOMY_PARENT_CHARACTER,
          "body",
          tier,
          section,
          bodyParts,
          keyToLayerId,
          objectId,
          context
        );
        if (group) {
          subGroups.push(group);
        }
      }
      continue;
    }
    const subParts = subMap.get(sub) ?? [];
    const group = userTaxonomySubGroupNode(
      USER_TAXONOMY_PARENT_CHARACTER,
      sub,
      tier,
      section,
      subParts,
      keyToLayerId,
      objectId,
      context
    );
    if (group) {
      subGroups.push(group);
    }
  }

  const directBodyParts =
    !showBodySub && bodyParts.length > 0
      ? dedupeHierarchyPartChildren(
          bodyParts.map((p) => partToHierarchyNode(p, tier, keyToLayerId, objectId, context))
        )
      : [];

  return [...mergeSubTaxonomyGroupNodes(section, tier, USER_TAXONOMY_PARENT_CHARACTER, subGroups), ...directBodyParts];
}

function buildGenericParentChildren(
  parent: UserTaxonomyParent,
  subMap: Map<string, IllustrationPartSpec[]>,
  tier: EditorVisionTruthTier,
  section: EditorVisionTruthSection,
  keyToLayerId: Map<string, string>,
  objectId?: string,
  context?: EditorVisionTruthContext & { allParts?: IllustrationPartSpec[] }
): EditorVisionHierarchyNode[] {
  const subGroups: EditorVisionHierarchyNode[] = [];

  for (const sub of userTaxonomySubOrder(parent)) {
    const subParts = subMap.get(sub) ?? [];
    const group = userTaxonomySubGroupNode(
      parent,
      sub,
      tier,
      section,
      subParts,
      keyToLayerId,
      objectId,
      context
    );
    if (group) {
      subGroups.push(group);
    }
  }

  return mergeSubTaxonomyGroupNodes(section, tier, parent, subGroups);
}

function userTaxonomyParentNode(
  parent: UserTaxonomyParent,
  subMap: Map<string, IllustrationPartSpec[]>,
  tier: EditorVisionTruthTier,
  section: EditorVisionTruthSection,
  keyToLayerId: Map<string, string>,
  objectId?: string,
  context?: EditorVisionTruthContext & { allParts?: IllustrationPartSpec[] }
): EditorVisionHierarchyNode | null {
  const children =
    parent === USER_TAXONOMY_PARENT_CHARACTER
      ? buildCharacterParentChildren(subMap, tier, section, keyToLayerId, objectId, context)
      : buildGenericParentChildren(parent, subMap, tier, section, keyToLayerId, objectId, context);

  if (children.length === 0) {
    return null;
  }

  return hierarchyNode({
    id: visionTruthGroupId(section, tier, parent),
    label: parent,
    category: "objects",
    editable: false,
    source: truthTierToHierarchySource(tier),
    truthTier: tier,
    taxonomyTab: parent,
    children,
  });
}

function mergeParentTaxonomyGroupNodes(
  section: EditorVisionTruthSection,
  tier: EditorVisionTruthTier,
  groups: EditorVisionHierarchyNode[]
): EditorVisionHierarchyNode[] {
  const merged = new Map<string, EditorVisionHierarchyNode>();
  const order: string[] = [];

  for (const group of groups) {
    const parent = group.taxonomyTab ?? group.label;
    const key = visionTruthGroupMergeKey(section, tier, parent);
    const existing = merged.get(key);
    if (existing) {
      existing.children = mergeSubTaxonomyGroupNodes(
        section,
        tier,
        parent as UserTaxonomyParent,
        [...existing.children.filter((c) => !c.partId), ...group.children.filter((c) => !c.partId)]
      ).concat(
        dedupeHierarchyPartChildren([
          ...existing.children.filter((c) => Boolean(c.partId)),
          ...group.children.filter((c) => Boolean(c.partId)),
        ])
      );
      continue;
    }
    const subGroups = group.children.filter((c) => !c.partId);
    const partLeaves = group.children.filter((c) => Boolean(c.partId));
    const normalized = hierarchyNode({
      ...group,
      id: visionTruthGroupId(section, tier, parent),
      taxonomyTab: parent,
      children: [
        ...mergeSubTaxonomyGroupNodes(section, tier, parent as UserTaxonomyParent, subGroups),
        ...dedupeHierarchyPartChildren(partLeaves),
      ],
    });
    merged.set(key, normalized);
    order.push(key);
  }

  return order.map((key) => merged.get(key)!);
}

/** Collapse duplicate taxonomy groups and dedupe part leaves before render/persist. */
export function normalizeVisionHierarchyGroups(
  hierarchy: EditorVisionHierarchyNode[]
): EditorVisionHierarchyNode[] {
  return hierarchy.map((sectionNode) => {
    if (!sectionNode.truthSection) {
      return sectionNode;
    }
    const section = sectionNode.truthSection;
    const tier = sectionNode.truthTier ?? "estimated";
    const flatParts = sectionNode.children.filter((child) => Boolean(child.partId));
    const parentGroups = sectionNode.children.filter((child) => !child.partId);
    const mergedGroups = mergeParentTaxonomyGroupNodes(section, tier, parentGroups);
    return hierarchyNode({
      ...sectionNode,
      children: [...mergedGroups, ...dedupeHierarchyPartChildren(flatParts)],
    });
  });
}

/** Collect all node ids — for tests asserting React key uniqueness. */
export function collectVisionHierarchyNodeIds(nodes: EditorVisionHierarchyNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: EditorVisionHierarchyNode[]) => {
    for (const node of list) {
      ids.push(node.id);
      walk(node.children);
    }
  };
  walk(nodes);
  return ids;
}

function partToHierarchyNode(
  part: IllustrationPartSpec,
  tier: EditorVisionTruthTier,
  keyToLayerId: Map<string, string>,
  objectId?: string,
  context?: EditorVisionTruthContext & { allParts?: IllustrationPartSpec[] }
): EditorVisionHierarchyNode {
  const layerId = keyToLayerId.get(part.key);
  const groupCategory =
    part.group === "style" ? "style" : part.group === "background" ? "background" : "objects";
  const taxonomyTab = resolvePartTaxonomyTab(part, context?.assetType);
  const placement = resolveUserTaxonomyPlacement(part, context?.assetType);
  const actionPartGroup = resolveLegacyActionPartGroupFromPart(part, context?.assetType);

  return hierarchyNode({
    id: `truth_${tier}_${part.key}`,
    label: part.label,
    category: groupCategory,
    partId: `part_${part.key}`,
    objectId,
    layerId,
    bbox: part.bbox,
    editable: part.editable,
    estimated: tier === "estimated" || tier === "debug",
    source: truthTierToHierarchySource(tier),
    truthTier: tier,
    confidence: part.confidence,
    taxonomyTab,
    taxonomyParentTab: placement.parent,
    actionPartGroup,
    detectionExplanation: explainPartDetectionDecision(part, context),
    children: [],
  });
}

function buildSectionChildren(
  parts: IllustrationPartSpec[],
  tier: EditorVisionTruthTier,
  section: EditorVisionTruthSection,
  keyToLayerId: Map<string, string>,
  objectId?: string,
  context?: EditorVisionTruthContext & { allParts?: IllustrationPartSpec[] }
): EditorVisionHierarchyNode[] {
  if (tier === "debug") {
    return dedupeHierarchyPartChildren(
      parts.map((p) => partToHierarchyNode(p, tier, keyToLayerId, objectId, context))
    );
  }

  const assetType = context?.assetType ?? "unknown";
  const grouped = groupPartsByUserTaxonomy(parts, assetType);
  const parentNodes: EditorVisionHierarchyNode[] = [];

  for (const parent of userTaxonomyParentOrder()) {
    const subMap = grouped.get(parent);
    if (!subMap || subMap.size === 0) {
      continue;
    }
    const parentNode = userTaxonomyParentNode(
      parent,
      subMap,
      tier,
      section,
      keyToLayerId,
      objectId,
      context
    );
    if (parentNode) {
      parentNodes.push(parentNode);
    }
  }

  return mergeParentTaxonomyGroupNodes(section, tier, parentNodes);
}

function truthSectionNode(
  section: EditorVisionTruthSection,
  tier: EditorVisionTruthTier,
  sectionLabel: string,
  parts: IllustrationPartSpec[],
  keyToLayerId: Map<string, string>,
  objectId?: string,
  context?: EditorVisionTruthContext
): EditorVisionHierarchyNode | null {
  const children = buildSectionChildren(parts, tier, section, keyToLayerId, objectId, context);
  if (children.length === 0) {
    return null;
  }

  return hierarchyNode({
    id: `truth_section_${section}`,
    label: sectionLabel,
    category: "objects",
    editable: false,
    source: truthTierToHierarchySource(tier),
    truthSection: section,
    truthTier: tier,
    children,
  });
}

/** Build truth hierarchy (Detected / Estimated / Creative / Debug). */
export function buildEditorVisionTruthHierarchy(input: {
  analysis: IllustrationPartAnalysisResult;
  semanticLayerIds?: Map<string, string>;
  characterObjectId?: string;
  assetType?: EditorVisionTruthAssetType;
  sectionLabels: {
    detected: string;
    estimated: string;
    creative: string;
    debug: string;
  };
  includeDebugSection?: boolean;
}): EditorVisionHierarchyNode[] {
  const context: EditorVisionTruthContext & { allParts: IllustrationPartSpec[] } = {
    assetType: input.assetType,
    allParts: input.analysis.parts,
  };
  const sections = splitAnalysisIntoTruthSections(input.analysis, context);
  const keyToLayerId = input.semanticLayerIds ?? new Map<string, string>();

  const tree: EditorVisionHierarchyNode[] = [];

  const detected = truthSectionNode(
    "detected",
    "vision",
    input.sectionLabels.detected,
    sections.detected,
    keyToLayerId,
    input.characterObjectId,
    context
  );
  if (detected) {
    tree.push(detected);
  }

  const estimated = truthSectionNode(
    "estimated",
    "estimated",
    input.sectionLabels.estimated,
    sections.estimated,
    keyToLayerId,
    input.characterObjectId,
    context
  );
  if (estimated) {
    tree.push(estimated);
  }

  const creative = truthSectionNode(
    "creative",
    "creative",
    input.sectionLabels.creative,
    sections.creative,
    keyToLayerId,
    input.characterObjectId,
    context
  );
  if (creative) {
    tree.push(creative);
  }

  if (input.includeDebugSection !== false && sections.debug.length > 0) {
    const debug = truthSectionNode(
      "debug",
      "debug",
      input.sectionLabels.debug,
      sections.debug,
      keyToLayerId,
      input.characterObjectId,
      context
    );
    if (debug) {
      tree.push(debug);
    }
  }

  return normalizeVisionHierarchyGroups(tree);
}

/** Filter hierarchy for normal users — hides debug section. */
export function filterVisionTruthHierarchyForUser(
  hierarchy: EditorVisionHierarchyNode[],
  showDebug: boolean
): EditorVisionHierarchyNode[] {
  if (showDebug) {
    return hierarchy;
  }
  return hierarchy.filter((node) => node.truthSection !== "debug");
}
