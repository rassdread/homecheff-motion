/**
 * Lightweight, client-safe heuristics for animation intent.
 * No paid APIs — filenames, optional user prompt text, and basic dimensions only.
 *
 * TODO: Optional average-color similarity via canvas on preview URLs could
 * strengthen "morph" vs "cinematic" when dimensions are missing; skipped for now
 * to avoid extra dependencies and main-thread cost.
 */

import type { AnimationIntentId } from "@/lib/animation-intents";

export type ImageMetaForIntent = {
  originalFileName: string;
  width?: number;
  height?: number;
  mimeType?: string;
  order: number;
};

const PRODUCT_RE =
  /\b(product|item|bottle|package|shoe|shoes|bag|food|meal|dish|plate)\b/i;

const ENERGETIC_RE =
  /\b(fast|quick|dynamic|tiktok|reel|social|energetic)\b/i;

function aspectRatioStdDev(images: ImageMetaForIntent[]): number | null {
  const ratios: number[] = [];
  for (const img of images) {
    const w = img.width;
    const h = img.height;
    if (typeof w !== "number" || typeof h !== "number" || w <= 0 || h <= 0) {
      continue;
    }
    ratios.push(w / h);
  }
  if (ratios.length < 2) {
    return null;
  }
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const variance =
    ratios.reduce((sum, r) => sum + (r - mean) * (r - mean), 0) / ratios.length;
  return Math.sqrt(variance);
}

/**
 * Rules (order): product keywords → aspect similar (morph) / divergent (cinematic) → energetic prompt → default cinematic.
 */
export function detectAnimationIntent(input: {
  images: ImageMetaForIntent[];
  userPrompt?: string;
}): AnimationIntentId {
  const images = input.images;
  const prompt = (input.userPrompt ?? "").trim();
  if (images.length < 2) {
    return "cinematic";
  }

  const namesLower = images.map((i) => i.originalFileName.toLowerCase()).join(" ");
  const promptLower = prompt.toLowerCase();

  if (PRODUCT_RE.test(namesLower) || PRODUCT_RE.test(promptLower)) {
    return "product";
  }

  const std = aspectRatioStdDev(images);
  if (std !== null) {
    if (std < 0.08) {
      return "morph";
    }
    if (std > 0.22) {
      return "cinematic";
    }
  }

  if (ENERGETIC_RE.test(promptLower)) {
    return "dynamic";
  }

  return "cinematic";
}
