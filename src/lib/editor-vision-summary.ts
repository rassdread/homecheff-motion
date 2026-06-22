import type { TranslationKey } from "@/i18n";
import { resolveHumanFirstObjectType } from "@/lib/editor-ux-cleanup";
import { isMeaningfulVisionHierarchy } from "@/lib/editor-vision-v6-stability";
import type { EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

const MAX_DETECTED_ITEMS = 6;
const MAX_ESTIMATED_ITEMS = 4;

const SUMMARY_VISIBLE_ATTRIBUTE_RE =
  /\b(glasses|sunglasses|eyeglasses|spectacles|hat|cap|earring|earrings|necklace|watch|collar|leash|tag|harness|bow|bandana|logo|badge|globe|world)\b/i;

const SUMMARY_HEAD_FACE_RE = /\b(head|face|hair|eyes|mouth|nose|ears|fur|muzzle|snout|beak)\b/i;

const SUMMARY_CLOTHING_RE =
  /\b(shirt|t-shirt|tee|blouse|jacket|hoodie|sweater|outfit|blazer|coat|vest|cardigan|dress|skirt|jeans|trousers|pants)\b/i;

const SUMMARY_LOWER_PRIORITY_ATTRIBUTE_RE = /\b(beard|moustache|mustache)\b/i;

const SUGGESTED_ACTION_KEYS: TranslationKey[] = [
  "editor.visionSummary.action.removeBackground",
  "editor.visionSummary.action.detachObject",
  "editor.visionSummary.action.selectGlobe",
  "editor.visionSummary.action.replaceLogo",
  "editor.visionSummary.action.export",
];

/** Style, color swatches, template noise — never in user summary. */
const SUMMARY_DEBUG_LABEL_RE =
  /\b(realistic|cartoon|cinematic|photograph|photo|illustration|vector|flat|safe empty|shadow|outline|style|background surface|main subject|color\b|ocean|continent|white background|blue ocean|green continent)\b/i;

const SUMMARY_COLOR_SWATCH_RE =
  /^(white|black|blue|red|green|brown|gray|grey|yellow|orange|purple|pink|beige|navy|teal)$/i;

/** Generic roots — not concrete detected parts. */
const SUMMARY_GENERIC_ROOT_RE =
  /^(mascot|character|personage|person|subject|main subject|object|image|brand sheet)$/i;

/**
 * Template-inferred props/accessories — only allowed in Detected (evidence-backed).
 * Estimated section must not surface these.
 */
const SUMMARY_LEGACY_INFERENCE_RE =
  /\b(globe|world|wereldbol|planet|mascot|personage|character|person|tie|necktie|pants|trousers|shoes|sneakers|boot|boots|jacket|suitcase|luggage|umbrella|arms|hands|paws|tail|claws|logo)\b/i;

/** Estimated tier may only show coarse anatomy — not props/clothing guesses. */
const SUMMARY_ESTIMATED_ALLOWED_RE =
  /\b(body|torso|face|head|hair|eyes|ears|mouth|nose|fur|collar|muzzle|snout|beak|legs|feet|paw|paws|tail|whiskers|beard|moustache|mustache)\b/i;

export type EditorVisionSummary = {
  detectedLabels: string[];
  estimatedLabels: string[];
  actionKeys: TranslationKey[];
  lowConfidence: boolean;
  /** True when summary is driven by Vision Truth Mode hierarchy. */
  hasTruthSource: boolean;
};

export type EditorVisionSummaryLegacyDebug = {
  itemKeys: TranslationKey[];
};

const TYPE_ITEM_KEYS: Record<string, TranslationKey> = {
  character: "editor.visionSummary.item.character",
  globe: "editor.visionSummary.item.globe",
  logo: "editor.visionSummary.item.logo",
  text: "editor.visionSummary.item.text",
  background: "editor.visionSummary.item.background",
  object: "editor.visionSummary.item.object",
};

function normalizeSummaryLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

function isSummaryDebugLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) {
    return true;
  }
  if (SUMMARY_COLOR_SWATCH_RE.test(trimmed)) {
    return true;
  }
  return SUMMARY_DEBUG_LABEL_RE.test(trimmed);
}

function isSummaryPartNode(node: EditorVisionHierarchyNode): boolean {
  return Boolean(node.partId) && node.editable !== false;
}

function isSummaryEligibleDetectedNode(node: EditorVisionHierarchyNode): boolean {
  if (!isSummaryPartNode(node)) {
    return false;
  }
  if (node.category === "style" || node.category === "background") {
    return false;
  }
  if (node.truthTier !== "vision") {
    return false;
  }
  const label = normalizeSummaryLabel(node.label);
  if (SUMMARY_GENERIC_ROOT_RE.test(label.toLowerCase())) {
    return false;
  }
  if (isSummaryDebugLabel(label)) {
    return false;
  }
  return true;
}

function isSummaryEligibleEstimatedNode(node: EditorVisionHierarchyNode): boolean {
  if (!isSummaryPartNode(node)) {
    return false;
  }
  if (node.category === "style" || node.category === "background") {
    return false;
  }
  if (node.truthTier !== "estimated") {
    return false;
  }
  const label = normalizeSummaryLabel(node.label);
  const lower = label.toLowerCase();
  if (SUMMARY_GENERIC_ROOT_RE.test(lower)) {
    return false;
  }
  if (isSummaryDebugLabel(label)) {
    return false;
  }
  if (SUMMARY_LEGACY_INFERENCE_RE.test(lower)) {
    return false;
  }
  return SUMMARY_ESTIMATED_ALLOWED_RE.test(lower);
}

