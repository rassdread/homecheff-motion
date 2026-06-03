/**
 * Adaptive Typography V1 — font size, line breaks, and backdrop strength from safe-zone space.
 */

import {
  scaleStoryOverlayTemplateBase,
  scaleStoryOverlayFontSize,
  STORY_LEGACY_TITLE_HEIGHT_FRACTION,
  STORY_SUBTITLE_TO_TITLE_RATIO,
} from "@/lib/story-overlay-typography-scale";
import type { SceneIntent } from "@/server/animation-export/scene-intent-rules";
import {
  isSafeZoneDebugEnabled,
  SAFE_AREA_MARGIN_H,
  SAFE_AREA_MARGIN_V,
  type SafeZoneId,
  type SafeZonePlacement,
} from "@/server/animation-export/safe-zone-placement";
import type { AdaptiveOverlayTheme } from "@/server/animation-export/adaptive-overlay-style";

export type AdaptiveTypographyTemplate =
  | "hero"
  | "hero_small"
  | "headline"
  | "scene"
  | "subtitle"
  | "sequence"
  | "hero_finale";

export type AdaptiveTypographyInput = {
  text: string;
  template: AdaptiveTypographyTemplate;
  frameWidth: number;
  frameHeight: number;
  selectedZone: SafeZoneId;
  safeZoneScore: number;
  textWidthFraction?: number;
  sceneIntent?: SceneIntent;
  isBusy?: boolean;
  contrast?: number;
  objectDetectionConfidence?: number;
  accentWords?: string[];
};

export type AdaptiveTypographyResult = {
  fontSize: number;
  lineHeight: number;
  maxTextWidthPx: number;
  maxLines: number;
  lines: string[];
  alignment: "left" | "center" | "right";
  backdropMode: "none" | "soft" | "strong";
  outlineStrength: "light" | "medium" | "strong";
  confidence: number;
  reason: string;
};

const REF_WIDTH = 1080;
const REF_HEIGHT = 1920;

const BRAND_TERMS = ["HOMECHEFF", "HOMEGARDEN", "HOMEDESIGNER", "HCP"] as const;

const TEMPLATE_BASES: Record<
  AdaptiveTypographyTemplate,
  { default: number; min: number; max: number; maxLines: number }
