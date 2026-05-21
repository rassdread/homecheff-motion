/**
 * Smart typography fitting — readability first, style second, layout third.
 */

import {
  applyTextTransform,
  type TypographyFitResult,
  type TypographyStyleProfile,
} from "@/lib/typography-style-profile";

const MIN_FONT_SIZE = 14;

function charWidthFactor(languageCode: string): number {
  return languageCode === "ar" ? 0.62 : 0.52;
}

function splitWords(text: string, languageCode: string): string[] {
  if (languageCode === "ar") {
    return text.split(/\s+/u).filter(Boolean);
  }
  return text.split(/\s+/).filter(Boolean);
}

function wrapLines(
  text: string,
  maxCharsPerLine: number,
  languageCode: string
): string[] {
  const words = splitWords(text, languageCode);
  if (words.length === 0) {
    return [];
  }
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
    }
    if (word.length > maxCharsPerLine) {
      let chunk = "";
      for (const ch of word) {
        if ((chunk + ch).length > maxCharsPerLine) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      current = chunk;
    } else {
      current = word;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

function estimateMaxCharsPerLine(
  regionWidthPx: number,
  fontSize: number,
  languageCode: string
): number {
  const charPx = fontSize * charWidthFactor(languageCode);
  return Math.max(4, Math.floor(regionWidthPx / charPx));
}

function estimateMaxLines(regionHeightPx: number, lineHeightPx: number): number {
  return Math.max(1, Math.floor(regionHeightPx / lineHeightPx));
}

function ctaMinScale(role: TypographyStyleProfile["role"]): number {
  return role === "cta" ? 0.7 : role === "headline" ? 0.75 : 0.55;
}

/** Fit translated copy inside the normalized region box. */
export function smartFitTypographyText(params: {
  text: string;
  typography: TypographyStyleProfile;
  languageCode: string;
  canvasWidth: number;
  canvasHeight: number;
  regionWidthNorm?: number;
  regionHeightNorm?: number;
  anchorX?: number;
  anchorY?: number;
}): TypographyFitResult {
  const {
    typography,
    languageCode,
    canvasWidth,
    canvasHeight,
    regionWidthNorm = 0.55,
    regionHeightNorm = 0.14,
  } = params;

  const displayText = applyTextTransform(params.text, typography.textTransform);
  const regionW = Math.max(80, Math.round(regionWidthNorm * canvasWidth));
  const regionH = Math.max(48, Math.round(regionHeightNorm * canvasHeight));
  const padX = typography.padding.left + typography.padding.right;
  const padY = typography.padding.top + typography.padding.bottom;
  const innerW = Math.max(40, regionW - padX);
  const innerH = Math.max(24, regionH - padY);

  let fontSize = typography.fontSize;
  const minSize = Math.max(
    MIN_FONT_SIZE,
    Math.round(typography.fontSize * ctaMinScale(typography.role))
  );
  let lines: string[] = [];
  let overflowWarning = false;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const lineHeightPx = Math.round(fontSize * typography.lineHeight);
    const maxLines = estimateMaxLines(innerH, lineHeightPx);
    const maxChars = estimateMaxCharsPerLine(innerW, fontSize, languageCode);
    lines = wrapLines(displayText, maxChars, languageCode);
    if (lines.length <= maxLines) {
      const readabilityScore = Math.min(
        1,
        0.55 + (fontSize / typography.fontSize) * 0.35 + (maxLines - lines.length + 1) * 0.05
      );
      return {
        fontSize,
        lines,
        lineHeightPx,
        overflowWarning,
        readabilityScore,
      };
    }
    fontSize = Math.max(minSize, Math.round(fontSize * 0.92));
    if (fontSize <= minSize) {
      overflowWarning = true;
      lines = lines.slice(0, maxLines);
      break;
    }
  }

  const lineHeightPx = Math.round(fontSize * typography.lineHeight);
  return {
    fontSize,
    lines: lines.length > 0 ? lines : [displayText.slice(0, 48)],
    lineHeightPx,
    overflowWarning: true,
    readabilityScore: 0.45,
  };
}

export function mirrorPaddingForRtl(
  padding: TypographyStyleProfile["padding"]
): TypographyStyleProfile["padding"] {
  return {
    top: padding.top,
    right: padding.left,
    bottom: padding.bottom,
    left: padding.right,
  };
}
