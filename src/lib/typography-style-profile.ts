/**
 * Typography style preservation — visual identity per locked text region.
 */

import type { DetectedTextBlock } from "@/lib/baked-text-detection";
import type { LockedTextAlign, LockedTextLayer } from "@/lib/locked-text-layer";

export type TypographyRenderQuality = "standard" | "premium" | "ultra";

export const DEFAULT_TYPOGRAPHY_RENDER_QUALITY: TypographyRenderQuality = "premium";

export type TypographyFontFamilyStyle =
  | "sans-bold"
  | "sans-display"
  | "comic"
  | "ui-card"
  | "cta";

export type TypographyTextRole = "headline" | "cta" | "caption" | "ui" | "body";

export type TypographyBackgroundShape = "rect" | "pill" | "comic-bubble" | "ui-card";

export type TypographyStyleProfile = {
  fontFamilyStyle: TypographyFontFamilyStyle;
  fontSize: number;
  fontWeight: number;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  lineHeight: number;
  letterSpacing: number;
  textAlign: LockedTextAlign;
  padding: { top: number; right: number; bottom: number; left: number };
  fillColor: string;
  stroke?: { color: string; width: number };
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  glow?: { color: string; blur: number; opacity: number };
  gradient?: { from: string; to: string; angle: number };
  opacity: number;
  background?: {
    color: string;
    opacity: number;
    borderRadius: number;
    shape: TypographyBackgroundShape;
  };
  role: TypographyTextRole;
  compositing: {
    direction: "ltr" | "rtl";
    motionAnchor: { x: number; y: number };
    trackingStability: "static" | "smooth";
    subpixelSnap: boolean;
  };
};

export type TypographyFitResult = {
  fontSize: number;
  lines: string[];
  lineHeightPx: number;
  overflowWarning: boolean;
  readabilityScore: number;
};

export function typographyRenderScale(quality: TypographyRenderQuality): number {
  switch (quality) {
    case "ultra":
      return 3;
    case "premium":
      return 2;
    default:
      return 1;
  }
}

export function typographyEncodePreset(quality: TypographyRenderQuality): {
  crf: string;
  preset: string;
} {
  switch (quality) {
    case "ultra":
      return { crf: "18", preset: "slow" };
    case "premium":
      return { crf: "20", preset: "medium" };
    default:
      return { crf: "23", preset: "veryfast" };
  }
}

export function isTypographyRenderQuality(value: string): value is TypographyRenderQuality {
  return value === "standard" || value === "premium" || value === "ultra";
}

function inferRole(
  blockType?: DetectedTextBlock["blockType"],
  text?: string
): TypographyTextRole {
  if (blockType === "cta") {
    return "cta";
  }
  if (blockType === "caption") {
    return "caption";
  }
  if (blockType === "ui") {
    return "ui";
  }
  const len = (text ?? "").trim().length;
  if (len > 0 && len < 28) {
    return "headline";
  }
  return "body";
}

function inferFontFamilyStyle(
  role: TypographyTextRole,
  stylePreset?: string | null
): TypographyFontFamilyStyle {
  const preset = (stylePreset ?? "").toLowerCase();
  if (preset.includes("social") || preset.includes("comic") || preset.includes("boost")) {
    return role === "cta" ? "comic" : "sans-display";
  }
  if (role === "cta") {
    return "cta";
  }
  if (role === "ui") {
    return "ui-card";
  }
  if (role === "headline") {
    return "sans-display";
  }
  return "sans-bold";
}

function inferBackground(
  role: TypographyTextRole,
  backgroundColor?: string
): TypographyStyleProfile["background"] | undefined {
  if (!backgroundColor?.trim()) {
    if (role === "ui") {
      return {
        color: "#0f172a",
        opacity: 0.82,
        borderRadius: 12,
        shape: "ui-card",
      };
    }
    if (role === "cta") {
      return {
        color: "#ea580c",
        opacity: 0.92,
        borderRadius: 999,
        shape: "pill",
      };
    }
    return undefined;
  }
  return {
    color: backgroundColor,
    opacity: 0.9,
    borderRadius: role === "cta" ? 999 : 14,
    shape: role === "cta" ? "pill" : "rect",
  };
}

