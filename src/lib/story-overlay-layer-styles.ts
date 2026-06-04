/**
 * Per-layer Story Mode overlay style overrides (text-only / full rerender).
 * Client-safe — no server-only imports.
 */

export const STORY_OVERLAY_STYLE_LAYERS = [
  "headline",
  "title",
  "subtitle",
  "hero",
  "finale",
  "footer",
] as const;

export type StoryOverlayStyleLayer = (typeof STORY_OVERLAY_STYLE_LAYERS)[number];

export type StoryOverlayFontSizePreset = "smaller" | "normal" | "larger" | "custom";
export type StoryOverlayShadowPreset = "none" | "light" | "medium" | "strong";
export type StoryOverlayOutlinePreset = "none" | "light" | "medium";
export type StoryOverlayAlignPreset = "left" | "center" | "right";
export type StoryOverlayPositionPreset = "top" | "middle" | "bottom" | "auto";

export type StoryOverlayLayerStyleOverride = {
  /** When true, ignore all other fields and use adaptive auto styling. */
  useAuto?: boolean;
  fontSize?: StoryOverlayFontSizePreset;
  fontSizeCustomPx?: number;
  textColor?: string;
  backdropEnabled?: boolean;
  backdropOpacity?: number;
  backdropColor?: string;
  shadow?: StoryOverlayShadowPreset;
  outline?: StoryOverlayOutlinePreset;
  alignment?: StoryOverlayAlignPreset;
  position?: StoryOverlayPositionPreset;
};

export type StoryOverlayLayerStyles = Partial<
  Record<StoryOverlayStyleLayer, StoryOverlayLayerStyleOverride>
>;

const FONT_SCALE: Record<Exclude<StoryOverlayFontSizePreset, "custom">, number> = {
  smaller: 0.85,
  normal: 1,
  larger: 1.15,
};

export function emptyOverlayLayerStyles(): StoryOverlayLayerStyles {
  return {};
}

export function isLayerStyleCustomized(
  override: StoryOverlayLayerStyleOverride | undefined
): boolean {
  if (!override) {
    return false;
  }
  if (override.useAuto === true) {
    return false;
  }
  return (
    override.fontSize !== undefined ||
    override.fontSizeCustomPx !== undefined ||
    Boolean(override.textColor?.trim()) ||
    override.backdropEnabled !== undefined ||
    override.backdropOpacity !== undefined ||
    Boolean(override.backdropColor?.trim()) ||
    override.shadow !== undefined ||
    override.outline !== undefined ||
    override.alignment !== undefined ||
    (override.position !== undefined && override.position !== "auto")
  );
}

export function hasCustomOverlayLayerStyles(styles: StoryOverlayLayerStyles | undefined): boolean {
  if (!styles) {
    return false;
  }
  return STORY_OVERLAY_STYLE_LAYERS.some((layer) =>
    isLayerStyleCustomized(styles[layer])
  );
}

/** Merge or clear a single layer override (client editors). */
export function patchOverlayLayerStyles(
  styles: StoryOverlayLayerStyles,
  layer: StoryOverlayStyleLayer,
  patch: Partial<StoryOverlayLayerStyleOverride> | null
): StoryOverlayLayerStyles {
  const next = { ...styles };
  if (!patch) {
    delete next[layer];
    return next;
  }
  const merged = { ...next[layer], ...patch };
  delete merged.useAuto;
  next[layer] = merged;
  return next;
}

export function clearOverlayLayerStyles(): StoryOverlayLayerStyles {
  return {};
}

export function sanitizeOverlayLayerStyles(
  raw: StoryOverlayLayerStyles | undefined | null
): StoryOverlayLayerStyles {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const out: StoryOverlayLayerStyles = {};
  for (const layer of STORY_OVERLAY_STYLE_LAYERS) {
    const row = raw[layer];
    if (!row || typeof row !== "object") {
      continue;
    }
    const cleaned: StoryOverlayLayerStyleOverride = {};
    if (row.useAuto === true) {
      cleaned.useAuto = true;
      out[layer] = cleaned;
      continue;
    }
    if (
      row.fontSize === "smaller" ||
      row.fontSize === "normal" ||
      row.fontSize === "larger" ||
      row.fontSize === "custom"
    ) {
      cleaned.fontSize = row.fontSize;
    }
    if (typeof row.fontSizeCustomPx === "number" && Number.isFinite(row.fontSizeCustomPx)) {
      cleaned.fontSizeCustomPx = Math.round(
        Math.max(18, Math.min(160, row.fontSizeCustomPx))
      );
    }
    if (typeof row.textColor === "string" && /^#[0-9a-fA-F]{6}$/.test(row.textColor.trim())) {
      cleaned.textColor = row.textColor.trim();
    }
    if (typeof row.backdropEnabled === "boolean") {
      cleaned.backdropEnabled = row.backdropEnabled;
    }
    if (typeof row.backdropOpacity === "number" && Number.isFinite(row.backdropOpacity)) {
      cleaned.backdropOpacity = Math.max(0, Math.min(1, row.backdropOpacity));
    }
    if (
      typeof row.backdropColor === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(row.backdropColor.trim())
    ) {
      cleaned.backdropColor = row.backdropColor.trim();
    }
    if (row.shadow === "none" || row.shadow === "light" || row.shadow === "medium" || row.shadow === "strong") {
      cleaned.shadow = row.shadow;
    }
    if (row.outline === "none" || row.outline === "light" || row.outline === "medium") {
      cleaned.outline = row.outline;
    }
    if (row.alignment === "left" || row.alignment === "center" || row.alignment === "right") {
      cleaned.alignment = row.alignment;
    }
    if (
      row.position === "top" ||
      row.position === "middle" ||
      row.position === "bottom" ||
      row.position === "auto"
    ) {
      cleaned.position = row.position;
    }
    if (isLayerStyleCustomized(cleaned)) {
      out[layer] = cleaned;
    }
  }
  return out;
}

