import { prisma } from "@/lib/prisma";
import {
  STUDIO_CREDIT_PACKS,
  resolveCreditPackStripePriceId,
  type StudioCreditPackId,
} from "@/server/studio-account/studio-credit-packs";
import type { StudioCreditPackSnapshot } from "@/types/studio-billing";
import { resolveStripeSecretKeyMode } from "@/lib/stripe-mode";
import { studioPackHcGrant } from "@/lib/studio-hc-pack-catalog";

function applyCatalogHcGrant(pack: StudioCreditPackSnapshot): StudioCreditPackSnapshot {
  const hcGrant = studioPackHcGrant(pack.slug);
  if (hcGrant == null) return pack;
  return {
    ...pack,
    credits: hcGrant,
    name: `${hcGrant.toLocaleString("nl-NL")} HC`,
  };
}
function mapDbPack(row: {
  id: string;
  slug: string;
  name: string;
  credits: number;
  priceEur: number;
  bonusCredits: number;
  active: boolean;
  displayOrder: number;
  stripePriceId: string | null;
}): StudioCreditPackSnapshot {
  return applyCatalogHcGrant({
    id: row.id,
    slug: row.slug,
    name: row.name,
    credits: row.credits,
    priceEur: row.priceEur,
    bonusCredits: row.bonusCredits,
    active: row.active,
    displayOrder: row.displayOrder,
    stripePriceId: row.stripePriceId,
    source: "database",
  });
}

function fallbackPack(id: StudioCreditPackId, order: number): StudioCreditPackSnapshot {
  const pack = STUDIO_CREDIT_PACKS.find((row) => row.id === id)!;
  return applyCatalogHcGrant({
    id: `fallback_${id}`,
    slug: id,
    name: `${pack.credits} HC`,
    credits: pack.credits,
    priceEur: pack.priceEur,
    bonusCredits: 0,
    active: true,
    displayOrder: order,
    stripePriceId: resolveCreditPackStripePriceId(id),
    source: "fallback",
  });
}

const FALLBACK_PACK_IDS: StudioCreditPackId[] = [
  "pack_500",
  "pack_1250",
  "pack_3000",
  "pack_8000",
];

export async function ensureStudioCreditPacks(): Promise<void> {
  return ensureStudioCreditPacksSync();
}

export async function ensureStudioCreditPacksSync(): Promise<void> {
  const existing = await prisma.studioCreditPack.count();
  if (existing > 0) {
    return;
  }
  for (let index = 0; index < FALLBACK_PACK_IDS.length; index++) {
    const id = FALLBACK_PACK_IDS[index];
    const fb = fallbackPack(id, index + 1);
    await prisma.studioCreditPack.create({
      data: {
        slug: fb.slug,
        name: fb.name,
        credits: fb.credits,
        priceEur: fb.priceEur,
        bonusCredits: fb.bonusCredits,
        active: fb.active,
        displayOrder: fb.displayOrder,
        stripePriceId: fb.stripePriceId,
      },
    });
  }
}

export async function listStudioCreditPacks(input?: {
  activeOnly?: boolean;
}): Promise<StudioCreditPackSnapshot[]> {
  await ensureStudioCreditPacksSync();
  const rows = await prisma.studioCreditPack.findMany({
    where: input?.activeOnly ? { active: true } : undefined,
    orderBy: { displayOrder: "asc" },
  });
  if (rows.length === 0) {
    return FALLBACK_PACK_IDS.map((id, index) => fallbackPack(id, index + 1));
  }
  return rows.map(mapDbPack);
}

export async function getStudioCreditPackBySlug(
  slug: string
): Promise<StudioCreditPackSnapshot | null> {
  await ensureStudioCreditPacksSync();
  const row = await prisma.studioCreditPack.findUnique({ where: { slug } });
  if (row) {
    return mapDbPack(row);
  }
  const legacy = STUDIO_CREDIT_PACKS.find((pack) => pack.id === slug);
  if (legacy) {
    const index = FALLBACK_PACK_IDS.indexOf(legacy.id as StudioCreditPackId);
    return fallbackPack(legacy.id as StudioCreditPackId, index >= 0 ? index + 1 : 99);
  }
  return null;
}

export async function upsertStudioCreditPack(input: {
  slug: string;
  name: string;
  credits: number;
  priceEur: number;
  bonusCredits?: number;
  active?: boolean;
  displayOrder?: number;
  stripePriceId?: string | null;
}) {
  return prisma.studioCreditPack.upsert({
    where: { slug: input.slug },
    create: {
      slug: input.slug,
      name: input.name,
      credits: input.credits,
      priceEur: input.priceEur,
      bonusCredits: input.bonusCredits ?? 0,
      active: input.active ?? true,
      displayOrder: input.displayOrder ?? 0,
      stripePriceId: input.stripePriceId ?? null,
    },
    update: {
      name: input.name,
      credits: input.credits,
      priceEur: input.priceEur,
      ...(input.bonusCredits !== undefined ? { bonusCredits: input.bonusCredits } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      ...(input.stripePriceId !== undefined ? { stripePriceId: input.stripePriceId } : {}),
    },
  });
}

export function resolvePackStripePriceId(pack: StudioCreditPackSnapshot): string | null {
  const envPrice = resolveCreditPackStripePriceId(pack.slug);
  // Preview TEST isolation: env catalog must win over shared-DB LIVE price IDs.
  if (resolveStripeSecretKeyMode() === "test") {
    return envPrice || pack.stripePriceId?.trim() || null;
  }
  if (pack.stripePriceId?.trim()) {
    return pack.stripePriceId.trim();
  }
  if (pack.source === "fallback") {
    return envPrice;
  }
  return envPrice;
}

export function totalPackCredits(pack: StudioCreditPackSnapshot): number {
  return pack.credits + pack.bonusCredits;
}