function truthSectionNodes(
  hierarchy: EditorVisionHierarchyNode[],
  section: "detected" | "estimated"
): EditorVisionHierarchyNode[] {
  const sectionNode = hierarchy.find((node) => node.truthSection === section);
  const direct = sectionNode?.children ?? [];

  function flattenPartNodes(nodes: EditorVisionHierarchyNode[]): EditorVisionHierarchyNode[] {
    const out: EditorVisionHierarchyNode[] = [];
    for (const node of nodes) {
      if (node.partId) {
        out.push(node);
      }
      if (node.children.length > 0) {
        out.push(...flattenPartNodes(node.children));
      }
    }
    return out;
  }

  return flattenPartNodes(direct);
}

function summaryLabelPriority(label: string): number {
  const lower = label.toLowerCase();
  if (SUMMARY_VISIBLE_ATTRIBUTE_RE.test(lower)) {
    return 0;
  }
  if (SUMMARY_HEAD_FACE_RE.test(lower)) {
    return 1;
  }
  if (SUMMARY_CLOTHING_RE.test(lower)) {
    return 2;
  }
  if (SUMMARY_LOWER_PRIORITY_ATTRIBUTE_RE.test(lower)) {
    return 3;
  }
  return 4;
}

function sortSummaryLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => {
    const priorityDiff = summaryLabelPriority(a) - summaryLabelPriority(b);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.localeCompare(b);
  });
}

function dedupeLabels(labels: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of sortSummaryLabels(labels)) {
    const key = label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(label);
    if (out.length >= limit) {
      break;
    }
  }
  return out;
}

export function extractTruthSummaryLabels(hierarchy: EditorVisionHierarchyNode[]): {
  detectedLabels: string[];
  estimatedLabels: string[];
} {
  const detectedRaw = truthSectionNodes(hierarchy, "detected")
    .filter(isSummaryEligibleDetectedNode)
    .map((node) => normalizeSummaryLabel(node.label));

  const estimatedRaw = truthSectionNodes(hierarchy, "estimated")
    .filter(isSummaryEligibleEstimatedNode)
    .map((node) => normalizeSummaryLabel(node.label));

  return {
    detectedLabels: dedupeLabels(detectedRaw, MAX_DETECTED_ITEMS),
    estimatedLabels: dedupeLabels(estimatedRaw, MAX_ESTIMATED_ITEMS),
  };
}

function resolveSummaryActionKeys(detectedLabels: string[]): TranslationKey[] {
  const lower = detectedLabels.map((l) => l.toLowerCase());
  const actions = [...SUGGESTED_ACTION_KEYS];

  if (!lower.some((l) => /\b(globe|world|wereldbol|planet)\b/.test(l))) {
    const idx = actions.indexOf("editor.visionSummary.action.selectGlobe");
    if (idx >= 0) {
      actions.splice(idx, 1);
    }
  }
  if (!lower.some((l) => /\b(logo|text|tekst)\b/.test(l))) {
    const idx = actions.indexOf("editor.visionSummary.action.replaceLogo");
    if (idx >= 0) {
      actions.splice(idx, 1);
    }
  }
  return actions;
}

function resolveLowConfidence(
  document: EditorCanvasDocument,
  detectedLabels: string[],
  hasTruthSource: boolean
): boolean {
  if (!hasTruthSource) {
    return true;
  }
  const trustScore = document.visionV6Meta?.evidenceAudit?.visionTrustScore;
  if (typeof trustScore === "number" && trustScore < 70) {
    return true;
  }
  if (detectedLabels.length === 0) {
    return true;
  }
  return Boolean(document.detectionMeta?.userMessageKey);
}

export function buildEditorVisionSummary(document: EditorCanvasDocument): EditorVisionSummary {
  const hierarchy = document.visionHierarchy ?? [];
  const hasTruthSource = isMeaningfulVisionHierarchy(hierarchy, document.visionV6Meta);

  if (!hasTruthSource) {
    return {
      detectedLabels: [],
      estimatedLabels: [],
      actionKeys: resolveSummaryActionKeys([]),
      lowConfidence: true,
      hasTruthSource: false,
    };
  }

  const { detectedLabels, estimatedLabels } = extractTruthSummaryLabels(hierarchy);

  return {
    detectedLabels,
    estimatedLabels,
    actionKeys: resolveSummaryActionKeys(detectedLabels),
    lowConfidence: resolveLowConfidence(document, detectedLabels, true),
    hasTruthSource: true,
  };
}

/** Admin/debug only — legacy object-layer heuristics (not trusted user truth). */
export function buildEditorVisionSummaryLegacyDebug(
  document: EditorCanvasDocument
): EditorVisionSummaryLegacyDebug {
  const seen = new Set<string>();
  const itemKeys: TranslationKey[] = [];

  for (const layer of document.objects) {
    if (layer.layerType === "background") {
      const key = TYPE_ITEM_KEYS.background;
      if (!seen.has(key)) {
        seen.add(key);
        itemKeys.push(key);
      }
      continue;
    }
    const humanType = resolveHumanFirstObjectType(layer);
    const key = TYPE_ITEM_KEYS[humanType] ?? TYPE_ITEM_KEYS.object;
    if (!seen.has(key)) {
      seen.add(key);
      itemKeys.push(key);
    }
  }

  if (itemKeys.length === 0) {
    itemKeys.push(TYPE_ITEM_KEYS.object);
  }

  return { itemKeys };
}
