import { prisma } from "@/lib/prisma";
import { STUDIO_PLANS, resolveStripePriceId, type StudioPlanId } from "@/server/studio-account/studio-plan-config";
import type { StudioSubscriptionPlanSnapshot } from "@/types/studio-billing";

function parseFeatureFlags(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((row): row is string => typeof row === "string");
}

function mapDbPlan(row: {
  id: string;
  slug: string;
  name: string;
  description: string;
  monthlyPriceEur: number | null;
  yearlyPriceEur: number | null;
  discountPercent: number;
  storageLimitGb: number | null;
  featureFlags: unknown;
  autoTopUpAvailable: boolean;
  isVisible: boolean;
  isActive: boolean;
  displayOrder: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
}): StudioSubscriptionPlanSnapshot {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    monthlyPriceEur: row.monthlyPriceEur,
    yearlyPriceEur: row.yearlyPriceEur,
    discountPercent: row.discountPercent,
    storageLimitGb: row.storageLimitGb,
    featureFlags: parseFeatureFlags(row.featureFlags),
    autoTopUpAvailable: row.autoTopUpAvailable,
    isVisible: row.isVisible,
    isActive: row.isActive,
    displayOrder: row.displayOrder,
    stripePriceIdMonthly: row.stripePriceIdMonthly,
    stripePriceIdYearly: row.stripePriceIdYearly,
    source: "database",
  };
}

function fallbackPlan(slug: StudioPlanId): StudioSubscriptionPlanSnapshot | null {
  if (!(slug in STUDIO_PLANS) || slug === "free") {
    return null;
  }
  const plan = STUDIO_PLANS[slug];
  return {
    id: `fallback_${slug}`,
    slug,
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    description: "",
    monthlyPriceEur: plan.monthlyPriceEur,
    yearlyPriceEur: plan.monthlyPriceEur != null ? plan.monthlyPriceEur * 10 : null,
    discountPercent: plan.creditDiscountPercent,
    storageLimitGb: plan.storageLimitGb,
    featureFlags: [],
    autoTopUpAvailable: plan.autoTopUpAvailable,
    isVisible: slug !== "enterprise",
    isActive: true,
    displayOrder: slug === "creator" ? 1 : slug === "pro" ? 2 : slug === "studio" ? 3 : 4,
    stripePriceIdMonthly: resolveStripePriceId(slug),
    stripePriceIdYearly: null,
    source: "fallback",
  };
}

const DEFAULT_PLAN_SLUGS: StudioPlanId[] = ["creator", "pro", "studio", "enterprise"];

export async function ensureStudioSubscriptionPlans(): Promise<void> {
  const existing = await prisma.studioSubscriptionPlan.count();
  if (existing > 0) {
    return;
  }
  for (const slug of DEFAULT_PLAN_SLUGS) {
    const fb = fallbackPlan(slug);
    if (!fb) {
      continue;
    }
    await prisma.studioSubscriptionPlan.create({
      data: {
        slug: fb.slug,
        name: fb.name,
        description: fb.description,
        monthlyPriceEur: fb.monthlyPriceEur,
        yearlyPriceEur: fb.yearlyPriceEur,
        discountPercent: fb.discountPercent,
        storageLimitGb: fb.storageLimitGb,
        featureFlags: fb.featureFlags,
        autoTopUpAvailable: fb.autoTopUpAvailable,
        isVisible: fb.isVisible,
        isActive: fb.isActive,
        displayOrder: fb.displayOrder,
        stripePriceIdMonthly: fb.stripePriceIdMonthly,
        stripePriceIdYearly: fb.stripePriceIdYearly,
      },
    });
  }
}

