import type { AssetVisionObjectType } from "@/types/studio-asset-vision-analysis";
import type {
  EditorIdentityRelevance,
  EditorSemanticLayerCategory,
} from "@/types/homecheff-visual-editor";

export type EditorSemanticTaxonomyMatch = {
  type: string;
  category: EditorSemanticLayerCategory;
  identityRelevance: EditorIdentityRelevance;
  defaultLocked: boolean;
  parentType?: string;
};

type TaxonomyRule = {
  pattern: RegExp;
  match: EditorSemanticTaxonomyMatch;
};

const PERSON_RULES: TaxonomyRule[] = [
  { pattern: /\b(head|skull)\b/i, match: { type: "head", category: "body", identityRelevance: "none", defaultLocked: false, parentType: "character" } },
  { pattern: /\b(face|facial)\b/i, match: { type: "face", category: "face", identityRelevance: "none", defaultLocked: false, parentType: "head" } },
  { pattern: /\b(eye|eyes|pupil)\b/i, match: { type: "eyes", category: "face", identityRelevance: "none", defaultLocked: false, parentType: "face" } },
  { pattern: /\b(mouth|lip|smile|grin)\b/i, match: { type: "mouth", category: "face", identityRelevance: "none", defaultLocked: false, parentType: "face" } },
  { pattern: /\b(hair|hairstyle|hairline)\b/i, match: { type: "hair", category: "body", identityRelevance: "none", defaultLocked: false, parentType: "head" } },
  { pattern: /\b(torso|chest|body)\b/i, match: { type: "body", category: "body", identityRelevance: "none", defaultLocked: false, parentType: "character" } },
  { pattern: /\b(arm|arms|sleeve)\b/i, match: { type: "arms", category: "body", identityRelevance: "none", defaultLocked: false, parentType: "character" } },
  { pattern: /\b(hand|hands|palm|finger)\b/i, match: { type: "hands", category: "body", identityRelevance: "none", defaultLocked: false, parentType: "arms" } },
  { pattern: /\b(leg|legs|thigh|knee)\b/i, match: { type: "legs", category: "body", identityRelevance: "none", defaultLocked: false, parentType: "character" } },
  { pattern: /\b(foot|feet|shoe|sneaker|boot)\b/i, match: { type: "feet", category: "body", identityRelevance: "none", defaultLocked: false, parentType: "legs" } },
  { pattern: /\b(shirt|jacket|coat|apron|dress|outfit|clothing|uniform|pants|trousers|skirt)\b/i, match: { type: "clothing", category: "clothing", identityRelevance: "editable_accessory", defaultLocked: false, parentType: "character" } },
  { pattern: /\b(hat|cap|helmet|headwear|toque|beanie|beret|crown|tiara)\b/i, match: { type: "headwear", category: "accessory", identityRelevance: "editable_accessory", defaultLocked: false, parentType: "head" } },
  { pattern: /\b(glass|glasses|sunglasses|watch|jewelry|necklace|tie|scarf|bag|belt|glove|accessory|accessories)\b/i, match: { type: "accessory", category: "accessory", identityRelevance: "editable_accessory", defaultLocked: false, parentType: "character" } },
];

const MASCOT_RULES: TaxonomyRule[] = [
  ...PERSON_RULES,
  { pattern: /\b(globe|silhouette|shape\s*marker|identity\s*marker|upper[\s-]?head|brand\s*silhouette|signature\s*head)\b/i, match: { type: "identity_shape_marker", category: "brand_element", identityRelevance: "identity_marker", defaultLocked: true, parentType: "head" } },
  { pattern: /\b(mascot|character)\b/i, match: { type: "character", category: "character", identityRelevance: "none", defaultLocked: false } },
  { pattern: /\b(held\s*object|prop|tool|item)\b/i, match: { type: "held_object", category: "prop", identityRelevance: "removable_object", defaultLocked: false, parentType: "character" } },
];

const PRODUCT_RULES: TaxonomyRule[] = [
  { pattern: /\b(product|bottle|jar|can|container|pack)\b/i, match: { type: "product_body", category: "product", identityRelevance: "none", defaultLocked: false } },
  { pattern: /\b(label|sticker|tag)\b/i, match: { type: "label", category: "label", identityRelevance: "placement_target", defaultLocked: false, parentType: "product_body" } },
  { pattern: /\b(logo|brand\s*mark|emblem)\b/i, match: { type: "logo", category: "logo", identityRelevance: "protected_brand_element", defaultLocked: false, parentType: "product_body" } },
  { pattern: /\b(cap|lid|top|closure)\b/i, match: { type: "cap", category: "package", identityRelevance: "none", defaultLocked: false, parentType: "product_body" } },
  { pattern: /\b(packaging|package|box|carton|wrapper)\b/i, match: { type: "packaging", category: "package", identityRelevance: "none", defaultLocked: false } },
  { pattern: /\b(shadow|reflection)\b/i, match: { type: "shadow", category: "environment", identityRelevance: "removable_object", defaultLocked: false } },
];