> = {
  hero: {
    ...scaleStoryOverlayTemplateBase({ default: 118, min: 78, max: 144, role: "headline" }),
    maxLines: 3,
  },
  hero_small: {
    ...scaleStoryOverlayTemplateBase({ default: 74, min: 54, max: 92, role: "headline" }),
    maxLines: 3,
  },
  headline: {
    ...scaleStoryOverlayTemplateBase({ default: 96, min: 68, max: 118, role: "headline" }),
    maxLines: 2,
  },
  scene: {
    ...scaleStoryOverlayTemplateBase({ default: 72, min: 48, max: 92, role: "title" }),
    maxLines: 2,
  },
  subtitle: {
    ...scaleStoryOverlayTemplateBase({ default: 48, min: 34, max: 62, role: "subtitle" }),
    maxLines: 3,
  },
  sequence: {
    ...scaleStoryOverlayTemplateBase({ default: 64, min: 42, max: 82, role: "title" }),
    maxLines: 2,
  },
  hero_finale: {
    ...scaleStoryOverlayTemplateBase({ default: 118, min: 78, max: 144, role: "headline" }),
    maxLines: 4,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function isSideZone(zoneId: SafeZoneId): boolean {
  return zoneId.includes("_LEFT") || zoneId.includes("_RIGHT");
}

export function resolutionScale(frameWidth: number, frameHeight: number): number {
  const sx = frameWidth / REF_WIDTH;
  const sy = frameHeight / REF_HEIGHT;
  return Math.sqrt(sx * sy);
}

export function computeAvailableSpace(params: {
  frameWidth: number;
  frameHeight: number;
  selectedZone: SafeZoneId;
  safeZoneScore: number;
  textWidthFraction?: number;
}): {
  availableWidthPx: number;
  availableHeightPx: number;
  maxTextWidthPx: number;
  widthFraction: number;
} {
  const { frameWidth, frameHeight, selectedZone, safeZoneScore } = params;
  const safeW = frameWidth * (1 - 2 * SAFE_AREA_MARGIN_H);
  const safeH = frameHeight * (1 - 2 * SAFE_AREA_MARGIN_V);
  const side = isSideZone(selectedZone);

  let widthFraction = params.textWidthFraction;
  if (widthFraction == null) {
    if (side) {
      widthFraction =
        safeZoneScore >= 70 ? 0.52
        : safeZoneScore >= 45 ? 0.45
        : 0.38;
    } else {
      widthFraction =
        safeZoneScore >= 70 ? 0.86
        : safeZoneScore >= 45 ? 0.8
        : 0.72;
    }
  }

  if (safeZoneScore < 45) {
    widthFraction = Math.max(0.35, widthFraction - 0.04);
  }

  const maxTextWidthPx = Math.round(safeW * widthFraction);
  const row = selectedZone.startsWith("TOP_") ? 0 : selectedZone.startsWith("BOTTOM_") ? 2 : 1;
  const availableHeightPx = Math.round(safeH / 3 - safeH * 0.04 * (row === 1 ? 0.5 : 0));

  return {
    availableWidthPx: maxTextWidthPx,
    availableHeightPx,
    maxTextWidthPx,
    widthFraction,
  };
}

/** Deterministic ASS-friendly line width estimate (px). */
export function estimateTextLineWidthPx(line: string, fontSize: number): number {
  let width = 0;
  for (const ch of line) {
    if (ch === " ") {
      width += fontSize * 0.32;
    } else if (/[A-Z0-9]/.test(ch)) {
      width += fontSize * 0.68;
    } else if (/[a-z]/.test(ch)) {
      width += fontSize * 0.52;
    } else {
      width += fontSize * 0.25;
    }
  }
  return width;
}

function tokenizeWords(text: string): string[] {
  const upper = collapseSpaces(text).toUpperCase();
  if (!upper) {
    return [];
  }
  const rawWords = upper.split(" ").filter(Boolean);
  const tokens: string[] = [];
  let i = 0;
  while (i < rawWords.length) {
    let matchedBrand = false;
    for (const brand of BRAND_TERMS) {
      const parts = brand.split(" ");
      if (parts.length === 1) {
        if (rawWords[i] === brand) {
          tokens.push(brand);
          i += 1;
          matchedBrand = true;
          break;
        }
        continue;
      }
      const slice = rawWords.slice(i, i + parts.length).join(" ");
      if (slice === brand) {
        tokens.push(brand);
        i += parts.length;
        matchedBrand = true;
        break;
      }
    }
    if (!matchedBrand) {
      tokens.push(rawWords[i]!);
      i += 1;
    }
  }
  return tokens;
}

function accentSet(accentWords: string[] | undefined): Set<string> {
  return new Set((accentWords ?? []).map((w) => w.toUpperCase().replace(/[^A-Z0-9]/g, "")));
}

function chunkContainsAccent(chunk: string[], accents: Set<string>): boolean {
  return chunk.some((w) => accents.has(w.replace(/[^A-Z0-9]/g, "")));
}

function joinChunk(chunk: string[]): string {
  return chunk.join(" ");
}

function linesFitWidth(lines: string[], fontSize: number, maxWidthPx: number): boolean {
  return lines.every((line) => estimateTextLineWidthPx(line, fontSize) <= maxWidthPx);
}

function splitAtPunctuation(tokens: string[]): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];
  for (const token of tokens) {
    current.push(token);
    if (/[.!?]$/.test(token)) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length > 0) {
    groups.push(current);
  }
  return groups.length > 0 ? groups : [tokens];
}

function packTokensToLines(
  tokens: string[],
  maxWidthPx: number,
  fontSize: number,
  maxLines: number,
  accents: Set<string>,
  wordsPerLineTarget: { min: number; max: number }
): string[] {
  const lines: string[] = [];
  let bucket: string[] = [];

  const flush = () => {
    if (bucket.length > 0) {
      lines.push(joinChunk(bucket));
      bucket = [];
    }
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]!;
    const candidate = [...bucket, token];
    const candidateLine = joinChunk(candidate);
    const tooWide = estimateTextLineWidthPx(candidateLine, fontSize) > maxWidthPx;
    const bucketFull = bucket.length >= wordsPerLineTarget.max;

    if (tooWide && bucket.length > 0) {
      if (chunkContainsAccent(bucket, accents) && bucket.length === 1 && lines.length < maxLines) {
        flush();
        bucket = [token];
        continue;
      }
      flush();
      bucket = [token];
    } else if (bucketFull) {
      flush();
      bucket = [token];
    } else {
      bucket = candidate;
    }

    if (lines.length >= maxLines - 1 && i < tokens.length - 1) {
      const remainder = [token, ...tokens.slice(i + 1)];
      const merged = joinChunk([...(lines.length > 0 ? [] : bucket), ...remainder]);
      if (lines.length > 0) {
        lines.push(merged);
      } else {
        lines.push(joinChunk(bucket.length > 0 ? bucket : remainder));
      }
      return lines.slice(0, maxLines);
    }
  }
  flush();

  if (lines.length === 0 && bucket.length > 0) {
    lines.push(joinChunk(bucket));
  }

  return lines.slice(0, maxLines);
}

