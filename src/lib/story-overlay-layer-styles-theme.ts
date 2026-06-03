/**
 * Server-side theme/font merging for Story overlay layer style overrides.
 */

import type { AdaptiveOverlayTheme } from "@/server/animation-export/adaptive-overlay-style";
import { hexToAssColor } from "@/server/animation-export/adaptive-overlay-style";
import { capStoryOverlayFontSize } from "@/lib/story-overlay-typography-scale";
import {
  isLayerStyleCustomized,
  type StoryOverlayFontSizePreset,
  type StoryOverlayLayerStyleOverride,
  type StoryOverlayOutlinePreset,
  type StoryOverlayShadowPreset,
  type StoryOverlayStyleLayer,
} from "@/lib/story-overlay-layer-styles";

const SHADOW_PX: Record<StoryOverlayShadowPreset, number> = {
  none: 0,
  light: 2,
  medium: 4,
  strong: 6,
};

const OUTLINE_PX: Record<StoryOverlayOutlinePreset, number> = {
  none: 0,
  light: 3,
  medium: 6,
};

const FONT_SCALE: Record<Exclude<StoryOverlayFontSizePreset, "custom">, number> = {
  smaller: 0.85,
  normal: 1,
  larger: 1.15,
};

function assBackdropColor(hex: string, opacity: number): string {
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  const raw = hex.replace(/^#/, "");
  const r = raw.slice(0, 2);
  const g = raw.slice(2, 4);
  const b = raw.slice(4, 6);
  return `&H${alpha}${b}${g}${r}&`;
}

export function mergeLayerStyleIntoTheme(
  base: AdaptiveOverlayTheme,
  override: StoryOverlayLayerStyleOverride | undefined
): AdaptiveOverlayTheme {
  if (!isLayerStyleCustomized(override)) {
    return base;
  }
  let theme: AdaptiveOverlayTheme = { ...base };
  if (override!.textColor) {
    try {
      theme = { ...theme, primaryColorAss: hexToAssColor(override!.textColor) };
    } catch {
      /* keep base */
    }
  }
  if (override!.shadow) {
    theme = { ...theme, shadow: SHADOW_PX[override!.shadow] };
  }
  if (override!.outline) {
    theme = { ...theme, outline: OUTLINE_PX[override!.outline] };
  }
  if (override!.backdropEnabled === false) {
    theme = { ...theme, useBackdrop: false, backdropOpacity: 0 };
  } else if (override!.backdropEnabled === true) {
    theme = { ...theme, useBackdrop: true };
    if (override!.backdropOpacity != null) {
      theme = { ...theme, backdropOpacity: override!.backdropOpacity };
    }
    if (override!.backdropColor) {
      try {
        theme = {
          ...theme,
          backdropColorAss: assBackdropColor(
            override!.backdropColor,
            (override!.backdropOpacity ?? theme.backdropOpacity) || 0.5
          ),
        };
      } catch {
        /* keep base */
      }
    }
  }
  return enforceReadableTheme(theme);
}

/** Prevent transparent text with no contrast helpers. */
export function enforceReadableTheme(theme: AdaptiveOverlayTheme): AdaptiveOverlayTheme {
  if (!theme.useBackdrop && theme.outline <= 0 && theme.shadow <= 0) {
    return { ...theme, outline: Math.max(theme.outline, 3), shadow: Math.max(theme.shadow, 2) };
  }
  return theme;
}

export function applyLayerFontSize(
  baseSize: number,
  layer: StoryOverlayStyleLayer,
  override: StoryOverlayLayerStyleOverride | undefined,
  frameWidth: number,
  frameHeight: number
): number {
  if (!isLayerStyleCustomized(override)) {
    return baseSize;
  }
  const role =
    layer === "headline" ? "headline"
    : layer === "title" ? "title"
    : layer === "subtitle" || layer === "footer" ? "subtitle"
    : layer === "hero" || layer === "finale" ? "hero"
    : "title";
  let size = baseSize;
  const preset = override!.fontSize ?? "normal";
  if (preset === "custom" && override!.fontSizeCustomPx) {
    size = override!.fontSizeCustomPx;
  } else if (preset !== "normal" && preset !== "custom") {
    size = Math.round(baseSize * FONT_SCALE[preset]);
  }
  return capStoryOverlayFontSize(role, size, frameWidth, frameHeight);
}
