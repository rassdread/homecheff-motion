import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { EditorAssetType, EditorAssetVariantGroup } from "@/types/editor-asset-profile";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

const MASCOT_VARIANTS: EditorAssetVariantGroup = {
  groupId: "globe_man",
  baseLabel: "Globe Man",
  variants: [
    { id: "business", labelKey: "editor.assetIntel.variant.business" },
    { id: "chef", labelKey: "editor.assetIntel.variant.chef" },
    { id: "garden", labelKey: "editor.assetIntel.variant.garden" },
    { id: "designer", labelKey: "editor.assetIntel.variant.designer" },
    { id: "winter", labelKey: "editor.assetIntel.variant.winter" },
    { id: "summer", labelKey: "editor.assetIntel.variant.summer" },
    { id: "event", labelKey: "editor.assetIntel.variant.event" },
    { id: "motion", labelKey: "editor.assetIntel.variant.motion" },
  ],
};

export function resolveAssetVariantGroup(
  document: EditorCanvasDocument,
  assetType: EditorAssetType,
  vision?: AssetVisionAnalysis | null
): EditorAssetVariantGroup | undefined {
  if (assetType !== "mascot" && assetType !== "character") {
    return undefined;
  }
  const text = [
    document.name,
    vision?.brandIdentity,
    vision?.assetFamily,
    vision?.characterLineage,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/globe\s*man|globeman|globe-man|mascot.*globe|globe.*mascot/.test(text)) {
    return MASCOT_VARIANTS;
  }
  if (/\bchef\b|homecheff chef|chef mascot/.test(text)) {
    return {
      groupId: "chef_mascot",
      baseLabel: "Chef Mascot",
      variants: MASCOT_VARIANTS.variants,
    };
  }
  if (/\bgarden\b|homegarden|garden mascot/.test(text)) {
    return {
      groupId: "garden_mascot",
      baseLabel: "Garden Mascot",
      variants: MASCOT_VARIANTS.variants,
    };
  }
  if (/\bdesigner\b|homedesigner|design mascot/.test(text)) {
    return {
      groupId: "designer_mascot",
      baseLabel: "Designer Mascot",
      variants: MASCOT_VARIANTS.variants,
    };
  }
  if (/homecheff|mascot/.test(text)) {
    return MASCOT_VARIANTS;
  }
  return {
    groupId: `character_${document.sessionId.slice(0, 8)}`,
    baseLabel: document.name,
    variants: [
      { id: "default", labelKey: "editor.assetIntel.variant.default" },
      { id: "motion", labelKey: "editor.assetIntel.variant.motion" },
      { id: "outfit", labelKey: "editor.assetIntel.variant.outfit" },
    ],
  };
}
