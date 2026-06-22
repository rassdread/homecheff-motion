/**
 * Accessories & Attributes taxonomy — dedicated hierarchy group for humans, animals, mascots.
 */

import {
  isAccessoryPart,
  matchesAccessoryTerm,
  type AccessoryAssetType,
} from "@/lib/editor-vision-accessory-detection";
import type { IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type { TranslationKey } from "@/i18n";
import type { EditorVisionTruthAssetType } from "@/lib/editor-vision-evidence-audit";

export const ACCESSORIES_TAXONOMY_TAB = "accessories";

/** Guard against non-array parts (stale analysis snapshots, bad merges). */
export function coerceIllustrationPartsArray(parts: unknown): IllustrationPartSpec[] {
  return Array.isArray(parts) ? parts : [];
}

export type VisionTaxonomyAssetType = EditorVisionTruthAssetType;

export const HUMAN_TAXONOMY_TAB_ORDER = [
  "face",
  "hair",
  "body",
  "clothing",
  ACCESSORIES_TAXONOMY_TAB,
  "expression",
  "pose",
  "morph",
] as const;

export const ANIMAL_TAXONOMY_TAB_ORDER = [
  "head",
  "body",
  "coat",
  "paws_wings",
  ACCESSORIES_TAXONOMY_TAB,
  "expression",
  "pose",
  "morph",
] as const;

export const MASCOT_TAXONOMY_TAB_ORDER = [
  "appearance",
  ACCESSORIES_TAXONOMY_TAB,
  "expression",
  "pose",
  "props",
  "style",
] as const;

const HUMAN_ACCESSORY_IN_CLOTHING_RE =
  /\b(glasses|sunglasses|eyeglasses|spectacles|eyewear|hat|cap|helmet|earring|earrings|necklace|chain|watch|bracelet|wristband|wrist band|ring|backpack|bag|headphones|microphone|jewelry|accessories)\b/i;

const MASCOT_ACCESSORY_PROP_RE =
  /\b(globe|world|wereldbol|hat|cap|badge|tool|laptop|phone|mug|cup|board|sign|prop)\b/i;

/** Canonical accessory key for deduplication within a tier. */
export function normalizeAccessoryCanonicalKey(label: string, key?: string): string {
  const text = `${label} ${key ?? ""}`.toLowerCase();

  if (
    /\bsunglasses?\b/.test(text) ||
    /\b(aviator|pilot)\s*glasses\b/.test(text) ||
    (/\beyewear\b/.test(text) && /\bsun/i.test(text))
  ) {
    return "sunglasses";
  }
  if (
    /\b(reading|prescription)\s*glasses\b/.test(text) ||
    /\b(eyeglasses|spectacles)\b/.test(text) ||
    (/\beyewear\b/.test(text) && !/\bsun/i.test(text)) ||
    (/\bglasses\b/.test(text) && !/\bsun/i.test(text))
  ) {
    return "glasses";
  }
  if (/\bworld\s*globe\b/.test(text) || /\b(globe|wereldbol)\b/.test(text)) {
    return "globe";
  }
  if (/\bcollar\b/.test(text) || /\bhalsband\b/.test(text)) {
    return "collar";
  }
  if (/\bleash\b/.test(text) || /\blijn\b/.test(text)) {
    return "leash";
  }
  if (/\bheadphones\b/.test(text) || /\bearbuds\b/.test(text)) {
    return "headphones";
  }
  if (/\bnecklace\b/.test(text) || /\bketting\b/.test(text)) {
    return "necklace";
  }
  if (/\bwatch\b/.test(text) || /\bhorloge\b/.test(text)) {
    return "watch";
  }

  return (key ?? label).toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function taxonomyTabOrderForAsset(
  assetType: VisionTaxonomyAssetType = "unknown"
): readonly string[] {
  switch (assetType) {
    case "human":
      return HUMAN_TAXONOMY_TAB_ORDER;
    case "animal":
      return ANIMAL_TAXONOMY_TAB_ORDER;
    case "mascot":
    case "character":
      return MASCOT_TAXONOMY_TAB_ORDER;
    default:
      return [
        ...new Set([
          ...HUMAN_TAXONOMY_TAB_ORDER,
          ...ANIMAL_TAXONOMY_TAB_ORDER,
          ...MASCOT_TAXONOMY_TAB_ORDER,
        ]),
      ];
  }
}

export function visionTaxonomyGroupLabelKey(
  assetType: VisionTaxonomyAssetType,
  tab: string
): TranslationKey {
  const type =
    assetType === "animal"
      ? "animal"
      : assetType === "mascot" || assetType === "character"
        ? "mascot"
        : "human";

  if (tab === ACCESSORIES_TAXONOMY_TAB) {
    return `editor.visionTaxonomy.tab.${type}.accessoriesGroup` as TranslationKey;
  }

  return `editor.visionTaxonomy.tab.${type}.${tab}` as TranslationKey;
}

export function resolvePartTaxonomyTab(
  part: IllustrationPartSpec,
  assetType: VisionTaxonomyAssetType = "unknown"
): string {
  if (isAccessoryPart(part, assetType)) {
    return ACCESSORIES_TAXONOMY_TAB;
  }

  const label = part.label.toLowerCase();
  const key = part.key.toLowerCase();

  if (assetType === "human" && HUMAN_ACCESSORY_IN_CLOTHING_RE.test(label)) {
    return ACCESSORIES_TAXONOMY_TAB;
  }

  if (
    (assetType === "mascot" || assetType === "character") &&
    (part.group === "prop" || part.category === "globe") &&
    MASCOT_ACCESSORY_PROP_RE.test(label)
  ) {
    return ACCESSORIES_TAXONOMY_TAB;
  }

  if (part.taxonomyTab === "clothing" && HUMAN_ACCESSORY_IN_CLOTHING_RE.test(`${label} ${key}`)) {
    return ACCESSORIES_TAXONOMY_TAB;
  }

  if (part.taxonomyTab === "props" && MASCOT_ACCESSORY_PROP_RE.test(`${label} ${key}`)) {
    return ACCESSORIES_TAXONOMY_TAB;
  }

  if (part.taxonomyTab) {
    return part.taxonomyTab;
  }

  if (/^(face|eyes|mouth|nose|lips|teeth|ears|cheek|chin|jawline|forehead)$/i.test(part.category)) {
    return assetType === "animal" ? "head" : "face";
  }
  if (/^(head|hair)$/i.test(part.category) || /\bhair\b/i.test(label)) {
    return assetType === "human" ? "hair" : "head";
  }
  if (/^(shirt|jacket|pants|shoes|clothing|tie)$/i.test(part.category)) {
    return "clothing";
  }
  if (part.group === "prop" || part.category === "globe") {
    return assetType === "mascot" || assetType === "character" ? "props" : ACCESSORIES_TAXONOMY_TAB;
  }
  if (/^(torso|arms|hands|legs)$/i.test(part.category)) {
    return "body";
  }

  return part.group === "style" ? "expression" : "body";
}

export function assignAccessoriesTaxonomyToParts(
  parts: IllustrationPartSpec[] | unknown,
  assetType: VisionTaxonomyAssetType = "unknown"
): IllustrationPartSpec[] {
  return coerceIllustrationPartsArray(parts).map((part) => {
    const tab = resolvePartTaxonomyTab(part, assetType);
    if (tab === part.taxonomyTab) {
      return part;
    }
    return { ...part, taxonomyTab: tab };
  });
}

export function dedupeAccessoryParts(parts: IllustrationPartSpec[] | unknown): IllustrationPartSpec[] {
  const byCanonical = new Map<string, IllustrationPartSpec>();

  for (const part of coerceIllustrationPartsArray(parts)) {
    const canonical = normalizeAccessoryCanonicalKey(part.label, part.key);
    const existing = byCanonical.get(canonical);
    if (!existing || part.confidence > existing.confidence) {
      byCanonical.set(canonical, part);
    }
  }

  return [...byCanonical.values()];
}

export function groupPartsByTaxonomyTab(
  parts: IllustrationPartSpec[] | unknown,
  assetType: VisionTaxonomyAssetType = "unknown"
): Map<string, IllustrationPartSpec[]> {
  const order = taxonomyTabOrderForAsset(assetType);
  const grouped = new Map<string, IllustrationPartSpec[]>();

  for (const tab of order) {
    grouped.set(tab, []);
  }

  for (const part of coerceIllustrationPartsArray(parts)) {
    const tab = resolvePartTaxonomyTab(part, assetType);
    if (!grouped.has(tab)) {
      grouped.set(tab, []);
    }
    grouped.get(tab)!.push(part);
  }

  const accessories = grouped.get(ACCESSORIES_TAXONOMY_TAB);
  if (accessories && accessories.length > 0) {
    grouped.set(ACCESSORIES_TAXONOMY_TAB, dedupeAccessoryParts(accessories));
  }

  return grouped;
}

export function partMatchesAccessorySelection(
  part: IllustrationPartSpec,
  selectedLabel: string,
  assetType: VisionTaxonomyAssetType = "unknown"
): boolean {
  if (!isAccessoryPart(part, assetType)) {
    return false;
  }
  const canonical = normalizeAccessoryCanonicalKey(selectedLabel);
  const partCanonical = normalizeAccessoryCanonicalKey(part.label, part.key);
  if (canonical === partCanonical) {
    return true;
  }
  return matchesAccessoryTerm(part.label, canonical) || matchesAccessoryTerm(part.key, canonical);
}

export function inferAccessoryTypeFromLabel(label: string): string {
  return normalizeAccessoryCanonicalKey(label);
}
