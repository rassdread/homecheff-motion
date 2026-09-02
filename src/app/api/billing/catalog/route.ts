import { NextResponse } from "next/server";
import {
  listStudioSubscriptionPlans,
  resolvePlanStripePriceId,
} from "@/server/studio-account/studio-subscription-plan-service";
import { listStudioCreditPacks } from "@/server/studio-account/studio-credit-pack-service";
import { STUDIO_NL_TARGET_CATALOG } from "@/lib/studio-nl-b2c-catalog";
import {
  customerFacingMonthlyHcGrant,
  customerFacingMonthlyPriceEur,
  customerFacingYearlyPriceEur,
} from "@/lib/studio-customer-facing-pricing";
import {
  isCentralStudioPaidCheckoutEnabled,
  isCentralStudioTechnicalReady,
} from "@/lib/studio-central-billing-flags";
import { computeSubscriptionYearlySavingsPercent } from "@/lib/studio-subscription-billing";

const CUSTOMER_PLAN_KEYS = ["creator", "pro", "studio"] as const;

/**
 * Public catalog SSOT for customer-facing surfaces:
 * plans[] = CURRENT NL B2C (€15/900, €29/1800, €79/5000).
 * legacyPlans[] = historical Stripe/DB list prices (never default purchase truth).
 */
export async function GET() {
  const [dbPlans, packs] = await Promise.all([
    listStudioSubscriptionPlans({ visibleOnly: true, activeOnly: true }),
    listStudioCreditPacks({ activeOnly: true }),
  ]);

  const technicalReady = isCentralStudioTechnicalReady();
  const publicAcquisition = isCentralStudioPaidCheckoutEnabled();

  const dbBySlug = new Map(dbPlans.map((p) => [p.slug, p]));

  const plans = CUSTOMER_PLAN_KEYS.map((planKey) => {
    const db = dbBySlug.get(planKey);
    const monthly = customerFacingMonthlyPriceEur(planKey);
    const yearly = customerFacingYearlyPriceEur(planKey);
    return {
      id: planKey,
      name: db?.name ?? planKey,
      description: db?.description ?? null,
      monthlyPriceEur: monthly,
      yearlyPriceEur: yearly,
      monthlyHcGrant: customerFacingMonthlyHcGrant(planKey),
      discountPercent:
        db?.discountPercent ??
        computeSubscriptionYearlySavingsPercent(monthly, yearly) ??
        null,
      storageLimitGb: db?.storageLimitGb ?? null,
      featureFlags: db?.featureFlags ?? null,
      autoTopUpAvailable: db?.autoTopUpAvailable ?? false,
      yearlyCheckoutAvailable: db
        ? Boolean(resolvePlanStripePriceId(db, "yearly"))
        : false,
      catalogAuthority: "CURRENT_NL_B2C" as const,
    };
  });

  const legacyPlans = dbPlans
    .filter((plan) => plan.slug === "creator" || plan.slug === "pro" || plan.slug === "studio")
    .map((plan) => ({
      id: plan.slug,
      name: plan.name,
      description: plan.description,
      monthlyPriceEur: plan.monthlyPriceEur,
      yearlyPriceEur: plan.yearlyPriceEur,
      discountPercent: plan.discountPercent,
      storageLimitGb: plan.storageLimitGb,
      featureFlags: plan.featureFlags,
      autoTopUpAvailable: plan.autoTopUpAvailable,
      yearlyCheckoutAvailable: Boolean(resolvePlanStripePriceId(plan, "yearly")),
      catalogAuthority: "LEGACY_HISTORICAL" as const,
    }));

  return NextResponse.json({
    ok: true,
    acquisition: {
      technicalReady,
      publicAcquisitionEnabled: publicAcquisition,
      paidCheckoutEnabled: publicAcquisition,
    },
    nlB2cTarget: technicalReady
      ? Object.values(STUDIO_NL_TARGET_CATALOG).map((p) => ({
          planKey: p.planKey,
          grossConsumerPriceEur: p.grossConsumerPriceEur,
          monthlyHcGrant: p.monthlyHcGrant,
          vatPresentation: "INCLUSIVE_PENDING_ACCOUNTANT",
          checkoutEnabled: publicAcquisition,
        }))
      : null,
    plans,
    legacyPlans,
    packs: packs.map((pack) => ({
      id: pack.slug,
      name: pack.name,
      credits: pack.credits,
      bonusCredits: pack.bonusCredits,
      totalCredits: pack.credits + pack.bonusCredits,
      priceEur: pack.priceEur,
    })),
  });
}
