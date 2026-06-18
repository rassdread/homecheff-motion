/**
 * Animal / pet fallback taxonomy — visual editable parts only.
 */

import { mergeTaxonomyFallbackParts, publicEditablePartLabels, taxonomySpec } from "@/lib/editor-taxonomy-shared";
import type { IllustrationPartAnalysisResult, IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type AnimalTaxonomyKind = "dog" | "cat" | "bird" | "horse" | "rabbit" | "fantasy_creature" | "generic_animal";

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

export function resolveAnimalTaxonomyKind(input: {
  vision: AssetVisionAnalysis;
  documentName?: string;
  semanticLayerLabels?: string[];
  sourceKind?: EditorCanvasDocument["sourceKind"];
}): AnimalTaxonomyKind | null {
  if (input.vision.objectType === "animal") {
    return classifyAnimalKind(collectSignals(input));
  }

  const signals = collectSignals(input);
  if (/\b(dog|puppy|hound|pet\s*dog)\b/.test(signals)) {
    return "dog";
  }
  if (/\b(cat|kitten|pet\s*cat)\b/.test(signals)) {
    return "cat";
  }
  if (/\b(bird|parrot|owl|eagle|pigeon)\b/.test(signals)) {
    return "bird";
  }
  if (/\b(horse|pony|stallion|mare)\b/.test(signals)) {
    return "horse";
  }
  if (/\b(rabbit|bunny)\b/.test(signals)) {
    return "rabbit";
  }
  if (/\b(fantasy\s*creature|dragon|griffin|unicorn|mythical)\b/.test(signals)) {
    return "fantasy_creature";
  }
  if (/\b(animal|pet|creature)\b/.test(signals)) {
    return "generic_animal";
  }

  return null;
}

function classifyAnimalKind(signals: string): AnimalTaxonomyKind {
  if (/\bdog|puppy\b/.test(signals)) {
    return "dog";
  }
  if (/\bcat|kitten\b/.test(signals)) {
    return "cat";
  }
  if (/\bbird|parrot|owl\b/.test(signals)) {
    return "bird";
  }
  if (/\bhorse|pony\b/.test(signals)) {
    return "horse";
  }
  if (/\brabbit|bunny\b/.test(signals)) {
    return "rabbit";
  }
  if (/\bfantasy|dragon|unicorn\b/.test(signals)) {
    return "fantasy_creature";
  }
  return "generic_animal";
}

function headParts(includeBeak: boolean, includeWhiskers: boolean): IllustrationPartSpec[] {
  const parts = [
    taxonomySpec({ key: "head", label: "Head", category: "head", group: "character", taxonomyTab: "head" }),
    taxonomySpec({ key: "eyes", label: "Eyes", category: "eyes", parentKey: "head", group: "character", taxonomyTab: "head" }),
    taxonomySpec({ key: "ears", label: "Ears", category: "head", parentKey: "head", group: "character", taxonomyTab: "head" }),
    taxonomySpec({ key: "nose", label: "Nose", category: "face", parentKey: "head", group: "character", taxonomyTab: "head" }),
    taxonomySpec({ key: "mouth", label: "Mouth", category: "mouth", parentKey: "head", group: "character", taxonomyTab: "head" }),
    taxonomySpec({ key: "teeth", label: "Teeth", category: "mouth", parentKey: "mouth", group: "character", taxonomyTab: "head" }),
    taxonomySpec({ key: "tongue", label: "Tongue", category: "mouth", parentKey: "mouth", group: "character", taxonomyTab: "head" }),
    taxonomySpec({ key: "muzzle", label: "Muzzle", category: "face", parentKey: "head", group: "character", taxonomyTab: "head" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);

  if (includeWhiskers) {
    const w = taxonomySpec({ key: "whiskers", label: "Whiskers", category: "face", parentKey: "muzzle", group: "character", taxonomyTab: "head" });
    if (w) {
      parts.push(w);
    }
  }
  if (includeBeak) {
    const b = taxonomySpec({ key: "beak", label: "Beak", category: "face", parentKey: "head", group: "character", taxonomyTab: "head" });
    if (b) {
      parts.push(b);
    }
  }
  return parts;
}

function bodyParts(includeWings: boolean, includeHooves: boolean): IllustrationPartSpec[] {
  const parts = [
    taxonomySpec({ key: "body", label: "Body", category: "torso", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "neck", label: "Neck", category: "head", parentKey: "body", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "chest", label: "Chest", category: "torso", parentKey: "body", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "back", label: "Back", category: "torso", parentKey: "body", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "belly", label: "Belly", category: "torso", parentKey: "body", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "tail", label: "Tail", category: "legs", parentKey: "body", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "legs", label: "Legs", category: "legs", parentKey: "body", group: "character", taxonomyTab: "body" }),
    taxonomySpec({ key: "paws", label: "Paws", category: "shoes", parentKey: "legs", group: "character", taxonomyTab: "paws_wings" }),
    taxonomySpec({ key: "claws", label: "Claws", category: "hands", parentKey: "paws", group: "character", taxonomyTab: "paws_wings" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);

  if (includeHooves) {
    const h = taxonomySpec({ key: "hooves", label: "Hooves", category: "shoes", parentKey: "legs", group: "character", taxonomyTab: "paws_wings" });
    if (h) {
      parts.push(h);
    }
  }
  if (includeWings) {
    const w = taxonomySpec({ key: "wings", label: "Wings", category: "arms", parentKey: "body", group: "character", taxonomyTab: "paws_wings" });
    if (w) {
      parts.push(w);
    }
  }
  return parts;
}

function coatParts(): IllustrationPartSpec[] {
  return [
    taxonomySpec({ key: "fur", label: "Fur", category: "clothing", group: "character", taxonomyTab: "coat" }),
    taxonomySpec({ key: "feathers", label: "Feathers", category: "clothing", group: "character", taxonomyTab: "coat" }),
    taxonomySpec({ key: "spots", label: "Spots", category: "clothing", group: "character", taxonomyTab: "coat" }),
    taxonomySpec({ key: "stripes", label: "Stripes", category: "clothing", group: "character", taxonomyTab: "coat" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

function expressionParts(): IllustrationPartSpec[] {
  return [
    taxonomySpec({ key: "expr_happy", label: "Happy", category: "prop", group: "style", taxonomyTab: "expression" }),
    taxonomySpec({ key: "expr_calm", label: "Calm", category: "prop", group: "style", taxonomyTab: "expression" }),
    taxonomySpec({ key: "expr_alert", label: "Alert", category: "prop", group: "style", taxonomyTab: "expression" }),
    taxonomySpec({ key: "expr_playful", label: "Playful", category: "prop", group: "style", taxonomyTab: "expression" }),
    taxonomySpec({ key: "expr_sleepy", label: "Sleepy", category: "prop", group: "style", taxonomyTab: "expression" }),
    taxonomySpec({ key: "expr_fierce", label: "Fierce", category: "prop", group: "style", taxonomyTab: "expression" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

function poseParts(includeFlying: boolean): IllustrationPartSpec[] {
  const parts = [
    taxonomySpec({ key: "pose_sitting", label: "Sitting", category: "prop", group: "style", taxonomyTab: "pose" }),
    taxonomySpec({ key: "pose_standing", label: "Standing", category: "prop", group: "style", taxonomyTab: "pose" }),
    taxonomySpec({ key: "pose_running", label: "Running", category: "prop", group: "style", taxonomyTab: "pose" }),
    taxonomySpec({ key: "pose_jumping", label: "Jumping", category: "prop", group: "style", taxonomyTab: "pose" }),
    taxonomySpec({ key: "pose_looking_camera", label: "Looking at camera", category: "prop", group: "style", taxonomyTab: "pose" }),
    taxonomySpec({ key: "pose_side_profile", label: "Side profile", category: "prop", group: "style", taxonomyTab: "pose" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);

  if (includeFlying) {
    const f = taxonomySpec({ key: "pose_flying", label: "Flying", category: "prop", group: "style", taxonomyTab: "pose" });
    if (f) {
      parts.push(f);
    }
  }
  return parts;
}

function accessoryParts(): IllustrationPartSpec[] {
  return [
    taxonomySpec({ key: "collar", label: "Collar", category: "prop", group: "prop", taxonomyTab: "accessories" }),
    taxonomySpec({ key: "leash", label: "Leash", category: "prop", group: "prop", taxonomyTab: "accessories" }),
    taxonomySpec({ key: "bow", label: "Bow", category: "prop", group: "prop", taxonomyTab: "accessories" }),
    taxonomySpec({ key: "saddle", label: "Saddle", category: "prop", group: "prop", taxonomyTab: "accessories" }),
    taxonomySpec({ key: "toy", label: "Toy", category: "prop", group: "prop", taxonomyTab: "accessories" }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

function morphParts(): IllustrationPartSpec[] {
  return [
    taxonomySpec({ key: "morph_cartoon_animal", label: "Make cartoon animal", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_mascot_version", label: "Make mascot version", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_fantasy_creature", label: "Make fantasy creature", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_keep_breed", label: "Keep breed shape", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_keep_fur", label: "Keep fur pattern", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_keep_eyes", label: "Keep eye color", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_keep_pose", label: "Keep pose", category: "prop", group: "style", taxonomyTab: "morph", editable: true }),
    taxonomySpec({ key: "morph_preserve_bg", label: "Preserve background", category: "prop", group: "background", taxonomyTab: "background", editable: true }),
  ].filter((p): p is IllustrationPartSpec => p !== null);
}

export function buildAnimalTaxonomyFallbackParts(kind: AnimalTaxonomyKind): IllustrationPartSpec[] {
  const isBird = kind === "bird";
  const isHorse = kind === "horse";
  const isCat = kind === "cat" || kind === "rabbit";
  const isFantasy = kind === "fantasy_creature";

  return [
    ...headParts(isBird, isCat),
    ...bodyParts(isBird || isFantasy, isHorse),
    ...coatParts(),
    ...expressionParts(),
    ...poseParts(isBird || isFantasy),
    ...accessoryParts(),
    ...morphParts(),
  ];
}

export function mergeIllustrationPartsWithAnimalTaxonomy(
  analysis: IllustrationPartAnalysisResult,
  kind: AnimalTaxonomyKind | null,
  vision: AssetVisionAnalysis
): IllustrationPartAnalysisResult {
  if (!kind) {
    return analysis;
  }
  const fallback = buildAnimalTaxonomyFallbackParts(kind);
  const merged = mergeTaxonomyFallbackParts(analysis, fallback);
  const label =
    kind === "dog"
      ? "Dog"
      : kind === "cat"
        ? "Cat"
        : kind === "bird"
          ? "Bird"
          : kind === "horse"
            ? "Horse"
            : kind === "rabbit"
              ? "Rabbit"
              : kind === "fantasy_creature"
                ? "Creature"
                : vision.objectTypeLabel?.trim() || "Animal";
  return {
    ...merged,
    characterLabel: label,
  };
}

export { publicEditablePartLabels };