function heroFinaleBreak(
  tokens: string[],
  maxWidthPx: number,
  fontSize: number,
  maxLines: number,
  accents: Set<string>
): string[] {
  if (tokens.length <= 3) {
    const one = joinChunk(tokens);
    if (estimateTextLineWidthPx(one, fontSize) <= maxWidthPx) {
      return [one];
    }
  }

  const dramatic = packTokensToLines(tokens, maxWidthPx, fontSize, maxLines, accents, {
    min: 1,
    max: 3,
  });

  if (dramatic.length >= 2) {
    return dramatic;
  }

  const groups = splitAtPunctuation(tokens);
  const lines: string[] = [];
  for (const group of groups) {
    const packed = packTokensToLines(group, maxWidthPx, fontSize, maxLines - lines.length, accents, {
      min: 1,
      max: 3,
    });
    lines.push(...packed);
    if (lines.length >= maxLines) {
      break;
    }
  }
  return lines.slice(0, maxLines);
}

export function breakTextIntoLines(params: {
  text: string;
  template: AdaptiveTypographyTemplate;
  fontSize: number;
  maxTextWidthPx: number;
  accentWords?: string[];
}): string[] {
  const { text, template, fontSize, maxTextWidthPx, accentWords } = params;
  const raw = text.trim();
  if (!raw) {
    return [];
  }

  if (raw.includes("\n")) {
    return raw
      .split("\n")
      .map((l) => collapseSpaces(l).toUpperCase())
      .filter(Boolean)
      .slice(0, TEMPLATE_BASES[template].maxLines);
  }

  const accents = accentSet(accentWords);
  const tokens = tokenizeWords(raw);
  if (tokens.length === 0) {
    return [];
  }
  if (tokens.length === 1) {
    return [tokens[0]!];
  }

  const maxLines = TEMPLATE_BASES[template].maxLines;
  const singleLine = joinChunk(tokens);
  if (
    maxLines > 1 &&
    estimateTextLineWidthPx(singleLine, fontSize) <= maxTextWidthPx
  ) {
    return [singleLine];
  }

  if (template === "hero_finale") {
    return heroFinaleBreak(tokens, maxTextWidthPx, fontSize, maxLines, accents);
  }

  const wordsPerLine =
    template === "hero" || template === "hero_small" || template === "headline" ?
      { min: 2, max: 4 }
    : template === "scene" || template === "sequence" ?
      { min: 2, max: 5 }
    : { min: 2, max: 6 };

  let lines = packTokensToLines(tokens, maxTextWidthPx, fontSize, maxLines, accents, wordsPerLine);

  if (!linesFitWidth(lines, fontSize, maxTextWidthPx)) {
    lines = packTokensToLines(tokens, maxTextWidthPx, fontSize, maxLines, accents, {
      min: 1,
      max: Math.max(2, wordsPerLine.max - 1),
    });
  }

  const used = new Set(lines.join(" ").split(" "));
  const missing = tokens.filter((t) => !used.has(t));
  if (missing.length > 0 && lines.length < maxLines) {
    lines.push(joinChunk(missing));
  }

  return lines
    .map((l) => l.toUpperCase())
    .filter(Boolean)
    .slice(0, maxLines);
}

function zoneOpennessBonus(zoneId: SafeZoneId, safeZoneScore: number): number {
  const side = isSideZone(zoneId);
  const scoreFactor = safeZoneScore >= 70 ? 1 : safeZoneScore >= 45 ? 0.5 : 0;
  if (side) {
    return -0.12 + scoreFactor * 0.04;
  }
  return 0.08 + scoreFactor * 0.07;
}

function computeFontSize(params: {
  template: AdaptiveTypographyTemplate;
  frameWidth: number;
  frameHeight: number;
  maxTextWidthPx: number;
  text: string;
  selectedZone: SafeZoneId;
  safeZoneScore: number;
  isBusy?: boolean;
  lines: string[];
}): number {
  const base = TEMPLATE_BASES[params.template];
  const scale = resolutionScale(params.frameWidth, params.frameHeight);
  let size = base.default * scale;

  const openness = zoneOpennessBonus(params.selectedZone, params.safeZoneScore);
  size *= 1 + openness;

  if (isSideZone(params.selectedZone)) {
    size *= 0.88;
  }

  const wordCount = params.text.split(/\s+/).filter(Boolean).length;
  const charCount = params.text.length;
  if (charCount > 40 || wordCount > 8) {
    size *= 0.92;
  }
  if (charCount > 60 || wordCount > 12) {
    size *= 0.9;
  }

  if (params.isBusy) {
    size *= 0.94;
  }

  const longestLine = params.lines.reduce((a, b) => (a.length > b.length ? a : b), "");
  while (size > base.min * scale && !linesFitWidth(params.lines, size, params.maxTextWidthPx)) {
    size -= 2;
  }

  if (!linesFitWidth(params.lines, size, params.maxTextWidthPx)) {
    size = base.min * scale;
  }

  return Math.round(clamp(size, base.min * scale, base.max * scale));
}