export function assAlignmentForLayer(
  layer: StoryOverlayStyleLayer,
  alignment: StoryOverlayAlignPreset | undefined,
  fallback: number
): number {
  if (!alignment || alignment === "center") {
    return fallback;
  }
  const vertical =
    layer === "headline" || layer === "hero" || layer === "finale" ? "top"
    : layer === "footer" ? "bottom"
    : "middle";
  if (vertical === "top") {
    return alignment === "left" ? 7 : alignment === "right" ? 9 : 8;
  }
  if (vertical === "bottom") {
    return alignment === "left" ? 1 : alignment === "right" ? 3 : 2;
  }
  return alignment === "left" ? 4 : alignment === "right" ? 6 : 5;
}

export type LayerStyleValidationWarning = {
  layer: StoryOverlayStyleLayer;
  code: "font_too_large" | "low_contrast_no_backdrop" | "position_clamped";
  message: string;
};

export function validateLayerStyleOverrides(
  styles: StoryOverlayLayerStyles,
  frameHeight: number
): LayerStyleValidationWarning[] {
  const warnings: LayerStyleValidationWarning[] = [];
  for (const layer of STORY_OVERLAY_STYLE_LAYERS) {
    const row = styles[layer];
    if (!isLayerStyleCustomized(row)) {
      continue;
    }
    if (row!.fontSize === "custom" && (row!.fontSizeCustomPx ?? 0) > frameHeight * 0.12) {
      warnings.push({
        layer,
        code: "font_too_large",
        message: "Font size capped to avoid covering faces.",
      });
    }
    if (
      row!.backdropEnabled === false &&
      row!.outline === "none" &&
      row!.shadow === "none"
    ) {
      warnings.push({
        layer,
        code: "low_contrast_no_backdrop",
        message: "Added light outline for readability.",
      });
    }
  }
  return warnings;
}

export function previewInlineStyleForLayer(
  override: StoryOverlayLayerStyleOverride | undefined,
  baseFontRem = 1
): Record<string, string | number> {
  if (!isLayerStyleCustomized(override)) {
    return {};
  }
  const css: Record<string, string | number> = {};
  const preset = override!.fontSize ?? "normal";
  if (preset === "custom" && override!.fontSizeCustomPx) {
    css.fontSize = `${Math.round(override!.fontSizeCustomPx * 0.22)}px`;
  } else if (preset !== "normal" && preset !== "custom") {
    css.fontSize = `${baseFontRem * FONT_SCALE[preset]}rem`;
  }
  if (override!.textColor) {
    css.color = override!.textColor;
  }
  if (override!.shadow === "light") {
    css.textShadow = "0 1px 3px rgba(0,0,0,0.45)";
  } else if (override!.shadow === "medium") {
    css.textShadow = "0 2px 8px rgba(0,0,0,0.55)";
  } else if (override!.shadow === "strong") {
    css.textShadow = "0 4px 14px rgba(0,0,0,0.7)";
  } else if (override!.shadow === "none") {
    css.textShadow = "none";
  }
  if (override!.backdropEnabled) {
    const opacity = override!.backdropOpacity ?? 0.55;
    const hex = (override!.backdropColor ?? "#000000").replace("#", "");
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    css.backgroundColor = `rgba(${r},${g},${b},${opacity})`;
    css.padding = "4px 8px";
    css.borderRadius = "6px";
    css.display = "inline-block";
  } else if (override!.backdropEnabled === false) {
    css.backgroundColor = "transparent";
    css.padding = "0";
  }
  if (override!.alignment === "left") {
    css.textAlign = "left";
  } else if (override!.alignment === "right") {
    css.textAlign = "right";
  } else if (override!.alignment === "center") {
    css.textAlign = "center";
  }
  return css;
}