function inferStrokeAndShadow(role: TypographyTextRole, fillColor: string): {
  stroke?: TypographyStyleProfile["stroke"];
  shadow?: TypographyStyleProfile["shadow"];
  glow?: TypographyStyleProfile["glow"];
} {
  if (role === "headline" || role === "cta") {
    return {
      stroke: { color: "#0f172a", width: 2 },
      shadow: { color: "rgba(15,23,42,0.55)", blur: 8, offsetX: 0, offsetY: 3 },
      glow:
        role === "cta"
          ? { color: fillColor, blur: 14, opacity: 0.35 }
          : undefined,
    };
  }
  return {
    shadow: { color: "rgba(0,0,0,0.45)", blur: 4, offsetX: 0, offsetY: 2 },
  };
}

/** Analyze a locked / baked region into a reusable typography profile. */
export function analyzeTypographyStyleProfile(params: {
  sourceText: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  textAlign?: LockedTextAlign;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  blockType?: DetectedTextBlock["blockType"];
  stylePreset?: string | null;
  languageCode?: string;
}): TypographyStyleProfile {
  const role = inferRole(params.blockType, params.sourceText);
  const baseSize = Math.max(16, Math.min(96, Math.round(params.fontSize ?? 42)));
  const fillColor = params.color?.trim() || "#FFFFFF";
  const align = params.textAlign ?? (params.languageCode === "ar" ? "right" : "center");
  const isRtl = params.languageCode === "ar";
  const fontFamilyStyle = inferFontFamilyStyle(role, params.stylePreset);
  const padding =
    role === "cta"
      ? { top: 10, right: 22, bottom: 10, left: 22 }
      : role === "ui"
        ? { top: 8, right: 14, bottom: 8, left: 14 }
        : { top: 6, right: 12, bottom: 6, left: 12 };

  const textTransform: TypographyStyleProfile["textTransform"] =
    role === "cta" && params.sourceText.length < 32 ? "uppercase" : "none";

  const effects = inferStrokeAndShadow(role, fillColor);

  return {
    fontFamilyStyle,
    fontSize: baseSize,
    fontWeight: role === "cta" || role === "headline" ? 800 : 700,
    textTransform,
    lineHeight: role === "caption" ? 1.25 : 1.12,
    letterSpacing: role === "cta" ? 0.06 : 0.02,
    textAlign: isRtl ? "right" : align,
    padding,
    fillColor,
    ...effects,
    opacity: 1,
    background: inferBackground(role, params.backgroundColor),
    role,
    compositing: {
      direction: isRtl ? "rtl" : "ltr",
      motionAnchor: {
        x: params.x ?? 0.5,
        y: params.y ?? 0.1,
      },
      trackingStability: "smooth",
      subpixelSnap: true,
    },
  };
}

export function analyzeTypographyFromLockedLayer(
  layer: LockedTextLayer,
  options?: { stylePreset?: string | null; languageCode?: string }
): TypographyStyleProfile {
  return analyzeTypographyStyleProfile({
    sourceText: layer.text,
    fontSize: layer.fontSize,
    color: layer.color,
    backgroundColor: layer.backgroundColor,
    textAlign: layer.textAlign,
    x: layer.x,
    y: layer.y,
    stylePreset: options?.stylePreset,
    languageCode: options?.languageCode,
  });
}

export function parseTypographyStyleProfile(value: unknown): TypographyStyleProfile | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const o = value as Record<string, unknown>;
  const textAlign =
    o.textAlign === "left" || o.textAlign === "center" || o.textAlign === "right"
      ? o.textAlign
      : "center";
  const compositingRaw = o.compositing as Record<string, unknown> | undefined;
  const motionRaw = compositingRaw?.motionAnchor as Record<string, unknown> | undefined;
  return {
    fontFamilyStyle:
      o.fontFamilyStyle === "comic" ||
      o.fontFamilyStyle === "cta" ||
      o.fontFamilyStyle === "ui-card" ||
      o.fontFamilyStyle === "sans-display"
        ? o.fontFamilyStyle
        : "sans-bold",
    fontSize: typeof o.fontSize === "number" ? o.fontSize : 42,
    fontWeight: typeof o.fontWeight === "number" ? o.fontWeight : 700,
    textTransform:
      o.textTransform === "uppercase" ||
      o.textTransform === "lowercase" ||
      o.textTransform === "capitalize"
        ? o.textTransform
        : "none",
    lineHeight: typeof o.lineHeight === "number" ? o.lineHeight : 1.15,
    letterSpacing: typeof o.letterSpacing === "number" ? o.letterSpacing : 0,
    textAlign,
    padding: parsePadding(o.padding),
    fillColor: typeof o.fillColor === "string" ? o.fillColor : "#FFFFFF",
    stroke: parseStroke(o.stroke),
    shadow: parseShadow(o.shadow),
    glow: parseGlow(o.glow),
    gradient: parseGradient(o.gradient),
    opacity: typeof o.opacity === "number" ? o.opacity : 1,
    background: parseBackground(o.background),
    role:
      o.role === "cta" ||
      o.role === "caption" ||
      o.role === "ui" ||
      o.role === "headline"
        ? o.role
        : "body",
    compositing: {
      direction: compositingRaw?.direction === "rtl" ? "rtl" : "ltr",
      motionAnchor: {
        x: typeof motionRaw?.x === "number" ? motionRaw.x : 0.5,
        y: typeof motionRaw?.y === "number" ? motionRaw.y : 0.1,
      },
      trackingStability:
        compositingRaw?.trackingStability === "static" ? "static" : "smooth",
      subpixelSnap: compositingRaw?.subpixelSnap !== false,
    },
  };
}