function resolveBackdropAndOutline(params: {
  safeZoneScore: number;
  isBusy?: boolean;
  contrast?: number;
  objectDetectionConfidence?: number;
  sceneIntent?: SceneIntent;
}): Pick<AdaptiveTypographyResult, "backdropMode" | "outlineStrength" | "confidence"> {
  const { safeZoneScore, isBusy, contrast, objectDetectionConfidence } = params;
  let backdropMode: AdaptiveTypographyResult["backdropMode"] = "none";
  let outlineStrength: AdaptiveTypographyResult["outlineStrength"] = "light";

  const busy =
    isBusy === true ||
    safeZoneScore < 50 ||
    (objectDetectionConfidence != null && objectDetectionConfidence > 0.6 && safeZoneScore < 65);

  const contrastLow = contrast != null && contrast < 25;

  if (safeZoneScore >= 70 && !busy && !contrastLow) {
    backdropMode = "none";
    outlineStrength = "light";
  } else if (safeZoneScore >= 50 && !busy) {
    backdropMode = "soft";
    outlineStrength = "light";
  } else if (busy || safeZoneScore < 45) {
    backdropMode = "strong";
    outlineStrength = contrastLow ? "strong" : "medium";
  } else {
    backdropMode = "soft";
    outlineStrength = "medium";
  }

  const confidence = clamp(
    safeZoneScore / 100 - (busy ? 0.15 : 0) - (contrastLow ? 0.1 : 0),
    0.35,
    0.98
  );

  return { backdropMode, outlineStrength, confidence };
}

function alignmentForZone(zoneId: SafeZoneId): AdaptiveTypographyResult["alignment"] {
  if (zoneId.includes("_LEFT")) {
    return "left";
  }
  if (zoneId.includes("_RIGHT")) {
    return "right";
  }
  return "center";
}

