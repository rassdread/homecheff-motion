/**
 * Mascot / character fallback taxonomy — merged with AI-detected parts when detection is shallow.
 * Source: taxonomy_fallback (visible to admins in debug; same editable parts for all users).
 */

import type { MascotExpansionKind } from "@/lib/editor-character-expansion";
import { resolveMascotExpansionKind, documentMascotSignals } from "@/lib/editor-character-expansion";
import {
  mergeTaxonomyFallbackPartsSeparated,
  publicEditablePartLabels,
  taxonomySpec,
} from "@/lib/editor-taxonomy-shared";
import type { IllustrationPartAnalysisResult, IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { EditorCanvasDocument, EditorCanvasBounds } from "@/types/homecheff-visual-editor";

export type MascotTaxonomyKind = MascotExpansionKind | "generic_character";

function spec(
  input: Omit<IllustrationPartSpec, "bbox" | "source" | "confidence" | "editable"> & {
    bbox?: EditorCanvasBounds;
    confidence?: number;
    editable?: boolean;
    taxonomyTab?: string;
  }
): IllustrationPartSpec | null {
  return taxonomySpec(input);
}

function appearanceParts(): IllustrationPartSpec[] {
  return [
    spec({ key: "face", label: "Face", category: "face", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "eyes", label: "Eyes", category: "eyes", parentKey: "face", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "mouth", label: "Mouth", category: "mouth", parentKey: "face", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "nose", label: "Nose", category: "face", parentKey: "face", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "eyebrows", label: "Eyebrows", category: "face", parentKey: "face", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "ears", label: "Ears", category: "head", parentKey: "head", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "head", label: "Head", category: "head", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "body", label: "Body", category: "torso", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "arms", label: "Arms", category: "arms", group: "character", parentKey: "body", taxonomyTab: "appearance" }),
    spec({ key: "hands", label: "Hands", category: "hands", parentKey: "arms", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "legs", label: "Legs", category: "legs", parentKey: "body", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "shoes", label: "Shoes", category: "shoes", parentKey: "body", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "outfit", label: "Outfit", category: "clothing", parentKey: "body", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "jacket", label: "Jacket", category: "jacket", parentKey: "outfit", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "shirt", label: "Shirt", category: "shirt", parentKey: "outfit", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "tie", label: "Tie", category: "tie", parentKey: "outfit", group: "character", taxonomyTab: "appearance" }),
    spec({ key: "pants", label: "Pants", category: "pants", parentKey: "outfit", group: "character", taxonomyTab: "appearance" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

function expressionParts(): IllustrationPartSpec[] {
  return [
    spec({ key: "expr_happy", label: "Happy", category: "prop", group: "style", editable: true, taxonomyTab: "expression" }),
    spec({ key: "expr_serious", label: "Serious", category: "prop", group: "style", editable: true, taxonomyTab: "expression" }),
    spec({ key: "expr_enthusiastic", label: "Enthusiastic", category: "prop", group: "style", editable: true, taxonomyTab: "expression" }),
    spec({ key: "expr_surprised", label: "Surprised", category: "prop", group: "style", editable: true, taxonomyTab: "expression" }),
    spec({ key: "expr_angry", label: "Angry", category: "prop", group: "style", editable: true, taxonomyTab: "expression" }),
    spec({ key: "expr_confident", label: "Confident", category: "prop", group: "style", editable: true, taxonomyTab: "expression" }),
    spec({ key: "expr_business", label: "Business-like", category: "prop", group: "style", editable: true, taxonomyTab: "expression" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

function poseParts(): IllustrationPartSpec[] {
  return [
    spec({ key: "pose_standing", label: "Standing", category: "prop", group: "style", editable: true, taxonomyTab: "pose" }),
    spec({ key: "pose_walking", label: "Walking", category: "prop", group: "style", editable: true, taxonomyTab: "pose" }),
    spec({ key: "pose_running", label: "Running", category: "prop", group: "style", editable: true, taxonomyTab: "pose" }),
    spec({ key: "pose_jumping", label: "Jumping", category: "prop", group: "style", editable: true, taxonomyTab: "pose" }),
    spec({ key: "pose_hand_up", label: "Hand raised", category: "prop", group: "style", editable: true, taxonomyTab: "pose" }),
    spec({ key: "pose_thumbs_up", label: "Thumbs up", category: "prop", group: "style", editable: true, taxonomyTab: "pose" }),
    spec({ key: "pose_arms_crossed", label: "Arms crossed", category: "prop", group: "style", editable: true, taxonomyTab: "pose" }),
    spec({ key: "pose_presenting", label: "Presenting", category: "prop", group: "style", editable: true, taxonomyTab: "pose" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

function mascotAccessoryParts(includeGlobe: boolean): IllustrationPartSpec[] {
  const parts: IllustrationPartSpec[] = [
    spec({ key: "hat", label: "Hat", category: "head", group: "prop", taxonomyTab: "accessories" }),
    spec({ key: "badge", label: "Badge", category: "prop", group: "prop", taxonomyTab: "accessories" }),
    spec({ key: "tool", label: "Tool", category: "prop", group: "prop", taxonomyTab: "accessories" }),
    spec({ key: "prop_laptop", label: "Laptop", category: "prop", group: "prop", taxonomyTab: "accessories" }),
    spec({ key: "prop_phone", label: "Phone", category: "prop", group: "prop", taxonomyTab: "accessories" }),
    spec({ key: "prop_coffee", label: "Mug", category: "prop", group: "prop", taxonomyTab: "accessories" }),
    spec({ key: "prop_sign", label: "Board", category: "prop", group: "prop", taxonomyTab: "accessories" }),
    spec({ key: "prop_book", label: "Prop object", category: "prop", group: "prop", taxonomyTab: "accessories" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);

  if (includeGlobe) {
    const globe = spec({ key: "globe", label: "World globe", category: "globe", group: "prop", taxonomyTab: "accessories" });
    if (globe) {
      parts.unshift(globe);
    }
  }
  return parts;
}

function propParts(): IllustrationPartSpec[] {
  return [];
}

function brandVariantParts(kind: MascotTaxonomyKind): IllustrationPartSpec[] {
  const common = [
    spec({ key: "brand_homecheff_colors", label: "HomeCheff colors", category: "prop", group: "style", editable: true }),
    spec({ key: "brand_business", label: "Business version", category: "prop", group: "style", editable: true }),
    spec({ key: "brand_casual", label: "Casual version", category: "prop", group: "style", editable: true }),
  ];
  if (kind === "chef") {
    common.push(spec({ key: "brand_chef_variant", label: "Chef variant", category: "prop", group: "style", editable: true }));
  }
  if (kind === "garden") {
    common.push(spec({ key: "brand_garden_variant", label: "Garden variant", category: "prop", group: "style", editable: true }));
  }
  if (kind === "designer") {
    common.push(spec({ key: "brand_designer_variant", label: "Designer variant", category: "prop", group: "style", editable: true }));
  }
  if (kind === "globe_man") {
    common.push(spec({ key: "brand_globe_man", label: "Globe Man variant", category: "prop", group: "style", editable: true }));
  }
  return common.filter((p): p is IllustrationPartSpec => p !== null);
}

function animationParts(): IllustrationPartSpec[] {
  return [
    spec({ key: "anim_blink", label: "Blink", category: "prop", group: "style", editable: true, taxonomyTab: "style" }),
    spec({ key: "anim_laugh", label: "Laugh", category: "prop", group: "style", editable: true, taxonomyTab: "style" }),
    spec({ key: "anim_talk", label: "Talk", category: "prop", group: "style", editable: true, taxonomyTab: "style" }),
    spec({ key: "anim_point", label: "Point", category: "prop", group: "style", editable: true, taxonomyTab: "style" }),
    spec({ key: "anim_wave", label: "Wave", category: "prop", group: "style", editable: true, taxonomyTab: "style" }),
    spec({ key: "anim_handshake", label: "Handshake", category: "prop", group: "style", editable: true, taxonomyTab: "style" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

function styleParts(): IllustrationPartSpec[] {
  return [
    spec({ key: "style_keep_illustration", label: "Keep illustration style", category: "prop", group: "style", editable: true, taxonomyTab: "style" }),
    spec({ key: "style_sharper", label: "Sharper look", category: "prop", group: "style", editable: true, taxonomyTab: "style" }),
    spec({ key: "style_friendly", label: "Friendlier look", category: "prop", group: "style", editable: true, taxonomyTab: "style" }),
    spec({ key: "style_professional", label: "More professional", category: "prop", group: "style", editable: true, taxonomyTab: "style" }),
    spec({ key: "style_cinematic", label: "More cinematic", category: "prop", group: "style", editable: true, taxonomyTab: "style" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

export function resolveMascotTaxonomyKind(input: {
  vision: AssetVisionAnalysis;
  documentName?: string;
  semanticLayerLabels?: string[];
  sourceKind?: EditorCanvasDocument["sourceKind"];
}): MascotTaxonomyKind | null {
  const pseudoDoc = {
    name: input.documentName ?? "",
    semanticLayers: (input.semanticLayerLabels ?? []).map((label) => ({ label })),
    visionAnalysis: input.vision,
    sourceKind: input.sourceKind ?? "upload",
  } as EditorCanvasDocument;

  const mascot = resolveMascotExpansionKind(pseudoDoc);
  if (mascot) {
    return mascot;
  }

  const signals = documentMascotSignals(pseudoDoc);
  if (/mascot|character|cartoon|illustrated character|brand mascot|figure/.test(signals)) {
    return "generic_character";
  }
  if (input.vision.objectType === "mascot" || input.vision.objectType === "character") {
    return "generic_character";
  }
  return null;
}

export function buildMascotTaxonomyFallbackParts(
  kind: MascotTaxonomyKind,
  vision: AssetVisionAnalysis
): IllustrationPartSpec[] {
  const includeGlobe =
    kind === "globe_man" ||
    vision.keyFeatures.some((f) => /globe|world|earth|planet/i.test(f)) ||
    /globe\s*man|globeman/.test(documentMascotSignals({ name: "", visionAnalysis: vision } as EditorCanvasDocument));

  return [
    ...appearanceParts(),
    ...mascotAccessoryParts(includeGlobe),
    ...expressionParts(),
    ...poseParts(),
    ...propParts(),
    ...brandVariantParts(kind),
    ...animationParts(),
    ...styleParts(),
  ];
}

export function mergeIllustrationPartsWithMascotTaxonomy(
  analysis: IllustrationPartAnalysisResult,
  kind: MascotTaxonomyKind | null,
  vision: AssetVisionAnalysis
): IllustrationPartAnalysisResult {
  if (!kind) {
    return analysis;
  }

  const fallback = buildMascotTaxonomyFallbackParts(kind, vision);
  return mergeTaxonomyFallbackPartsSeparated(analysis, fallback).analysis;
}

export { publicEditablePartLabels };
