export const MIN_INSTANT_PREMIUM_IMAGES = 2;
export const MAX_INSTANT_PREMIUM_IMAGES = 5;

/** Fixed EUR tiers for 2–5 images; +€0.50 per image beyond 5. */
export function estimateInstantPremiumPriceEur(imageCount: number): number {
  if (imageCount < MIN_INSTANT_PREMIUM_IMAGES) {
    return 0;
  }
  if (imageCount === 2) {
    return 0.49;
  }
  if (imageCount === 3) {
    return 0.99;
  }
  if (imageCount === 4) {
    return 1.49;
  }
  if (imageCount === 5) {
    return 1.99;
  }
  return 1.99 + (imageCount - 5) * 0.5;
}

export function estimateInstantPremiumPriceCents(imageCount: number): number {
  return Math.round(estimateInstantPremiumPriceEur(imageCount) * 100);
}

/** User-facing price label, e.g. €0,49 (nl) or €0.49 (en). */
export function formatInstantPremiumPriceEur(
  imageCount: number,
  locale: "nl" | "en" = "nl"
): string {
  const value = estimateInstantPremiumPriceEur(imageCount);
  const formatted = value.toFixed(2).replace(".", locale === "nl" ? "," : ".");
  return `€${formatted}`;
}
