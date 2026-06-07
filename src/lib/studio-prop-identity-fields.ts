/**
 * Prop Identity Builder — form values ↔ Identity Spec Engine ↔ prop PATCH.
 * Structured type/function/shape/material/size/style/chars in appearanceMemory (hc:key=value).
 * Forbidden → brandingRules. Usage → continuityNotes.
 */

import { isStudioPropCategory, type StudioPropCategory } from "@/lib/studio-prop-categories";
import {
  type PropIdentityFunctionId,
  type PropIdentityShapeId,
  type PropIdentitySizeId,
  type PropIdentityStyleId,
  type PropIdentityTypeId,
} from "@/lib/studio-prop-identity-presets";
import {
  buildPropAppearanceMemory,
  parsePropAppearanceDetails,
  parsePropStructuredKeywords,
} from "@/lib/studio-prop-identity-structured";
import { toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import type { PropIdentitySpecPatch } from "@/types/studio-identity-spec";
import type { StudioPropListItem } from "@/types/studio-api";

export type PropIdentityFormValues = {
  name: string;
  description: string;
  propType: PropIdentityTypeId | string;
  propFunction: PropIdentityFunctionId | string;
  shapeLanguage: PropIdentityShapeId | string;
  material: string;
  colorTheme: string;
  sizeImpression: PropIdentitySizeId | string;
  styleId: PropIdentityStyleId | string;
  appearanceMemory: string;
  forbiddenElements: string;
  usageContext: string;
  linkedCharacterIds: string[];
  worldProfileId: string | null;
};

const TYPE_TO_CATEGORY: Record<string, StudioPropCategory> = {
  tool: "tool",
  sport: "other",
  food: "food",
  electronics: "phone",
  clothing: "clothing",
  transport: "vehicle",
  decoration: "furniture",
  music: "other",
  toy: "other",
  business: "brand_asset",
};

const CATEGORY_TO_DEFAULT_TYPE: Record<StudioPropCategory, PropIdentityTypeId> = {
  phone: "electronics",
  laptop: "electronics",
  food: "food",
  drink: "food",
  plant: "decoration",
  vehicle: "transport",
  furniture: "decoration",
  screen: "electronics",
  clothing: "clothing",
  packaging: "business",
  tool: "tool",
  brand_asset: "business",
  other: "tool",
};

export function mapPropTypeToCategory(propType: string): StudioPropCategory {
  return TYPE_TO_CATEGORY[propType] ?? "other";
}

export function propIdentityFormFromProp(prop: StudioPropListItem): PropIdentityFormValues {
  const spec = toIdentitySpec(prop);
  const structured = parsePropStructuredKeywords(spec.memoryMetadata.appearanceMemory);
  const details = parsePropAppearanceDetails(spec.memoryMetadata.appearanceMemory);

  const category = isStudioPropCategory(spec.type) ? spec.type : "other";
  const propType =
    structured.propType ||
    (category === "other" ? "" : CATEGORY_TO_DEFAULT_TYPE[category]);

  return {
    name: spec.name,
    description: spec.description,
    propType,
    propFunction: structured.propFunction,
    shapeLanguage: structured.shapeLanguage,
    material: structured.material,
    colorTheme: structured.colorTheme,
    sizeImpression: structured.sizeImpression,
    styleId: structured.styleId,
    appearanceMemory: details,
    forbiddenElements: spec.forbiddenElements.trim() || spec.memoryMetadata.brandingRules.trim(),
    usageContext: spec.usageContext.trim() || spec.continuityMetadata.notes.trim(),
    linkedCharacterIds: [...structured.linkedCharacterIds],
    worldProfileId: spec.world.id,
  };
}

export function propIdentityFormToPatch(values: PropIdentityFormValues): PropIdentitySpecPatch {
  const category = mapPropTypeToCategory(values.propType);
  const appearanceMemory = buildPropAppearanceMemory(
    {
      propType: values.propType,
      propFunction: values.propFunction,
      shapeLanguage: values.shapeLanguage,
      material: values.material,
      colorTheme: values.colorTheme,
      sizeImpression: values.sizeImpression,
      styleId: values.styleId,
      linkedCharacterIds: values.linkedCharacterIds,
      freeTags: [],
    },
    values.appearanceMemory
  );

  return {
    name: values.name.trim(),
    category,
    description: values.description,
    appearanceMemory,
    brandingRules: values.forbiddenElements,
    continuityNotes: values.usageContext,
    worldProfileId: values.worldProfileId,
  };
}

export function mergePropIdentityForm(
  base: PropIdentityFormValues,
  suggestion: Partial<PropIdentityFormValues>
): PropIdentityFormValues {
  return { ...base, ...suggestion };
}

export function propIdentityCompletenessTier(
  score: number
): "complete" | "almost" | "missing" {
  if (score >= 85) return "complete";
  if (score >= 50) return "almost";
  return "missing";
}

export { parsePropStructuredKeywords } from "@/lib/studio-prop-identity-structured";