const SCENE_RULES: TaxonomyRule[] = [
  { pattern: /\b(foreground|front\s*plane)\b/i, match: { type: "foreground", category: "environment", identityRelevance: "none", defaultLocked: false } },
  { pattern: /\b(subject|main\s*subject|hero)\b/i, match: { type: "subject", category: "character", identityRelevance: "none", defaultLocked: false } },
  { pattern: /\b(table|desk|counter|surface)\b/i, match: { type: "table", category: "prop", identityRelevance: "removable_object", defaultLocked: false } },
  { pattern: /\b(wall|backdrop|room)\b/i, match: { type: "wall", category: "environment", identityRelevance: "none", defaultLocked: false } },
  { pattern: /\b(poster|banner|sign|frame)\b/i, match: { type: "poster", category: "prop", identityRelevance: "removable_object", defaultLocked: false, parentType: "wall" } },
  { pattern: /\b(box|crate|package)\b/i, match: { type: "box", category: "prop", identityRelevance: "removable_object", defaultLocked: false } },
];

const BRAND_RULES: TaxonomyRule[] = [
  { pattern: /\b(logo|logotype|wordmark)\b/i, match: { type: "logo", category: "logo", identityRelevance: "protected_brand_element", defaultLocked: false } },
  { pattern: /\b(mark|symbol|icon|glyph)\b/i, match: { type: "mark", category: "brand_element", identityRelevance: "protected_brand_element", defaultLocked: false } },
  { pattern: /\b(text|typography|lettering|title)\b/i, match: { type: "text", category: "text", identityRelevance: "none", defaultLocked: false } },
  { pattern: /\b(brand\s*color|color\s*block|primary\s*color)\b/i, match: { type: "brand_color_area", category: "brand_element", identityRelevance: "protected_brand_element", defaultLocked: false } },
];

const BACKGROUND_RULE: TaxonomyRule = {
  pattern: /\b(background|backdrop|sky|floor|environment)\b/i,
  match: { type: "background", category: "background", identityRelevance: "none", defaultLocked: true },
};

const FALLBACK: EditorSemanticTaxonomyMatch = {
  type: "object",
  category: "unknown",
  identityRelevance: "removable_object",
  defaultLocked: false,
};

function rulesForObjectType(objectType: AssetVisionObjectType): TaxonomyRule[] {
  if (objectType === "mascot" || objectType === "character") {
    return [...MASCOT_RULES, BACKGROUND_RULE];
  }
  if (objectType === "human" || objectType === "animal") {
    return [...PERSON_RULES, BACKGROUND_RULE];
  }
  if (objectType === "product" || objectType === "packaging" || objectType === "food_item") {
    return [...PRODUCT_RULES, BACKGROUND_RULE];
  }
  if (objectType === "logo" || objectType === "brand_asset") {
    return [...BRAND_RULES, BACKGROUND_RULE];
  }
  if (objectType === "environment" || objectType === "location" || objectType === "building") {
    return [...SCENE_RULES, BACKGROUND_RULE];
  }
  return [...PERSON_RULES, ...PRODUCT_RULES, ...SCENE_RULES, ...BRAND_RULES, BACKGROUND_RULE];
}

export function classifyEditorSemanticFeature(
  label: string,
  objectType: AssetVisionObjectType
): EditorSemanticTaxonomyMatch {
  const rules = rulesForObjectType(objectType);
  for (const rule of rules) {
    if (rule.pattern.test(label)) {
      return rule.match;
    }
  }
  return FALLBACK;
}

export function isIdentityShapeMarkerLabel(label: string): boolean {
  return /\b(globe|silhouette|shape\s*marker|identity\s*marker|upper[\s-]?head|brand\s*silhouette|signature\s*head)\b/i.test(
    label
  );
}

export function editorSemanticCategoryLabelKey(
  category: EditorSemanticLayerCategory
): `editor.semantic.category.${EditorSemanticLayerCategory}` {
  return `editor.semantic.category.${category}`;
}

export function editorSemanticSourceLabelKey(
  source: import("@/types/homecheff-visual-editor").EditorSemanticLayerSource
): `editor.semantic.source.${import("@/types/homecheff-visual-editor").EditorSemanticLayerSource}` {
  return `editor.semantic.source.${source}`;
}
