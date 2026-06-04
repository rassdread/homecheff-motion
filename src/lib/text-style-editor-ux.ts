/**
 * Text style editor UX helpers (collapsed summary, badges, scene status).
 * Client-safe — no React.
 */

import {
  hasCustomOverlayLayerStyles,
  isLayerStyleCustomized,
  patchOverlayLayerStyles,
  type StoryOverlayFontSizePreset,
  type StoryOverlayLayerStyleOverride,
  type StoryOverlayLayerStyles,
  type StoryOverlayStyleLayer,
} from "@/lib/story-overlay-layer-styles";

/** UI default: text style editor starts collapsed. */
export const TEXT_STYLE_EDITOR_DEFAULT_EXPANDED = false as const;

export type SceneTextStyleStatus = "automatic" | "custom";
export type LayerTextStyleBadge = "automatic" | "custom";

export type AutomaticStyleSummaryField =
  | "fontSize"
  | "textColor"
  | "backdrop"
  | "position";

export type AutomaticStyleSummaryLine = {
  field: AutomaticStyleSummaryField;
  /** i18n key under instant.textStyle.summary.value.* or fontSize.* */
  valueKey: string;
};

/** Scene list + collapsed section headline state. */
export function sceneTextStyleStatus(
  styles: StoryOverlayLayerStyles | undefined
): SceneTextStyleStatus {
  return hasCustomOverlayLayerStyles(styles) ? "custom" : "automatic";
}

export function layerTextStyleBadge(
  override: StoryOverlayLayerStyleOverride | undefined
): LayerTextStyleBadge {
  return isLayerStyleCustomized(override) ? "custom" : "automatic";
}

/**
 * Informational AI-default labels shown while the editor is collapsed.
 * Reflects adaptive auto styling, not per-layer overrides.
 */
export function buildAutomaticStyleSummaryLines(): AutomaticStyleSummaryLine[] {
  const fontSize: StoryOverlayFontSizePreset = "normal";
  return [
    { field: "fontSize", valueKey: `instant.textStyle.fontSize.${fontSize}` },
    { field: "textColor", valueKey: "instant.textStyle.auto" },
    { field: "backdrop", valueKey: "instant.textStyle.backdrop.auto" },
    { field: "position", valueKey: "instant.textStyle.position.auto" },
  ];
}

export function summaryFieldLabelKey(field: AutomaticStyleSummaryField): string {
  return `instant.textStyle.summary.label.${field}`;
}
