/**
 * Authoritative Studio HC pack catalog — Universal Model A.
 * Internal slugs (pack_500, etc.) retained for Stripe/DB compatibility.
 */
export const STUDIO_HC_PACK_CATALOG_VERSION = "2026-09-universal-v1" as const;

export type StudioHcPackId = "pack_500" | "pack_1250" | "pack_3000" | "pack_8000";

export type StudioHcPackCatalogEntry = {
  id: StudioHcPackId;
  slug: StudioHcPackId;
  priceEur: number;
  hcGrant: number;
  labelKey: string;
  stripePriceIdEnvKey: string;
};

export const STUDIO_HC_PACK_CATALOG: StudioHcPackCatalogEntry[] = [
  {
    id: "pack_500",
    slug: "pack_500",
    priceEur: 4.99,
    hcGrant: 250,
    labelKey: "account.hcPack.250",
    stripePriceIdEnvKey: "STRIPE_PRICE_PACK_500",
  },
  {
    id: "pack_1250",
    slug: "pack_1250",
    priceEur: 9.99,
    hcGrant: 500,
    labelKey: "account.hcPack.500",
    stripePriceIdEnvKey: "STRIPE_PRICE_PACK_1250",
  },
  {
    id: "pack_3000",
    slug: "pack_3000",
    priceEur: 19.99,
    hcGrant: 1000,
    labelKey: "account.hcPack.1000",
    stripePriceIdEnvKey: "STRIPE_PRICE_PACK_3000",
  },
  {
    id: "pack_8000",
    slug: "pack_8000",
    priceEur: 49.99,
    hcGrant: 2500,
    labelKey: "account.hcPack.2500",
    stripePriceIdEnvKey: "STRIPE_PRICE_PACK_8000",
  },
];

export function studioPackHcGrant(slug: string): number | null {
  const row = STUDIO_HC_PACK_CATALOG.find((p) => p.slug === slug);
  return row?.hcGrant ?? null;
}

export function getStudioHcPackCatalogEntry(slug: string): StudioHcPackCatalogEntry | null {
  return STUDIO_HC_PACK_CATALOG.find((p) => p.slug === slug) ?? null;
}
