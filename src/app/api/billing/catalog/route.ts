import { NextResponse } from "next/server";
import { listStudioSubscriptionPlans } from "@/server/studio-account/studio-subscription-plan-service";
import { listStudioCreditPacks } from "@/server/studio-account/studio-credit-pack-service";

export async function GET() {
  const [plans, packs] = await Promise.all([
    listStudioSubscriptionPlans({ visibleOnly: true, activeOnly: true }),
    listStudioCreditPacks({ activeOnly: true }),
  ]);

  return NextResponse.json({
    ok: true,
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
