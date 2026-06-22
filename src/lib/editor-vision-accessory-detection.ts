/**
 * Accessory Detection Layer — dedicated evidence rules for visible accessories.
 * Accessories use lower confidence thresholds than body parts and never share
 * the hard-evidence-only rules applied to pants/shoes/tie.
 */

import { ACCESSORIES_TAXONOMY_TAB } from "@/lib/editor-vision-accessories-taxonomy";
import { ZERO_TAXONOMY_BBOX } from "@/lib/editor-taxonomy-shared";
import type {
  IllustrationPartAnalysisResult,
  IllustrationPartSpec,
} from "@/types/editor-illustration-parts";
import type { EditorVisionPartSource } from "@/types/homecheff-visual-editor";
import type { AssetVisionAnalysis, AssetVisionObjectType } from "@/types/studio-asset-vision-analysis";
import type { EditorCanvasBounds } from "@/types/homecheff-visual-editor";

function hasValidVisualBbox(bbox: EditorCanvasBounds | undefined): boolean {
  if (!bbox) {
    return false;
  }
  if (bbox.width <= 0 || bbox.height <= 0) {
    return false;
  }
  if (bbox.x === ZERO_TAXONOMY_BBOX.x && bbox.y === ZERO_TAXONOMY_BBOX.y && bbox.width === 0) {
    return false;
  }
  if (bbox.width >= 0.97 && bbox.height >= 0.97) {
    return false;
  }
  return true;
}

export type AccessoryAssetType = AssetVisionObjectType | "unknown";

export const BODY_PART_MIN_CONFIDENCE = 0.75;
export const ACCESSORY_MIN_CONFIDENCE = 0.65;
export const SMALL_ACCESSORY_ON_HEAD_MIN_CONFIDENCE = 0.6;
/** Tie/shoes/pants and similar off-crop body parts — hard detector + high confidence. */
export const HARD_EVIDENCE_BODY_PART_MIN_CONFIDENCE = 0.85;

export const HUMAN_ACCESSORIES = [
  "glasses",
  "sunglasses",
  "hat",
  "cap",
  "helmet",
  "earrings",
  "earring",
  "necklace",
  "watch",
  "bracelet",
  "ring",
  "backpack",
  "bag",
  "headphones",
] as const;

export const ANIMAL_ACCESSORIES = [
  "collar",
  "leash",
  "harness",
  "tag",
  "bandana",
  "bow",
] as const;

export const MASCOT_ACCESSORIES = [
  "globe",
  "hat",
  "badge",
  "tool",
  "prop",
  "logo",
] as const;

/** Accessories small enough to sit on/near the head — eligible for the lowest threshold. */
export const SMALL_HEAD_ATTACHED_ACCESSORIES = [
  "glasses",
  "sunglasses",
  "eyeglasses",
  "spectacles",
  "hat",
  "cap",
  "helmet",
  "earring",
  "earrings",
  "headphones",
  "earbuds",
] as const;

export type HumanAccessory = (typeof HUMAN_ACCESSORIES)[number];
export type AnimalAccessory = (typeof ANIMAL_ACCESSORIES)[number];
export type MascotAccessory = (typeof MASCOT_ACCESSORIES)[number];
export type AccessoryAuditLabel = HumanAccessory | AnimalAccessory | MascotAccessory;

const ALL_ACCESSORY_TERMS = [
  ...HUMAN_ACCESSORIES,
  ...ANIMAL_ACCESSORIES,
  ...MASCOT_ACCESSORIES,
  "eyeglasses",
  "spectacles",
  "world",
  "logo accessory",
  "moustache",
  "mustache",
  "beard",
  "chain",
  "purse",
  "handbag",
  "wristwatch",
  "mic",
  "microphone",
] as const;

const ACCESSORY_MATCH_RE = new RegExp(`\\b(${ALL_ACCESSORY_TERMS.join("|")})\\b`, "i");

const SMALL_HEAD_ACCESSORY_RE = new RegExp(
  `\\b(${SMALL_HEAD_ATTACHED_ACCESSORIES.join("|")})\\b`,
  "i"
);

const HEAD_FACE_CATEGORY_RE =
  /^(head|face|eyes|hair|forehead|chin|cheek|ear|ears|mouth|nose|neck)$/i;