function parsePadding(value: unknown): TypographyStyleProfile["padding"] {
  if (!value || typeof value !== "object") {
    return { top: 8, right: 12, bottom: 8, left: 12 };
  }
  const p = value as Record<string, unknown>;
  return {
    top: typeof p.top === "number" ? p.top : 8,
    right: typeof p.right === "number" ? p.right : 12,
    bottom: typeof p.bottom === "number" ? p.bottom : 8,
    left: typeof p.left === "number" ? p.left : 12,
  };
}

function parseStroke(value: unknown): TypographyStyleProfile["stroke"] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const s = value as Record<string, unknown>;
  if (typeof s.color !== "string" || typeof s.width !== "number") {
    return undefined;
  }
  return { color: s.color, width: s.width };
}

function parseShadow(value: unknown): TypographyStyleProfile["shadow"] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const s = value as Record<string, unknown>;
  if (typeof s.color !== "string") {
    return undefined;
  }
  return {
    color: s.color,
    blur: typeof s.blur === "number" ? s.blur : 6,
    offsetX: typeof s.offsetX === "number" ? s.offsetX : 0,
    offsetY: typeof s.offsetY === "number" ? s.offsetY : 2,
  };
}

function parseGlow(value: unknown): TypographyStyleProfile["glow"] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const g = value as Record<string, unknown>;
  if (typeof g.color !== "string") {
    return undefined;
  }
  return {
    color: g.color,
    blur: typeof g.blur === "number" ? g.blur : 10,
    opacity: typeof g.opacity === "number" ? g.opacity : 0.4,
  };
}

function parseGradient(value: unknown): TypographyStyleProfile["gradient"] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const g = value as Record<string, unknown>;
  if (typeof g.from !== "string" || typeof g.to !== "string") {
    return undefined;
  }
  return {
    from: g.from,
    to: g.to,
    angle: typeof g.angle === "number" ? g.angle : 90,
  };
}

function parseBackground(value: unknown): TypographyStyleProfile["background"] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const b = value as Record<string, unknown>;
  if (typeof b.color !== "string") {
    return undefined;
  }
  const shape =
    b.shape === "pill" ||
    b.shape === "comic-bubble" ||
    b.shape === "ui-card" ||
    b.shape === "rect"
      ? b.shape
      : "rect";
  return {
    color: b.color,
    opacity: typeof b.opacity === "number" ? b.opacity : 0.85,
    borderRadius: typeof b.borderRadius === "number" ? b.borderRadius : 12,
    shape,
  };
}

export function resolveTypographyCssFontFamily(
  languageCode: string,
  style: TypographyFontFamilyStyle
): string {
  if (languageCode === "ar") {
    return (
      process.env.TYPOGRAPHY_AR_FONT_FAMILY?.trim() ||
      "Noto Sans Arabic, Noto Naskh Arabic, Arial, sans-serif"
    );
  }
  switch (style) {
    case "comic":
      return "Arial Black, Impact, Haettenschweiler, sans-serif";
    case "cta":
      return "Arial Black, Arial Bold, Helvetica Neue, sans-serif";
    case "ui-card":
      return "Helvetica Neue, Arial, sans-serif";
    case "sans-display":
      return "Arial Bold, Helvetica Neue, sans-serif";
    default:
      return "Arial, Helvetica Neue, sans-serif";
  }
}

export function applyTextTransform(
  text: string,
  transform: TypographyStyleProfile["textTransform"]
): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }
  switch (transform) {
    case "uppercase":
      return trimmed.toUpperCase();
    case "lowercase":
      return trimmed.toLowerCase();
    case "capitalize":
      return trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
    default:
      return trimmed;
  }
}
