export const LOW_CREDIT_THRESHOLDS = [100, 50, 20] as const;

export type LowCreditTier = (typeof LOW_CREDIT_THRESHOLDS)[number];

export function resolveLowCreditTier(availableCredits: number): LowCreditTier | null {
  if (availableCredits <= 0) {
    return 20;
  }
  for (const threshold of LOW_CREDIT_THRESHOLDS) {
    if (availableCredits <= threshold) {
      return threshold;
    }
  }
  return null;
}

export function isZeroCredits(availableCredits: number): boolean {
  return availableCredits <= 0;
}

/** Rough runway from recent spend (credits per day). */
export function estimateDaysRemaining(input: {
  availableCredits: number;
  creditsUsedLast30Days: number;
}): number | null {
  if (input.availableCredits <= 0) {
    return 0;
  }
  const daily = input.creditsUsedLast30Days / 30;
  if (daily <= 0) {
    return null;
  }
  return Math.max(1, Math.ceil(input.availableCredits / daily));
}

export function pricePerCredit(priceEur: number, totalCredits: number): number {
  if (totalCredits <= 0) {
    return 0;
  }
  return Math.round((priceEur / totalCredits) * 10000) / 10000;
}

/** Lowest prepaid pack price (EUR) — keep in sync with STUDIO_CREDIT_PACKS. */
export const LOWEST_CREDIT_PACK_PRICE_EUR = 4.99;

export const PACK_BADGES: Record<string, "mostPopular" | "bestValue" | null> = {
  pack_500: null,
  pack_1250: "mostPopular",
  pack_3000: null,
  pack_8000: "bestValue",
};