export function accessoriesForAssetType(assetType: AccessoryAssetType = "unknown"): readonly string[] {
  switch (assetType) {
    case "human":
      return HUMAN_ACCESSORIES;
    case "animal":
      return ANIMAL_ACCESSORIES;
    case "mascot":
      return MASCOT_ACCESSORIES;
    default:
      return ALL_ACCESSORY_TERMS;
  }
}

export function accessoryAuditLabelsForAssetType(
  assetType: AccessoryAssetType = "unknown"
): readonly string[] {
  return accessoriesForAssetType(assetType);
}

export function matchesAccessoryTerm(text: string, accessory: string): boolean {
  const normalized = text.toLowerCase();
  const term = accessory.toLowerCase();
  if (term === "globe" && /\bworld\b/.test(normalized)) {
    return true;
  }
  if (term === "logo" && /\blogo\b/.test(normalized)) {
    return true;
  }
  if (term === "sunglasses") {
    return (
      /\bsunglasses?\b/.test(normalized) ||
      (/\beyewear\b/.test(normalized) && /\bsun/i.test(normalized))
    );
  }
  if (term === "glasses") {
    return (
      /\b(eyeglasses|spectacles|glasses)\b/.test(normalized) ||
      (/\beyewear\b/.test(normalized) && !/\bsun/i.test(normalized))
    );
  }
  return normalized.includes(term);
}

export type KeyFeatureAccessorySpec = {
  key: string;
  label: string;
  featurePattern: RegExp;
  aliasTerms: readonly string[];
};

/** Style-DNA keyFeatures → canonical accessory parts when the parts API misses them. */
export const KEY_FEATURE_ACCESSORY_SIGNALS: readonly KeyFeatureAccessorySpec[] = [
  {
    key: "sunglasses",
    label: "Sunglasses",
    featurePattern: /\bsunglasses?\b/i,
    aliasTerms: ["sunglasses", "sunglass", "eyewear"],
  },
  {
    key: "glasses",
    label: "Glasses",
    featurePattern: /\b(eyeglasses|spectacles|glasses)\b/i,
    aliasTerms: ["glasses", "eyeglasses", "spectacles", "eyewear"],
  },
  {
    key: "hat",
    label: "Hat",
    featurePattern: /\b(hat|cap|headwear)\b/i,
    aliasTerms: ["hat", "cap", "headwear"],
  },
  {
    key: "necklace",
    label: "Necklace",
    featurePattern: /\b(necklace|chain)\b/i,
    aliasTerms: ["necklace", "chain"],
  },
  {
    key: "earrings",
    label: "Earrings",
    featurePattern: /\bearrings?\b/i,
    aliasTerms: ["earring", "earrings"],
  },
  {
    key: "headphones",
    label: "Headphones",
    featurePattern: /\b(headphones|earbuds)\b/i,
    aliasTerms: ["headphones", "earbuds"],
  },
  {
    key: "collar",
    label: "Collar",
    featurePattern: /\bcollar\b/i,
    aliasTerms: ["collar"],
  },
  {
    key: "globe",
    label: "Globe",
    featurePattern: /\b(globe|world globe|wereldbol)\b/i,
    aliasTerms: ["globe", "world"],
  },
] as const;

export function resolveKeyFeatureAccessories(keyFeatures: string[]): KeyFeatureAccessorySpec[] {
  const joined = keyFeatures.join(" ");
  const found: KeyFeatureAccessorySpec[] = [];

  for (const spec of KEY_FEATURE_ACCESSORY_SIGNALS) {
    if (!spec.featurePattern.test(joined)) {
      continue;
    }
    if (spec.key === "glasses" && /\bsunglasses?\b/i.test(joined)) {
      continue;
    }
    found.push(spec);
  }

  return found;
}

function partAlreadyMatchesAccessory(
  parts: IllustrationPartSpec[],
  spec: KeyFeatureAccessorySpec
): boolean {
  return parts.some((p) =>
    spec.aliasTerms.some(
      (term) => matchesAccessoryTerm(p.label, term) || matchesAccessoryTerm(p.key, term)
    )
  );
}

