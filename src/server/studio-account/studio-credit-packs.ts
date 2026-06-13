/**
 * Prepaid credit pack configuration — purchased credits go into the same wallet.
 */

export type StudioCreditPackId =
  | "pack_500"
  | "pack_1250"
  | "pack_3000"
  | "pack_8000";

export type StudioCreditPack = {
  id: StudioCreditPackId;
  labelKey: string;
  credits: number;
  priceEur: number;
  stripePriceIdEnvKey: string;
};

export const STUDIO_CREDIT_PACKS: StudioCreditPack[] = [
  {
    id: "pack_500",
    labelKey: "account.creditPack.500",
    credits: 500,
    priceEur: 4.99,
    stripePriceIdEnvKey: "STRIPE_PRICE_PACK_500",
  },
  {
    id: "pack_1250",
    labelKey: "account.creditPack.1250",
    credits: 1250,
    priceEur: 9.99,
    stripePriceIdEnvKey: "STRIPE_PRICE_PACK_1250",
  },
  {
    id: "pack_3000",
    labelKey: "account.creditPack.3000",
    credits: 3000,
    priceEur: 19.99,
    stripePriceIdEnvKey: "STRIPE_PRICE_PACK_3000",
  },
  {
    id: "pack_8000",
    labelKey: "account.creditPack.8000",
    credits: 8000,
    priceEur: 49.99,
    stripePriceIdEnvKey: "STRIPE_PRICE_PACK_8000",
  },
];

export function getCreditPack(packId: string): StudioCreditPack | null {
  return STUDIO_CREDIT_PACKS.find((p) => p.id === packId) ?? null;
}

export function resolveCreditPackStripePriceId(packId: string): string | null {
  const pack = getCreditPack(packId);
  if (!pack) {
    return null;
  }
  return process.env[pack.stripePriceIdEnvKey]?.trim() || null;
}