export function resolveAdaptiveTypography(
  input: AdaptiveTypographyInput
): AdaptiveTypographyResult {
  const text = collapseSpaces(input.text);
  const base = TEMPLATE_BASES[input.template];
  const space = computeAvailableSpace({
    frameWidth: input.frameWidth,
    frameHeight: input.frameHeight,
    selectedZone: input.selectedZone,
    safeZoneScore: input.safeZoneScore,
    textWidthFraction: input.textWidthFraction,
  });

  const scale = resolutionScale(input.frameWidth, input.frameHeight);
  const provisionalSize = base.default * scale;
  let lines = breakTextIntoLines({
    text,
    template: input.template,
    fontSize: provisionalSize,
    maxTextWidthPx: space.maxTextWidthPx,
    accentWords: input.accentWords,
  });

  let fontSize = computeFontSize({
    template: input.template,
    frameWidth: input.frameWidth,
    frameHeight: input.frameHeight,
    maxTextWidthPx: space.maxTextWidthPx,
    text,
    selectedZone: input.selectedZone,
    safeZoneScore: input.safeZoneScore,
    isBusy: input.isBusy,
    lines,
  });

  const tokens = tokenizeWords(text);
  const singleUpper = joinChunk(tokens);
  const minSize = base.min * resolutionScale(input.frameWidth, input.frameHeight);
  while (
    tokens.length <= 6 &&
    fontSize > minSize &&
    estimateTextLineWidthPx(singleUpper, fontSize) > space.maxTextWidthPx
  ) {
    fontSize -= 2;
  }
  fontSize = Math.round(fontSize);
  if (
    input.template !== "hero_finale" &&
    tokens.length <= 6 &&
    estimateTextLineWidthPx(singleUpper, fontSize) <= space.maxTextWidthPx
  ) {
    lines = [singleUpper];
  } else {
    lines = breakTextIntoLines({
      text,
      template: input.template,
      fontSize,
      maxTextWidthPx: space.maxTextWidthPx,
      accentWords: input.accentWords,
    });
  }

  const lineHeight = Math.round(fontSize * 1.15);
  const { backdropMode, outlineStrength, confidence } = resolveBackdropAndOutline({
    safeZoneScore: input.safeZoneScore,
    isBusy: input.isBusy,
    contrast: input.contrast,
    objectDetectionConfidence: input.objectDetectionConfidence,
    sceneIntent: input.sceneIntent,
  });

  const side = isSideZone(input.selectedZone);
  const reason = [
    side ? "narrow side zone" : "open zone",
    `score=${Math.round(input.safeZoneScore)}`,
    `lines=${lines.length}`,
    `words=${text.split(/\s+/).filter(Boolean).length}`,
    backdropMode !== "none" ? `backdrop=${backdropMode}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    fontSize,
    lineHeight,
    maxTextWidthPx: space.maxTextWidthPx,
    maxLines: base.maxLines,
    lines,
    alignment: alignmentForZone(input.selectedZone),
    backdropMode,
    outlineStrength,
    confidence,
    reason,
  };
}

export function applyTypographyToTheme(
  theme: AdaptiveOverlayTheme,
  typography: AdaptiveTypographyResult
): AdaptiveOverlayTheme {
  let outline = theme.outline;
  let shadow = theme.shadow;
  if (typography.outlineStrength === "medium") {
    outline = Math.max(outline, 6);
    shadow = Math.max(shadow, 3);
  } else if (typography.outlineStrength === "strong") {
    outline = Math.max(outline, 8);
    shadow = Math.max(shadow, 5);
  }

  let useBackdrop = theme.useBackdrop;
  let backdropOpacity = theme.backdropOpacity;
  if (typography.backdropMode === "soft") {
    useBackdrop = true;
    backdropOpacity = Math.max(backdropOpacity, 0.42);
  } else if (typography.backdropMode === "strong") {
    useBackdrop = true;
    backdropOpacity = Math.max(backdropOpacity, 0.58);
  }

  return {
    ...theme,
    outline,
    shadow,
    useBackdrop,
    backdropOpacity,
    isBusy: typography.backdropMode !== "none" || theme.isBusy,
  };
}

export function logAdaptiveTypographyDebug(params: {
  sceneIndex: number;
  template: AdaptiveTypographyTemplate;
  zoneId: SafeZoneId;
  typography: AdaptiveTypographyResult;
}): void {
  if (!isSafeZoneDebugEnabled()) {
    return;
  }
  const { sceneIndex, template, zoneId, typography } = params;
  console.info("[hc-typography]", {
    scene: sceneIndex,
    template,
    zone: zoneId,
    width: typography.maxTextWidthPx,
    font: typography.fontSize,
    lines: typography.lines.length,
    backdrop: typography.backdropMode,
    reason: typography.reason,
    breaks: typography.lines,
  });
}

/** Legacy fixed sizes when adaptive typography is unavailable. */
export const LEGACY_HERO_SIZE_MAIN = scaleStoryOverlayFontSize("headline", 118);
export const LEGACY_HERO_SIZE_SMALL = scaleStoryOverlayFontSize("headline", 74);

export function legacySceneTitleSize(width: number, height: number): number {
  return Math.round(Math.min(width, height) * STORY_LEGACY_TITLE_HEIGHT_FRACTION);
}

export function legacySceneSubtitleSize(titleSize: number): number {
  return Math.round(titleSize * STORY_SUBTITLE_TO_TITLE_RATIO);
}

export function resolveTypographyFromPlacement(params: {
  text: string;
  template: AdaptiveTypographyTemplate;
  placement: SafeZonePlacement;
  frameWidth: number;
  frameHeight: number;
  accentWords?: string[];
  sceneIntent?: SceneIntent;
  isBusy?: boolean;
  contrast?: number;
  objectDetectionConfidence?: number;
}): AdaptiveTypographyResult {
  return resolveAdaptiveTypography({
    text: params.text,
    template: params.template,
    frameWidth: params.frameWidth,
    frameHeight: params.frameHeight,
    selectedZone: params.placement.zoneId,
    safeZoneScore: params.placement.zoneScore,
    textWidthFraction: params.placement.textWidthFraction,
    sceneIntent: params.sceneIntent,
    isBusy: params.isBusy,
    contrast: params.contrast,
    objectDetectionConfidence: params.objectDetectionConfidence,
    accentWords: params.accentWords,
  });
}

export function overlayTemplateToTypography(
  kind:
    | "hero"
    | "hero_small"
    | "headline"
    | "title"
    | "subtitle"
    | "scene"
    | "sequence"
    | "heroFinale"
): AdaptiveTypographyTemplate {
  if (kind === "heroFinale") {
    return "hero_finale";
  }
  if (kind === "hero_small") {
    return "hero_small";
  }
  if (kind === "title") {
    return "scene";
  }
  return kind;
}