function deriveAccessoryBbox(accessoryKey: string, parts: IllustrationPartSpec[]): EditorCanvasBounds {
  const eyes = parts.find((p) => p.category === "eyes" || /\beyes\b/i.test(p.label));
  const head = parts.find((p) => p.category === "head" || /\bhead\b/i.test(p.label));
  const face = parts.find((p) => p.category === "face" || /\bface\b/i.test(p.label));
  const anchor = eyes ?? head ?? face;

  if (anchor && hasValidVisualBbox(anchor.bbox)) {
    const b = anchor.bbox!;
    if (/glass|sunglass|eyewear|hat|cap|headphone|earbud/i.test(accessoryKey)) {
      return {
        x: Math.max(0, b.x - 0.04),
        y: Math.max(0, b.y - 0.02),
        width: Math.min(1, b.width + 0.08),
        height: Math.max(0.06, b.height * 1.25),
      };
    }
    if (/necklace|chain/i.test(accessoryKey)) {
      return {
        x: Math.max(0, b.x + b.width * 0.15),
        y: Math.min(0.95, b.y + b.height * 0.85),
        width: Math.min(0.7, b.width * 0.7),
        height: Math.max(0.05, b.height * 0.2),
      };
    }
    if (/earring/i.test(accessoryKey)) {
      return {
        x: Math.max(0, b.x - 0.03),
        y: b.y + b.height * 0.25,
        width: Math.min(0.2, b.width * 0.35),
        height: Math.max(0.05, b.height * 0.35),
      };
    }
  }

  if (/glass|sunglass|eyewear/i.test(accessoryKey)) {
    return { x: 0.28, y: 0.12, width: 0.44, height: 0.1 };
  }
  if (/hat|cap/i.test(accessoryKey)) {
    return { x: 0.22, y: 0.02, width: 0.56, height: 0.16 };
  }
  return { x: 0.3, y: 0.2, width: 0.4, height: 0.15 };
}

/**
 * Promote Style-DNA keyFeatures (e.g. "Sunglasses") into evidence-backed parts
 * when OpenAI parts / RT-DETR did not emit a matching accessory row.
 */
export function enrichAnalysisWithVisionKeyFeatureAccessories(
  analysis: IllustrationPartAnalysisResult,
  vision: AssetVisionAnalysis
): IllustrationPartAnalysisResult {
  const specs = resolveKeyFeatureAccessories(vision.keyFeatures ?? []);
  if (specs.length === 0) {
    return analysis;
  }

  const parts = [...analysis.parts];
  let injected = false;

  for (const spec of specs) {
    if (partAlreadyMatchesAccessory(parts, spec)) {
      continue;
    }
    parts.push({
      key: spec.key,
      label: spec.label,
      category: /glass|sunglass|eyewear/i.test(spec.key) ? "eyes" : "prop",
      group: "character",
      bbox: deriveAccessoryBbox(spec.key, parts),
      source: "openai_vision",
      confidence: 0.82,
      editable: true,
      taxonomyTab: ACCESSORIES_TAXONOMY_TAB,
    });
    injected = true;
  }

  if (!injected) {
    return analysis;
  }

  return {
    ...analysis,
    parts,
    openAiUsed: true,
  };
}

export function findAccessoryPart(
  parts: IllustrationPartSpec[],
  accessory: string
): IllustrationPartSpec | undefined {
  return parts.find((p) => {
    const label = p.label.toLowerCase();
    const key = p.key.toLowerCase();
    return matchesAccessoryTerm(label, accessory) || matchesAccessoryTerm(key, accessory);
  });
}

export function isAccessoryPart(
  part: IllustrationPartSpec,
  assetType: AccessoryAssetType = "unknown"
): boolean {
  const label = part.label.toLowerCase();
  const key = part.key.toLowerCase();
  if (ACCESSORY_MATCH_RE.test(label) || ACCESSORY_MATCH_RE.test(key)) {
    return true;
  }
  return accessoriesForAssetType(assetType).some(
    (term) => matchesAccessoryTerm(label, term) || matchesAccessoryTerm(key, term)
  );
}

export function isSmallHeadAttachedAccessory(part: IllustrationPartSpec): boolean {
  const label = part.label.toLowerCase();
  const key = part.key.toLowerCase();
  return SMALL_HEAD_ACCESSORY_RE.test(label) || SMALL_HEAD_ACCESSORY_RE.test(key);
}

function bboxesOverlap(a: EditorCanvasBounds, b: EditorCanvasBounds): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function isAccessoryAttachedToHeadRegion(
  part: IllustrationPartSpec,
  allParts: IllustrationPartSpec[]
): boolean {
  if (!isSmallHeadAttachedAccessory(part)) {
    return false;
  }

  if (HEAD_FACE_CATEGORY_RE.test(part.category)) {
    return true;
  }

  if (!hasValidVisualBbox(part.bbox)) {
    return false;
  }

  const headFaceParts = allParts.filter(
    (p) =>
      p.key !== part.key &&
      (HEAD_FACE_CATEGORY_RE.test(p.category) ||
        /\b(head|face|hair|forehead|eyes|ear)\b/i.test(p.label) ||
        /\b(head|face|hair|forehead|eyes|ear)\b/i.test(p.key))
  );

  if (headFaceParts.length === 0) {
    return HEAD_FACE_CATEGORY_RE.test(part.category);
  }

  return headFaceParts.some(
    (hp) => hasValidVisualBbox(hp.bbox) && bboxesOverlap(part.bbox!, hp.bbox!)
  );
}

