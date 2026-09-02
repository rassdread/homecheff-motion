/**
 * Prepaid HC pack configuration — purchased value grants Universal central HC.
 * Legacy slug pack_500 grants 250 HC (not 500 legacy credits).
 */
import {
  STUDIO_HC_PACK_CATALOG,
  type StudioHcPackId,
} from "@/lib/studio-hc-pack-catalog";

export type StudioCreditPackId = StudioHcPackId;

export type StudioCreditPack = {
  id: StudioCreditPackId;
  labelKey: string;
  /** Universal HC grant amount — not legacy Studio Credits. */
  credits: number;
  priceEur: number;
  stripePriceIdEnvKey: string;
};

export const STUDIO_CREDIT_PACKS: StudioCreditPack[] = STUDIO_HC_PACK_CATALOG.map((row) => ({
  id: row.id,
  labelKey: row.labelKey,
  credits: row.hcGrant,
  priceEur: row.priceEur,
  stripePriceIdEnvKey: row.stripePriceIdEnvKey,
}));

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
