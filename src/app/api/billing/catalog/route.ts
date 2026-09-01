import { NextResponse } from "next/server";
import {
  listStudioSubscriptionPlans,
  resolvePlanStripePriceId,
} from "@/server/studio-account/studio-subscription-plan-service";
import { listStudioCreditPacks } from "@/server/studio-account/studio-credit-pack-service";
import { STUDIO_NL_TARGET_CATALOG } from "@/lib/studio-nl-b2c-catalog";
import {
  isCentralStudioPaidCheckoutEnabled,
  isCentralStudioTechnicalReady,
} from "@/lib/studio-central-billing-flags";

export async function GET() {
  const [plans, packs] = await Promise.all([
    listStudioSubscriptionPlans({ visibleOnly: true, activeOnly: true }),
    listStudioCreditPacks({ activeOnly: true }),
  ]);

  const technicalReady = isCentralStudioTechnicalReady();
  const publicAcquisition = isCentralStudioPaidCheckoutEnabled();

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
    plans: plans.map((plan) => ({
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
    })),
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
