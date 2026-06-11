import type { EditorStyleAttribute } from "@/types/editor-instruction-studio";

export type EditorStyleActionOption = {
  id: string;
  labelKey: string;
  instructionSuffix: string;
};

export const EDITOR_STYLE_ACTIONS: Record<EditorStyleAttribute, EditorStyleActionOption[]> = {
  head_shape: [
    { id: "more_rounded", labelKey: "editor.instructionStudio.v2.style.headShape.moreRounded", instructionSuffix: "more rounded" },
    { id: "more_realistic", labelKey: "editor.instructionStudio.v2.style.headShape.moreRealistic", instructionSuffix: "more realistic" },
    { id: "more_angular", labelKey: "editor.instructionStudio.v2.style.headShape.moreAngular", instructionSuffix: "more angular" },
    { id: "more_cartoon", labelKey: "editor.instructionStudio.v2.style.headShape.moreCartoon", instructionSuffix: "more cartoon-like" },
  ],
  body_proportions: [
    { id: "more_realistic", labelKey: "editor.instructionStudio.v2.style.bodyProportions.moreRealistic", instructionSuffix: "more realistic" },
    { id: "more_mascot", labelKey: "editor.instructionStudio.v2.style.bodyProportions.moreMascot", instructionSuffix: "more mascot-like" },
    { id: "more_athletic", labelKey: "editor.instructionStudio.v2.style.bodyProportions.moreAthletic", instructionSuffix: "more athletic" },
    { id: "more_compact", labelKey: "editor.instructionStudio.v2.style.bodyProportions.moreCompact", instructionSuffix: "more compact" },
    { id: "more_premium", labelKey: "editor.instructionStudio.v2.style.bodyProportions.morePremium", instructionSuffix: "more premium" },
  ],
  facial_style: [
    { id: "friendlier", labelKey: "editor.instructionStudio.v2.style.facialStyle.friendlier", instructionSuffix: "friendlier" },
    { id: "more_expressive", labelKey: "editor.instructionStudio.v2.style.facialStyle.moreExpressive", instructionSuffix: "more expressive" },
    { id: "more_serious", labelKey: "editor.instructionStudio.v2.style.facialStyle.moreSerious", instructionSuffix: "more serious" },
    { id: "more_modern", labelKey: "editor.instructionStudio.v2.style.facialStyle.moreModern", instructionSuffix: "more modern" },
    { id: "more_detailed", labelKey: "editor.instructionStudio.v2.style.facialStyle.moreDetailed", instructionSuffix: "more detailed" },
  ],
  outline_style: [
    { id: "thicker", labelKey: "editor.instructionStudio.v2.style.outlineStyle.thicker", instructionSuffix: "thicker outlines" },
    { id: "thinner", labelKey: "editor.instructionStudio.v2.style.outlineStyle.thinner", instructionSuffix: "thinner outlines" },
    { id: "cleaner", labelKey: "editor.instructionStudio.v2.style.outlineStyle.cleaner", instructionSuffix: "cleaner outlines" },
    { id: "premium", labelKey: "editor.instructionStudio.v2.style.outlineStyle.premium", instructionSuffix: "premium illustration outlines" },
  ],
  color_palette: [
    { id: "more_vibrant", labelKey: "editor.instructionStudio.v2.style.colorPalette.moreVibrant", instructionSuffix: "more vibrant" },
    { id: "more_premium", labelKey: "editor.instructionStudio.v2.style.colorPalette.morePremium", instructionSuffix: "more premium" },
    { id: "more_playful", labelKey: "editor.instructionStudio.v2.style.colorPalette.morePlayful", instructionSuffix: "more playful" },
    { id: "more_realistic", labelKey: "editor.instructionStudio.v2.style.colorPalette.moreRealistic", instructionSuffix: "more realistic" },
    { id: "more_luxury", labelKey: "editor.instructionStudio.v2.style.colorPalette.moreLuxury", instructionSuffix: "more luxury" },
  ],
  brand_colors: [
    { id: "stronger_brand", labelKey: "editor.instructionStudio.v2.style.brandColors.stronger", instructionSuffix: "stronger brand colors" },
    { id: "stronger_homecheff", labelKey: "editor.rec.homecheff.style.brandColors.stronger", instructionSuffix: "stronger HomeCheff brand colors" },
    { id: "reduce_branding", labelKey: "editor.instructionStudio.v2.style.brandColors.reduce", instructionSuffix: "reduced branding colors" },
    { id: "modernize", labelKey: "editor.instructionStudio.v2.style.brandColors.modernize", instructionSuffix: "modernized brand palette" },
  ],
  illustration_style: [
    { id: "more_2d", labelKey: "editor.instructionStudio.v2.style.illustrationStyle.more2d", instructionSuffix: "more 2D" },
    { id: "more_3d", labelKey: "editor.instructionStudio.v2.style.illustrationStyle.more3d", instructionSuffix: "more 3D" },
    { id: "more_realistic", labelKey: "editor.instructionStudio.v2.style.illustrationStyle.moreRealistic", instructionSuffix: "more realistic" },
    { id: "more_cinematic", labelKey: "editor.instructionStudio.v2.style.illustrationStyle.moreCinematic", instructionSuffix: "more cinematic" },
    { id: "more_mascot", labelKey: "editor.instructionStudio.v2.style.illustrationStyle.moreMascot", instructionSuffix: "more mascot-driven" },
  ],
  silhouette: [
    { id: "more_recognizable", labelKey: "editor.instructionStudio.v2.style.silhouette.moreRecognizable", instructionSuffix: "more recognizable silhouette" },
    { id: "more_iconic", labelKey: "editor.instructionStudio.v2.style.silhouette.moreIconic", instructionSuffix: "more iconic silhouette" },
    { id: "more_compact", labelKey: "editor.instructionStudio.v2.style.silhouette.moreCompact", instructionSuffix: "more compact silhouette" },
    { id: "more_dynamic", labelKey: "editor.instructionStudio.v2.style.silhouette.moreDynamic", instructionSuffix: "more dynamic silhouette" },
  ],
  visual_identity: [
    { id: "strengthen", labelKey: "editor.instructionStudio.v2.style.visualIdentity.strengthen", instructionSuffix: "strengthen visual identity" },
    { id: "soften", labelKey: "editor.instructionStudio.v2.style.visualIdentity.soften", instructionSuffix: "soften visual identity" },
  ],
  identity_markers: [
    { id: "emphasize", labelKey: "editor.instructionStudio.v2.style.identityMarkers.emphasize", instructionSuffix: "emphasize identity markers" },
    { id: "refine", labelKey: "editor.instructionStudio.v2.style.identityMarkers.refine", instructionSuffix: "refine identity markers" },
  ],
  line_weight: [
    { id: "lighter", labelKey: "editor.instructionStudio.v2.style.lineWeight.lighter", instructionSuffix: "lighter line weight" },
    { id: "stronger", labelKey: "editor.instructionStudio.v2.style.lineWeight.stronger", instructionSuffix: "stronger line weight" },
    { id: "consistent", labelKey: "editor.instructionStudio.v2.style.lineWeight.consistent", instructionSuffix: "consistent line weight" },
    { id: "premium", labelKey: "editor.instructionStudio.v2.style.lineWeight.premium", instructionSuffix: "premium illustration line weight" },
  ],
};

export function styleAttributeLabelKey(attribute: EditorStyleAttribute): string {
  return `editor.instructionStudio.v2.style.attribute.${attribute}`;
}

export function summarizeStyleChangeInstruction(
  attribute: EditorStyleAttribute,
  action: EditorStyleActionOption
): string {
  const label = attribute.replace(/_/g, " ");
  return `Make ${label} ${action.instructionSuffix}`;
}