export async function listStudioSubscriptionPlans(input?: {
  visibleOnly?: boolean;
  activeOnly?: boolean;
}): Promise<StudioSubscriptionPlanSnapshot[]> {
  await ensureStudioSubscriptionPlans();
  const rows = await prisma.studioSubscriptionPlan.findMany({
    where: {
      ...(input?.visibleOnly ? { isVisible: true } : {}),
      ...(input?.activeOnly ? { isActive: true } : {}),
    },
    orderBy: { displayOrder: "asc" },
  });
  if (rows.length === 0) {
    return DEFAULT_PLAN_SLUGS.map((slug) => fallbackPlan(slug)).filter(
      (row): row is StudioSubscriptionPlanSnapshot => row != null
    );
  }
  return rows.map(mapDbPlan);
}

export async function getStudioSubscriptionPlanBySlug(
  slug: string
): Promise<StudioSubscriptionPlanSnapshot | null> {
  await ensureStudioSubscriptionPlans();
  const row = await prisma.studioSubscriptionPlan.findUnique({ where: { slug } });
  if (row) {
    return mapDbPlan(row);
  }
  if (slug in STUDIO_PLANS) {
    return fallbackPlan(slug as StudioPlanId);
  }
  return null;
}

export async function upsertStudioSubscriptionPlan(input: {
  slug: string;
  name: string;
  description?: string;
  monthlyPriceEur?: number | null;
  yearlyPriceEur?: number | null;
  discountPercent?: number;
  storageLimitGb?: number | null;
  featureFlags?: string[];
  autoTopUpAvailable?: boolean;
  isVisible?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  stripePriceIdMonthly?: string | null;
  stripePriceIdYearly?: string | null;
}) {
  return prisma.studioSubscriptionPlan.upsert({
    where: { slug: input.slug },
    create: {
      slug: input.slug,
      name: input.name,
      description: input.description ?? "",
      monthlyPriceEur: input.monthlyPriceEur ?? null,
      yearlyPriceEur: input.yearlyPriceEur ?? null,
      discountPercent: input.discountPercent ?? 0,
      storageLimitGb: input.storageLimitGb ?? null,
      featureFlags: input.featureFlags ?? [],
      autoTopUpAvailable: input.autoTopUpAvailable ?? false,
      isVisible: input.isVisible ?? true,
      isActive: input.isActive ?? true,
      displayOrder: input.displayOrder ?? 0,
      stripePriceIdMonthly: input.stripePriceIdMonthly ?? null,
      stripePriceIdYearly: input.stripePriceIdYearly ?? null,
    },
    update: {
      name: input.name,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.monthlyPriceEur !== undefined ? { monthlyPriceEur: input.monthlyPriceEur } : {}),
      ...(input.yearlyPriceEur !== undefined ? { yearlyPriceEur: input.yearlyPriceEur } : {}),
      ...(input.discountPercent !== undefined ? { discountPercent: input.discountPercent } : {}),
      ...(input.storageLimitGb !== undefined ? { storageLimitGb: input.storageLimitGb } : {}),
      ...(input.featureFlags !== undefined ? { featureFlags: input.featureFlags } : {}),
      ...(input.autoTopUpAvailable !== undefined ? { autoTopUpAvailable: input.autoTopUpAvailable } : {}),
      ...(input.isVisible !== undefined ? { isVisible: input.isVisible } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      ...(input.stripePriceIdMonthly !== undefined
        ? { stripePriceIdMonthly: input.stripePriceIdMonthly }
        : {}),
      ...(input.stripePriceIdYearly !== undefined
        ? { stripePriceIdYearly: input.stripePriceIdYearly }
        : {}),
    },
  });
}

export function resolvePlanStripePriceId(
  plan: StudioSubscriptionPlanSnapshot,
  interval: "monthly" | "yearly" = "monthly"
): string | null {
  const dbPrice =
    interval === "yearly" ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
  if (dbPrice?.trim()) {
    return dbPrice.trim();
  }
  if (plan.source === "fallback" && plan.slug in STUDIO_PLANS) {
    return resolveStripePriceId(plan.slug as StudioPlanId);
  }
  return null;
}
