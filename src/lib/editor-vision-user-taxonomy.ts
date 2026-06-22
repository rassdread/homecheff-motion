/**
 * User-facing vision hierarchy taxonomy — non-technical parent/sub categories.
 * Generic body parts land under Personage; "Lichaam" only when nothing more specific exists.
 */

import {
  ACCESSORIES_TAXONOMY_TAB,
  resolvePartTaxonomyTab,
  type VisionTaxonomyAssetType,
} from "@/lib/editor-vision-accessories-taxonomy";
import type { IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type { TranslationKey } from "@/i18n";

export const USER_TAXONOMY_PARENT_CHARACTER = "character";
export const USER_TAXONOMY_PARENT_CLOTHING = "clothing";
export const USER_TAXONOMY_PARENT_POSE = "pose";
export const USER_TAXONOMY_PARENT_ACCESSORIES = "accessories";
export const USER_TAXONOMY_PARENT_BACKGROUND = "background";
export const USER_TAXONOMY_PARENT_EXPRESSION = "expression";
export const USER_TAXONOMY_PARENT_MORPH = "morph";

/** Personage sub-groups — order matters for display. */
export const CHARACTER_SUB_ORDER = [
  "face",
  "hair",
  "eyes",
  "mouth",
  "skin",
  "body",
] as const;

export const CLOTHING_SUB_ORDER = ["shirt", "jacket", "pants", "shoes", "other"] as const;
export const POSE_SUB_ORDER = ["arms", "legs", "posture", "other"] as const;
export const ACCESSORIES_SUB_ORDER = ["glasses", "jewelry", "watch", "bag", "other"] as const;
export const BACKGROUND_SUB_ORDER = ["wall", "sky", "room", "furniture", "other"] as const;

export type UserTaxonomyParent =
  | typeof USER_TAXONOMY_PARENT_CHARACTER
  | typeof USER_TAXONOMY_PARENT_CLOTHING
  | typeof USER_TAXONOMY_PARENT_POSE
  | typeof USER_TAXONOMY_PARENT_ACCESSORIES
  | typeof USER_TAXONOMY_PARENT_BACKGROUND
  | typeof USER_TAXONOMY_PARENT_EXPRESSION
  | typeof USER_TAXONOMY_PARENT_MORPH;

export type UserTaxonomyPlacement = {
  parent: UserTaxonomyParent;
  sub: string;
};

const USER_TAXONOMY_PARENT_ORDER: readonly UserTaxonomyParent[] = [
  USER_TAXONOMY_PARENT_CHARACTER,
  USER_TAXONOMY_PARENT_CLOTHING,
  USER_TAXONOMY_PARENT_POSE,
  USER_TAXONOMY_PARENT_ACCESSORIES,
  USER_TAXONOMY_PARENT_BACKGROUND,
  USER_TAXONOMY_PARENT_EXPRESSION,
  USER_TAXONOMY_PARENT_MORPH,
];

const SUB_ORDER_BY_PARENT: Record<UserTaxonomyParent, readonly string[]> = {
  character: CHARACTER_SUB_ORDER,
  clothing: CLOTHING_SUB_ORDER,
  pose: POSE_SUB_ORDER,
  accessories: ACCESSORIES_SUB_ORDER,
  background: BACKGROUND_SUB_ORDER,
  expression: ["other"],
  morph: ["other"],
};

function partText(part: IllustrationPartSpec): string {
  return `${part.label} ${part.key} ${part.category}`.toLowerCase();
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

/** Map a part to a user-facing parent + sub category. */
export function resolveUserTaxonomyPlacement(
  part: IllustrationPartSpec,
  assetType: VisionTaxonomyAssetType = "unknown"
): UserTaxonomyPlacement {
  const legacyTab = resolvePartTaxonomyTab(part, assetType);
  const text = partText(part);
  const category = part.category.toLowerCase();

  if (legacyTab === "morph") {
    return { parent: USER_TAXONOMY_PARENT_MORPH, sub: "other" };
  }

  if (legacyTab === "expression") {
    return { parent: USER_TAXONOMY_PARENT_EXPRESSION, sub: "other" };
  }

  if (legacyTab === ACCESSORIES_TAXONOMY_TAB || legacyTab === "accessories") {
    if (matchesAny(text, [/\b(sunglasses|glasses|eyewear|bril|spectacles|eyeglasses)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_ACCESSORIES, sub: "glasses" };
    }
    if (matchesAny(text, [/\b(watch|horloge)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_ACCESSORIES, sub: "watch" };
    }
    if (matchesAny(text, [/\b(bag|backpack|tas|purse|handbag)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_ACCESSORIES, sub: "bag" };
    }
    if (
      matchesAny(text, [
        /\b(jewelry|earring|necklace|ring|bracelet|sieraden|oorbellen|ketting|chain)\b/i,
      ])
    ) {
      return { parent: USER_TAXONOMY_PARENT_ACCESSORIES, sub: "jewelry" };
    }
    return { parent: USER_TAXONOMY_PARENT_ACCESSORIES, sub: "other" };
  }

  if (legacyTab === "clothing") {
    if (matchesAny(text, [/\b(shirt|blouse|top|tee|t-shirt|trui|blouse)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_CLOTHING, sub: "shirt" };
    }
    if (matchesAny(text, [/\b(jacket|jas|coat|blazer|hoodie|vest|cardigan)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_CLOTHING, sub: "jacket" };
    }
    if (matchesAny(text, [/\b(pants|trousers|broek|jeans|skirt|dress)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_CLOTHING, sub: "pants" };
    }
    if (matchesAny(text, [/\b(shoe|sneaker|boot|sandal|schoen)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_CLOTHING, sub: "shoes" };
    }
    return { parent: USER_TAXONOMY_PARENT_CLOTHING, sub: "other" };
  }

  if (legacyTab === "pose") {
    if (matchesAny(text, [/\b(arm|hand|finger|waving|pointing|crossed|wave)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_POSE, sub: "arms" };
    }
    if (matchesAny(text, [/\b(leg|foot|feet|walking|running|standing|sitting)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_POSE, sub: "legs" };
    }
    return { parent: USER_TAXONOMY_PARENT_POSE, sub: "posture" };
  }

  if (legacyTab === "background" || part.group === "background") {
    if (matchesAny(text, [/\b(wall|muur|brick)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_BACKGROUND, sub: "wall" };
    }
    if (matchesAny(text, [/\b(sky|lucht|cloud)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_BACKGROUND, sub: "sky" };
    }
    if (matchesAny(text, [/\b(room|kamer|interior|floor)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_BACKGROUND, sub: "room" };
    }
    if (matchesAny(text, [/\b(furniture|meubel|chair|table|desk|sofa)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_BACKGROUND, sub: "furniture" };
    }
    return { parent: USER_TAXONOMY_PARENT_BACKGROUND, sub: "other" };
  }

  if (legacyTab === "hair") {
    return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "hair" };
  }

  if (
    legacyTab === "face" ||
    /^(face|nose|lips|teeth|ears|cheek|chin|jawline|forehead)$/i.test(category)
  ) {
    if (/^(eyes|pupils|eyebrows)$/i.test(category) || /\b(eyes|pupils|eyebrows)\b/i.test(text)) {
      return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "eyes" };
    }
    if (/^(mouth|lips|teeth)$/i.test(category) || /\b(mouth|lips|teeth|smile|grin)\b/i.test(text)) {
      return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "mouth" };
    }
    return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "face" };
  }

  if (/^(eyes|pupils|eyebrows)$/i.test(category)) {
    return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "eyes" };
  }

  if (/^(mouth|lips|teeth)$/i.test(category)) {
    return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "mouth" };
  }

  if (matchesAny(text, [/\b(skin|huid|complexion|fur|vacht|coat|feather)\b/i])) {
    return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "skin" };
  }

  if (legacyTab === "body" || /^(torso|arms|hands|legs|neck|shoulders|head)$/i.test(category)) {
    if (
      /^(arms|hands|fingers)$/i.test(category) ||
      matchesAny(text, [/\b(arms?|hands?|fingers?|wrists?)\b/i])
    ) {
      return { parent: USER_TAXONOMY_PARENT_POSE, sub: "arms" };
    }
    if (
      /^(legs|feet|shoes)$/i.test(category) ||
      matchesAny(text, [/\b(legs?|feet|foot|toes?)\b/i])
    ) {
      return { parent: USER_TAXONOMY_PARENT_POSE, sub: "legs" };
    }
    if (matchesAny(text, [/\b(posture|pose_|standing|sitting|walking|running)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_POSE, sub: "posture" };
    }
    return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "body" };
  }

  if (legacyTab === "head" || legacyTab === "appearance") {
    if (matchesAny(text, [/\b(hair|beard|moustache|mustache)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "hair" };
    }
    if (matchesAny(text, [/\b(eye|pupil|eyebrow)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "eyes" };
    }
    if (matchesAny(text, [/\b(mouth|lip|teeth|smile|snout|muzzle|beak)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "mouth" };
    }
    if (matchesAny(text, [/\b(fur|vacht|feather|coat|skin)\b/i])) {
      return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "skin" };
    }
    return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "face" };
  }

  if (legacyTab === "coat") {
    return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "skin" };
  }

  if (legacyTab === "paws_wings") {
    return { parent: USER_TAXONOMY_PARENT_POSE, sub: "arms" };
  }

  if (legacyTab === "props" || legacyTab === "style") {
    return { parent: USER_TAXONOMY_PARENT_ACCESSORIES, sub: "other" };
  }

  return { parent: USER_TAXONOMY_PARENT_CHARACTER, sub: "body" };
}

export function groupPartsByUserTaxonomy(
  parts: IllustrationPartSpec[],
  assetType: VisionTaxonomyAssetType = "unknown"
): Map<UserTaxonomyParent, Map<string, IllustrationPartSpec[]>> {
  const grouped = new Map<UserTaxonomyParent, Map<string, IllustrationPartSpec[]>>();

  for (const part of parts) {
    const { parent, sub } = resolveUserTaxonomyPlacement(part, assetType);
    if (!grouped.has(parent)) {
      grouped.set(parent, new Map());
    }
    const subs = grouped.get(parent)!;
    if (!subs.has(sub)) {
      subs.set(sub, []);
    }
    subs.get(sub)!.push(part);
  }

  return grouped;
}

export function userTaxonomyParentOrder(): readonly UserTaxonomyParent[] {
  return USER_TAXONOMY_PARENT_ORDER;
}

export function userTaxonomySubOrder(parent: UserTaxonomyParent): readonly string[] {
  return SUB_ORDER_BY_PARENT[parent];
}

/** True when Personage should show a dedicated Lichaam/Body sub-group. */
export function shouldShowCharacterBodySubGroup(
  subMap: Map<string, IllustrationPartSpec[]>
): boolean {
  const bodyParts = subMap.get("body") ?? [];
  if (bodyParts.length === 0) {
    return false;
  }
  const hasSpecificCharacterSubs = CHARACTER_SUB_ORDER.some(
    (sub) => sub !== "body" && (subMap.get(sub)?.length ?? 0) > 0
  );
  return !hasSpecificCharacterSubs;
}

export function visionUserTaxonomyParentLabelKey(parent: UserTaxonomyParent): TranslationKey {
  return `editor.visionUserTaxonomy.parent.${parent}` as TranslationKey;
}

export function visionUserTaxonomySubLabelKey(
  parent: UserTaxonomyParent,
  sub: string
): TranslationKey {
  return `editor.visionUserTaxonomy.sub.${parent}.${sub}` as TranslationKey;
}

/** Resolve display label key for a taxonomy group node (parent or sub). */
export function visionUserTaxonomyGroupLabelKey(
  node: { taxonomyTab?: string; taxonomyParentTab?: string }
): TranslationKey | null {
  if (!node.taxonomyTab) {
    return null;
  }
  if (node.taxonomyParentTab) {
    return visionUserTaxonomySubLabelKey(
      node.taxonomyParentTab as UserTaxonomyParent,
      node.taxonomyTab
    );
  }
  return visionUserTaxonomyParentLabelKey(node.taxonomyTab as UserTaxonomyParent);
}
