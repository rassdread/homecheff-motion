/**
 * Vision Evidence Audit V2 — zero-assumption detection.
 * Detected tier requires hard visual evidence; template/semantic inference is rejected.
 */

import {
  ACCESSORY_MIN_CONFIDENCE,
  auditAllAccessories,
  BODY_PART_MIN_CONFIDENCE,
  HARD_EVIDENCE_BODY_PART_MIN_CONFIDENCE,
  hasAccessoryVisualEvidence,
  isAccessoryPart,
  isSmallHeadAttachedAccessory,
  isAccessoryAttachedToHeadRegion,
  requiredAccessoryConfidence,
  SMALL_ACCESSORY_ON_HEAD_MIN_CONFIDENCE,
} from "@/lib/editor-vision-accessory-detection";
import { ZERO_TAXONOMY_BBOX } from "@/lib/editor-taxonomy-shared";
import type { IllustrationPartAnalysisResult, IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type {
  AccessoryDetectionAuditRow,
  EditorVisionEvidenceAuditMeta,
  VisionPartDetectionDecision,
  VisionPartDetectionExplanation,
} from "@/types/editor-vision-evidence";
import type { AssetVisionObjectType } from "@/types/studio-asset-vision-analysis";
import type { EditorCanvasBounds } from "@/types/homecheff-visual-editor";

export type { AccessoryDetectionAuditRow, VisionPartDetectionDecision, VisionPartDetectionExplanation };

export const DETECTED_MIN_CONFIDENCE = BODY_PART_MIN_CONFIDENCE;
/** @deprecated use ACCESSORY_MIN_CONFIDENCE from editor-vision-accessory-detection */
export const DETECTED_SMALL_PART_MIN_CONFIDENCE = HARD_EVIDENCE_BODY_PART_MIN_CONFIDENCE;
export {
  ACCESSORY_MIN_CONFIDENCE,
  BODY_PART_MIN_CONFIDENCE,
  HARD_EVIDENCE_BODY_PART_MIN_CONFIDENCE,
  SMALL_ACCESSORY_ON_HEAD_MIN_CONFIDENCE,
} from "@/lib/editor-vision-accessory-detection";
export const ESTIMATED_MIN_CONFIDENCE = 0.45;
export const ESTIMATED_MAX_CONFIDENCE = 0.74;

export type EditorVisionTruthAssetType = AssetVisionObjectType | "unknown";

export type EditorVisionTruthContext = {
  assetType?: EditorVisionTruthAssetType;
};

export const BLOCKED_INFERRED_BODY_PARTS = [
  "arms",
  "arm",
  "left_arm",
  "right_arm",
  "hands",
  "hand",
  "left_hand",
  "right_hand",
  "pants",
  "trousers",
  "legs",
  "leg",
  "feet",
  "foot",
  "shoes",
  "shoe",
  "jacket",
  "tie",
  "necktie",
  "belt",
  "socks",
  "glove",
  "gloves",
  "paws",
  "paw",
  "tail",
  "claws",
  "claw",
  "torso",
  "umbrella",
  "suitcase",
] as const;

const BLOCKED_INFERRED_BODY_RE = new RegExp(
  `\\b(${BLOCKED_INFERRED_BODY_PARTS.join("|")})\\b`,
  "i"
);

const HEAD_FACE_RE =
  /\b(head|face|eyes|eye|mouth|lips|nose|hair|forehead|chin|cheek|ear|ears|neck)\b/i;

const STANDARD_UPPER_CLOTHING_RE = /\b(shirt|t-shirt|tee|blouse|top|vest|sweater|hoodie)\b/i;

export function hasValidVisualBbox(bbox: EditorCanvasBounds | undefined): boolean {
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

export function isBlockedInferredBodyPart(part: IllustrationPartSpec): boolean {
  const label = part.label.toLowerCase();
  const key = part.key.toLowerCase();
  return BLOCKED_INFERRED_BODY_RE.test(label) || BLOCKED_INFERRED_BODY_RE.test(key);
}

export { isAccessoryPart } from "@/lib/editor-vision-accessory-detection";

export function hasHardDetectorEvidence(part: IllustrationPartSpec): boolean {
  return (
    (part.source === "rtdetr" || part.source === "manual") &&
    (hasValidVisualBbox(part.bbox) || Boolean(part.mask) || Boolean(part.polygon?.length))
  );
}

export function hasOpenAiVisionEvidence(part: IllustrationPartSpec): boolean {
  return (
    part.source === "openai_vision" &&
    (hasValidVisualBbox(part.bbox) || Boolean(part.mask) || Boolean(part.polygon?.length))
  );
}

/**
 * Hard validation — a part may ONLY enter Detected when visually evidenced.
 * Estimated / taxonomy / template sources are never evidence-backed.
 */
export function isEvidenceBackedPart(
  part: IllustrationPartSpec,
  context?: EditorVisionTruthContext
): boolean {
  if (isAccessoryPart(part, context?.assetType)) {
    return hasAccessoryVisualEvidence(part);
  }

  if (part.source === "estimated" || part.source === "taxonomy_fallback" || part.source === "creative") {
    return false;
  }

  const hardDetector = hasHardDetectorEvidence(part);
  const openAiVision = hasOpenAiVisionEvidence(part);

  if (!hardDetector && !openAiVision) {
    return false;
  }

  if (isBlockedInferredBodyPart(part)) {
    return hardDetector;
  }

  return hardDetector || openAiVision;
}

export function requiredEvidenceConfidence(
  part: IllustrationPartSpec,
  allParts: IllustrationPartSpec[] = [],
  context?: EditorVisionTruthContext
): number {
  if (isAccessoryPart(part, context?.assetType)) {
    return requiredAccessoryConfidence(part, allParts);
  }
  if (isBlockedInferredBodyPart(part)) {
    return HARD_EVIDENCE_BODY_PART_MIN_CONFIDENCE;
  }
  if (STANDARD_UPPER_CLOTHING_RE.test(part.label) || HEAD_FACE_RE.test(part.label)) {
    return DETECTED_MIN_CONFIDENCE;
  }
  return DETECTED_MIN_CONFIDENCE;
}

export function explainPartDetectionDecision(
  part: IllustrationPartSpec,
  context?: EditorVisionTruthContext & { allParts?: IllustrationPartSpec[] }
): VisionPartDetectionExplanation {
  const hasBbox = hasValidVisualBbox(part.bbox);
  const hasMask = Boolean(part.mask);
  const hasPolygon = Boolean(part.polygon?.length);
  const blocked = isBlockedInferredBodyPart(part);
  const accessory = isAccessoryPart(part, context?.assetType);
  const allParts = context?.allParts ?? [];
  const evidenceBacked = isEvidenceBackedPart(part, context);
  const minConf = requiredEvidenceConfidence(part, allParts, context);

  const source: VisionPartDetectionExplanation["source"] =
    part.source === "estimated" ? "semantic_template" : part.source;

  if (part.source === "taxonomy_fallback") {
    return {
      label: part.label,
      source: "semantic_template",
      confidence: part.confidence,
      hasBbox,
      hasMask,
      hasPolygon,
      evidenceBacked: false,
      blockedInferredBody: blocked,
      decision: "CREATIVE",
      reason: "Taxonomy fallback — creative capability only",
    };
  }

  if (part.source === "estimated") {
    return {
      label: part.label,
      source: "semantic_template",
      confidence: part.confidence,
      hasBbox,
      hasMask,
      hasPolygon,
      evidenceBacked: false,
      blockedInferredBody: blocked,
      decision: blocked ? "REJECTED" : "ESTIMATED",
      reason: blocked
        ? "Semantic template inference — no detector evidence"
        : "Template/estimated bounds — not evidence-backed",
    };
  }

  if (!evidenceBacked) {
    const reason = blocked
      ? "Inferred body part requires RT-DETR/manual bbox evidence"
      : !hasBbox && !hasMask && !hasPolygon
        ? "No bbox, mask, or polygon evidence"
        : "Insufficient visual evidence";
    return {
      label: part.label,
      source,
      confidence: part.confidence,
      hasBbox,
      hasMask,
      hasPolygon,
      evidenceBacked: false,
      blockedInferredBody: blocked,
      decision: "REJECTED",
      reason,
    };
  }

  if (part.confidence < minConf) {
    return {
      label: part.label,
      source,
      confidence: part.confidence,
      hasBbox,
      hasMask,
      hasPolygon,
      evidenceBacked: true,
      blockedInferredBody: blocked,
      decision: "ESTIMATED",
      reason: `Evidence present but confidence ${Math.round(part.confidence * 100)}% below ${Math.round(minConf * 100)}% threshold`,
    };
  }

  const reason = accessory
    ? isSmallHeadAttachedAccessory(part) && isAccessoryAttachedToHeadRegion(part, allParts)
      ? hasHardDetectorEvidence(part)
        ? "Head-attached accessory — RT-DETR/manual with spatial evidence"
        : "Head-attached accessory — OpenAI Vision with spatial evidence"
      : hasHardDetectorEvidence(part)
        ? "Accessory — RT-DETR/manual detection with spatial evidence"
        : hasMask || hasPolygon
          ? "Accessory — segmentation/mask evidence"
          : "Accessory — OpenAI Vision with spatial evidence"
    : hasHardDetectorEvidence(part)
      ? "RT-DETR/manual detection with spatial evidence"
      : "OpenAI vision with spatial evidence";

  return {
    label: part.label,
    source,
    confidence: part.confidence,
    hasBbox,
    hasMask,
    hasPolygon,
    evidenceBacked: true,
    blockedInferredBody: blocked,
    decision: "DETECTED",
    reason,
  };
}

export function auditAccessoryDetection(
  parts: IllustrationPartSpec[],
  context?: EditorVisionTruthContext
): AccessoryDetectionAuditRow[] {
  return auditAllAccessories(parts, context?.assetType).map((verdict) => ({
    accessory: verdict.accessory,
    detected: verdict.detected,
    confidence: verdict.confidence,
    hasBbox: verdict.hasBbox,
    source: verdict.source,
    decision: verdict.accepted ? "DETECTED" : verdict.hasEvidence ? "ESTIMATED" : "REJECTED",
    reason: verdict.reason,
  }));
}

export function computeVisionTrustScore(
  detectedParts: IllustrationPartSpec[],
  context?: EditorVisionTruthContext
): number {
  if (detectedParts.length === 0) {
    return 100;
  }
  const evidenced = detectedParts.filter((p) => isEvidenceBackedPart(p, context)).length;
  return Math.round((evidenced / detectedParts.length) * 100);
}

export function auditAllPartDecisions(
  parts: IllustrationPartSpec[],
  context?: EditorVisionTruthContext
): VisionPartDetectionExplanation[] {
  const enriched = { ...context, allParts: parts };
  return parts.map((p) => explainPartDetectionDecision(p, enriched));
}

export function buildVisionEvidenceAuditMeta(
  analysis: IllustrationPartAnalysisResult,
  detectedParts: IllustrationPartSpec[],
  context?: EditorVisionTruthContext
): EditorVisionEvidenceAuditMeta {
  return {
    visionTrustScore: computeVisionTrustScore(detectedParts, context),
    accessoryAudit: auditAccessoryDetection(analysis.parts, context),
    detectionExplanations: auditAllPartDecisions(analysis.parts, context),
  };
}

export function portraitWithSunglassesFixture(): IllustrationPartAnalysisResult {
  return {
    characterLabel: "Person",
    openAiUsed: true,
    templateUsed: true,
    parts: [
      {
        key: "head",
        label: "Head",
        category: "head",
        group: "character",
        bbox: { x: 0.28, y: 0.05, width: 0.44, height: 0.28 },
        source: "openai_vision",
        confidence: 0.91,
        editable: true,
      },
      {
        key: "hair",
        label: "Hair",
        category: "head",
        group: "character",
        bbox: { x: 0.26, y: 0.02, width: 0.48, height: 0.18 },
        source: "openai_vision",
        confidence: 0.89,
        editable: true,
      },
      {
        key: "eyes",
        label: "Eyes",
        category: "eyes",
        group: "character",
        bbox: { x: 0.34, y: 0.14, width: 0.32, height: 0.06 },
        source: "openai_vision",
        confidence: 0.9,
        editable: true,
      },
      {
        key: "sunglasses",
        label: "Sunglasses",
        category: "eyes",
        group: "character",
        bbox: { x: 0.32, y: 0.13, width: 0.36, height: 0.08 },
        source: "openai_vision",
        confidence: 0.94,
        editable: true,
      },
      {
        key: "mouth",
        label: "Mouth",
        category: "mouth",
        group: "character",
        bbox: { x: 0.4, y: 0.24, width: 0.2, height: 0.05 },
        source: "openai_vision",
        confidence: 0.87,
        editable: true,
      },
      {
        key: "beard",
        label: "Beard",
        category: "head",
        group: "character",
        bbox: { x: 0.36, y: 0.26, width: 0.28, height: 0.12 },
        source: "openai_vision",
        confidence: 0.86,
        editable: true,
      },
      {
        key: "shirt",
        label: "Shirt",
        category: "shirt",
        group: "character",
        bbox: { x: 0.22, y: 0.34, width: 0.56, height: 0.38 },
        source: "rtdetr",
        confidence: 0.88,
        editable: true,
      },
      {
        key: "necklace",
        label: "Necklace",
        category: "prop",
        group: "character",
        bbox: { x: 0.38, y: 0.3, width: 0.24, height: 0.08 },
        source: "openai_vision",
        confidence: 0.63,
        editable: true,
      },
      {
        key: "pants",
        label: "Pants",
        category: "pants",
        group: "character",
        bbox: { x: 0.24, y: 0.58, width: 0.52, height: 0.38 },
        source: "openai_vision",
        confidence: 0.88,
        editable: true,
      },
      {
        key: "shoes",
        label: "Shoes",
        category: "shoes",
        group: "character",
        bbox: { x: 0.2, y: 0.82, width: 0.6, height: 0.12 },
        source: "estimated",
        confidence: 0.55,
        editable: true,
      },
      {
        key: "tie",
        label: "Tie",
        category: "tie",
        group: "character",
        bbox: { x: 0.42, y: 0.32, width: 0.16, height: 0.22 },
        source: "estimated",
        confidence: 0.52,
        editable: true,
      },
      {
        key: "jacket",
        label: "Jacket",
        category: "jacket",
        group: "character",
        bbox: { x: 0.18, y: 0.3, width: 0.64, height: 0.42 },
        source: "openai_vision",
        confidence: 0.84,
        editable: true,
      },
    ],
  };
}