export function hasAccessoryVisualEvidence(part: IllustrationPartSpec): boolean {
  if (part.source === "estimated" || part.source === "taxonomy_fallback" || part.source === "creative") {
    return false;
  }

  const hasSpatial = hasValidVisualBbox(part.bbox) || Boolean(part.mask) || Boolean(part.polygon?.length);
  if (!hasSpatial) {
    return false;
  }

  if (part.source === "rtdetr" || part.source === "manual") {
    return true;
  }

  if (part.source === "openai_vision") {
    return true;
  }

  return false;
}

export function requiredAccessoryConfidence(
  part: IllustrationPartSpec,
  allParts: IllustrationPartSpec[] = []
): number {
  if (isSmallHeadAttachedAccessory(part) && isAccessoryAttachedToHeadRegion(part, allParts)) {
    return SMALL_ACCESSORY_ON_HEAD_MIN_CONFIDENCE;
  }
  return ACCESSORY_MIN_CONFIDENCE;
}

export type AccessoryDetectionVerdict = {
  accessory: string;
  part: IllustrationPartSpec | null;
  detected: boolean;
  confidence: number | null;
  source: EditorVisionPartSource | "none";
  threshold: number;
  hasBbox: boolean;
  hasMask: boolean;
  hasEvidence: boolean;
  accepted: boolean;
  reason: string;
};

export function evaluateAccessoryDetection(
  accessory: string,
  parts: IllustrationPartSpec[],
  assetType: AccessoryAssetType = "unknown"
): AccessoryDetectionVerdict {
  const match = findAccessoryPart(parts, accessory);

  if (!match) {
    return {
      accessory,
      part: null,
      detected: false,
      confidence: null,
      source: "none",
      threshold: ACCESSORY_MIN_CONFIDENCE,
      hasBbox: false,
      hasMask: false,
      hasEvidence: false,
      accepted: false,
      reason: "Not identified by any detector",
    };
  }

  const hasBbox = hasValidVisualBbox(match.bbox);
  const hasMask = Boolean(match.mask) || Boolean(match.polygon?.length);
  const hasEvidence = hasAccessoryVisualEvidence(match);
  const threshold = requiredAccessoryConfidence(match, parts);

  if (!hasEvidence) {
    return {
      accessory,
      part: match,
      detected: false,
      confidence: match.confidence,
      source: match.source,
      threshold,
      hasBbox,
      hasMask,
      hasEvidence: false,
      accepted: false,
      reason:
        match.source === "estimated"
          ? "Template inference — no detector evidence"
          : "No bbox, mask, or polygon evidence",
    };
  }

  if (match.confidence < threshold) {
    return {
      accessory,
      part: match,
      detected: false,
      confidence: match.confidence,
      source: match.source,
      threshold,
      hasBbox,
      hasMask,
      hasEvidence: true,
      accepted: false,
      reason: `Confidence ${Math.round(match.confidence * 100)}% below ${Math.round(threshold * 100)}% accessory threshold`,
    };
  }

  const sourceLabel =
    match.source === "rtdetr" || match.source === "manual"
      ? "RT-DETR/manual detection"
      : match.source === "openai_vision"
        ? "OpenAI Vision identification"
        : hasMask
          ? "Segmentation/mask evidence"
          : "Accessory classifier";

  return {
    accessory,
    part: match,
    detected: true,
    confidence: match.confidence,
    source: match.source,
    threshold,
    hasBbox,
    hasMask,
    hasEvidence: true,
    accepted: true,
    reason: `${sourceLabel} with spatial evidence`,
  };
}

export function auditAllAccessories(
  parts: IllustrationPartSpec[],
  assetType: AccessoryAssetType = "unknown"
): AccessoryDetectionVerdict[] {
  return accessoryAuditLabelsForAssetType(assetType).map((accessory) =>
    evaluateAccessoryDetection(accessory, parts, assetType)
  );
}
