/**
 * Realistic human fallback taxonomy — visual editable parts only (no sensitive inference).
 */

import { mergeTaxonomyFallbackParts, publicEditablePartLabels, taxonomySpec } from "@/lib/editor-taxonomy-shared";
import type { IllustrationPartAnalysisResult, IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type HumanTaxonomyKind = "portrait" | "full_body" | "generic_human";

const CARTOON_SIGNAL = /cartoon|mascot|illustration|animated|flat\s*vector|brand\s*mascot|globe\s*man/i;

function collectSignals(input: {
  vision: AssetVisionAnalysis;
  documentName?: string;
  semanticLayerLabels?: string[];
}): string {
  return [
    input.documentName ?? "",
    input.vision.objectTypeLabel,
    input.vision.visualStyle,
    ...input.vision.keyFeatures,
    ...(input.semanticLayerLabels ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

export function resolveHumanTaxonomyKind(input: {
  vision: AssetVisionAnalysis;
  documentName?: string;
  semanticLayerLabels?: string[];
  sourceKind?: EditorCanvasDocument["sourceKind"];
}): HumanTaxonomyKind | null {
  if (input.vision.objectType === "mascot" || input.vision.objectType === "character") {
    return null;
  }
  const signals = collectSignals(input);
  if (CARTOON_SIGNAL.test(signals)) {
    return null;
  }

  if (input.vision.objectType === "human") {
    if (/portrait|selfie|headshot|face\b/.test(signals)) {
      return "portrait";
    }
    if (/full.?body|standing|full length/.test(signals)) {
      return "full_body";
    }
    return "generic_human";
  }

  if (
    /portrait|selfie|headshot|full.?body|model\b|actor\b|realistic\s*person|human\b|person\b|subject\b/.test(
      signals
    )
  ) {
    if (/portrait|selfie|headshot|face\b/.test(signals)) {
      return "portrait";
    }
    if (/full.?body|standing|full length/.test(signals)) {
      return "full_body";
    }
    return "generic_human";
  }

  return null;
}

function faceParts(): IllustrationPartSpec[] {
  return [
    taxonomySpec({ key: "face", label: "Face", category: "face", group: "character", taxonomyTab: "face" }),
    taxonomySpec({ key: "eyes", label: "Eyes", category: "eyes", parentKey: "face", group: "character", taxonomyTab: "face" }),
    taxonomySpec({ key: "pupils", label: "Pupils", category: "eyes", parentKey: "eyes", group: "character", taxonomyTab: "face" }),
    taxonomySpec({ key: "eyebrows", label: "Eyebrows", category: "face", parentKey: "face", group: "character", taxonomyTab: "face" }),
    taxonomySpec({ key: "nose", label: "Nose", category: "face", parentKey: "face", group: "character", taxonomyTab: "face" }),
    taxonomySpec({ key: "mouth", label: "Mouth", category: "mouth", parentKey: "face", group: "character", taxonomyTab: "face" }),
    taxonomySpec({ key: "lips", label: "Lips", category: "mouth", parentKey: "mouth", group: "character", taxonomyTab: "face" }),
    taxonomySpec({ key: "teeth", label: "Teeth", category: "mouth", parentKey: "mouth", group: "character", taxonomyTab: "face" }),
    taxonomySpec({ key: "ears", label: "Ears", category: "head", parentKey: "head", group: "character", taxonomyTab: "face" }),
    taxonomySpec({ key: "cheeks", label: "Cheeks", category: "face", parentKey: "face", group: "character", taxonomyTab: "face" }),
    taxonomySpec({ key: "chin", label: "Chin", category: "face", parentKey: "face", group: "character", taxonomyTab: "face" }),
    taxonomySpec({ key: "jawline", label: "Jawline", category: "face", parentKey: "face", group: "character", taxonomyTab: "face" }),
    taxonomySpec({ key: "forehead", label: "Forehead", category: "face", parentKey: "face", group: "character", taxonomyTab: "face" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

function hairParts(): IllustrationPartSpec[] {
  return [
    taxonomySpec({ key: "hair", label: "Hair", category: "head", group: "character", taxonomyTab: "hair" }),
    taxonomySpec({ key: "hairstyle", label: "Hairstyle", category: "head", parentKey: "hair", group: "character", taxonomyTab: "hair" }),
    taxonomySpec({ key: "hair_color", label: "Hair color", category: "head", parentKey: "hair", group: "character", taxonomyTab: "hair" }),
    taxonomySpec({ key: "beard", label: "Beard", category: "head", parentKey: "hair", group: "character", taxonomyTab: "hair" }),
    taxonomySpec({ key: "moustache", label: "Moustache", category: "head", parentKey: "hair", group: "character", taxonomyTab: "hair" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

function bodyParts(): IllustrationPartSpec[] {
  return [
    taxonomySpec({ key: "head", label: "Head", category: "head", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "neck", label: "Neck", category: "head", parentKey: "head", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "shoulders", label: "Shoulders", category: "torso", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "torso", label: "Torso", category: "torso", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "arms", label: "Arms", category: "arms", parentKey: "torso", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "hands", label: "Hands", category: "hands", parentKey: "arms", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "fingers", label: "Fingers", category: "hands", parentKey: "hands", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "legs", label: "Legs", category: "legs", parentKey: "torso", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "feet", label: "Feet", category: "shoes", parentKey: "legs", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "posture", label: "Posture", category: "torso", group: "character", taxonomyTab: "body" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

function clothingParts(): IllustrationPartSpec[] {
  return [
    taxonomySpec({ key: "shirt", label: "Shirt", category: "shirt", group: "character", taxonomyTab: "clothing" }),
    taxonomySpec({ key: "jacket", label: "Jacket", category: "jacket", group: "character", taxonomyTab: "clothing" }),
    taxonomySpec({ key: "trousers", label: "Trousers", category: "pants", group: "character", taxonomyTab: "clothing" }),
    taxonomySpec({ key: "dress", label: "Dress", category: "clothing", group: "character", taxonomyTab: "clothing" }),
    taxonomySpec({ key: "shoes", label: "Shoes", category: "shoes", group: "character", taxonomyTab: "clothing" }),
    taxonomySpec({ key: "hat", label: "Hat", category: "head", group: "character", taxonomyTab: "clothing" }),
    taxonomySpec({ key: "glasses", label: "Glasses", category: "prop", group: "character", taxonomyTab: "clothing" }),
    taxonomySpec({ key: "jewelry", label: "Jewelry", category: "prop", group: "character", taxonomyTab: "clothing" }),
    taxonomySpec({ key: "accessories", label: "Accessories", category: "prop", group: "character", taxonomyTab: "clothing" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

function expressionParts(): IllustrationPartSpec[] {
  return [
    taxonomySpec({ key: "expr_smile", label: "Smile", category: "prop", group: "style", taxonomyTab: "expression" }),
    taxonomySpec({ key: "expr_serious", label: "Serious", category: "prop", group: "style", taxonomyTab: "expression" }),
    taxonomySpec({ key: "expr_surprised", label: "Surprised", category: "prop", group: "style", taxonomyTab: "expression" }),
    taxonomySpec({ key: "expr_angry", label: "Angry", category: "prop", group: "style", taxonomyTab: "expression" }),
    taxonomySpec({ key: "expr_confident", label: "Confident", category: "prop", group: "style", taxonomyTab: "expression" }),
    taxonomySpec({ key: "expr_neutral", label: "Neutral", category: "prop", group: "style", taxonomyTab: "expression" }),
    taxonomySpec({ key: "expr_friendly", label: "Friendly", category: "prop", group: "style", taxonomyTab: "expression" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

function poseParts(): IllustrationPartSpec[] {
  return [
    taxonomySpec({ key: "pose_standing", label: "Standing", category: "prop", group: "style", taxonomyTab: "pose" }),
    taxonomySpec({ key: "pose_sitting", label: "Sitting", category: "prop", group: "style", taxonomyTab: "pose" }),
    taxonomySpec({ key: "pose_walking", label: "Walking", category: "prop", group: "style", taxonomyTab: "pose" }),
    taxonomySpec({ key: "pose_running", label: "Running", category: "prop", group: "style", taxonomyTab: "pose" }),
    taxonomySpec({ key: "pose_pointing", label: "Pointing", category: "prop", group: "style", taxonomyTab: "pose" }),
    taxonomySpec({ key: "pose_waving", label: "Waving", category: "prop", group: "style", taxonomyTab: "pose" }),
    taxonomySpec({ key: "pose_arms_crossed", label: "Arms crossed", category: "prop", group: "style", taxonomyTab: "pose" }),
    taxonomySpec({ key: "pose_looking_camera", label: "Looking at camera", category: "prop", group: "style", taxonomyTab: "pose" }),
    taxonomySpec({ key: "pose_looking_away", label: "Looking away", category: "prop", group: "style", taxonomyTab: "pose" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

function morphParts(): IllustrationPartSpec[] {
  return [
    taxonomySpec({ key: "morph_cartoon", label: "Make more cartoon", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_cinematic", label: "Make more cinematic", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_outfit", label: "Change outfit", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_pose", label: "Change pose", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_keep_identity", label: "Keep identity", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_keep_face", label: "Keep face consistent", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_keep_hands", label: "Keep hands natural", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_preserve_bg", label: "Preserve background", category: "prop", group: "background", taxonomyTab: "background", editable: true }),
    taxonomySpec({ key: "morph_preserve_clothing", label: "Preserve clothing", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_preserve_expression", label: "Preserve expression", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

export function buildHumanTaxonomyFallbackParts(_kind: HumanTaxonomyKind): IllustrationPartSpec[] {
  return [
    ...faceParts(),
    ...hairParts(),
    ...bodyParts(),
    ...clothingParts(),
    ...expressionParts(),
    ...poseParts(),
    ...morphParts(),
  ];
}

export function mergeIllustrationPartsWithHumanTaxonomy(
  analysis: IllustrationPartAnalysisResult,
  kind: HumanTaxonomyKind | null,
  vision: AssetVisionAnalysis
): IllustrationPartAnalysisResult {
  if (!kind) {
    return analysis;
  }
  const fallback = buildHumanTaxonomyFallbackParts(kind);
  const merged = mergeTaxonomyFallbackParts(analysis, fallback);
  return {
    ...merged,
    characterLabel: vision.objectTypeLabel?.trim() || "Person",
  };
}

export { publicEditablePartLabels };
