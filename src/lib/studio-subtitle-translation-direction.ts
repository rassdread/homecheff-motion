/**
 * S.7E — Creative Director subtitle/translation recommendations (never force).
 */

import type { StudioSubtitleStyleId } from "@/lib/studio-subtitle-style";
import type { StudioTranslationQuality } from "@/lib/studio-translation-studio";

export type StudioSubtitleDirectionGuidance = {
  subtitleDensity: "sparse" | "balanced" | "dense" | null;
  timingHint: "tight" | "natural" | "relaxed" | null;
  style: StudioSubtitleStyleId | null;
  accessibility: boolean;
  readingSpeed: "slow" | "medium" | "fast" | null;
  forced: false;
};

export type StudioTranslationDirectionGuidance = {
  quality: StudioTranslationQuality | null;
  formal: boolean | null;
  brandSafe: boolean;
  forced: false;
};

export function recommendSubtitleDirection(input: {
  style?: StudioSubtitleStyleId | null;
  accessibility?: boolean;
}): StudioSubtitleDirectionGuidance {
  const style = input.style ?? "default";
  return {
    subtitleDensity: style === "social" ? "dense" : style === "cinema" ? "sparse" : "balanced",
    timingHint: style === "social" ? "tight" : "natural",
    style,
    accessibility: Boolean(input.accessibility || style === "accessibility"),
    readingSpeed: style === "accessibility" ? "slow" : "medium",
    forced: false,
  };
}

export function recommendTranslationDirection(input: {
  quality?: StudioTranslationQuality | null;
}): StudioTranslationDirectionGuidance {
  const quality = input.quality ?? "literal";
  return {
    quality,
    formal: quality === "formal" || quality === "technical" ? true : quality === "informal" ? false : null,
    brandSafe: quality === "brand_safe" || quality === "marketing",
    forced: false,
  };
}
