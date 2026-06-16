import { isStripeConfigured } from "@/server/studio-account/stripe-billing";
import { listStudioSubscriptionPlans } from "@/server/studio-account/studio-subscription-plan-service";
import {
  listStudioCreditPacks,
  resolvePackStripePriceId,
} from "@/server/studio-account/studio-credit-pack-service";
import { resolvePlanStripePriceId } from "@/server/studio-account/studio-subscription-plan-service";
import { prisma } from "@/lib/prisma";
import type { StripeReadinessSnapshot } from "@/types/studio-billing";

export async function loadStripeReadiness(): Promise<StripeReadinessSnapshot> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const environment: StripeReadinessSnapshot["environment"] = secret.startsWith("sk_live_")
    ? "live"
    : secret.startsWith("sk_test_")
      ? "test"
      : "missing";

  const [plans, packs, recentFailures] = await Promise.all([
    listStudioSubscriptionPlans({ activeOnly: true }),
    listStudioCreditPacks({ activeOnly: true }),
    prisma.studioAccount.count({ where: { billingStatus: "past_due" } }),
  ]);

  const missingConfiguration: string[] = [];
  if (!isStripeConfigured()) {
    missingConfiguration.push("STRIPE_SECRET_KEY is not set");
  }
  if (!webhook) {
    missingConfiguration.push("STRIPE_WEBHOOK_SECRET is not set");
  }
  if (!process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    missingConfiguration.push("NEXT_PUBLIC_APP_URL is not set");
  }

  const planRows = plans
    .filter((p) => p.slug !== "enterprise")
    .map((plan) => {
      const monthlyPriceId = resolvePlanStripePriceId(plan, "monthly");
      const yearlyPriceId = resolvePlanStripePriceId(plan, "yearly");
      const warnings: string[] = [];
      if (!monthlyPriceId && plan.monthlyPriceEur != null && plan.monthlyPriceEur > 0) {
        warnings.push(`${plan.name} plan missing monthly Stripe Price ID`);
        missingConfiguration.push(`${plan.name}: missing monthly Stripe Price ID`);
      }
      if (!yearlyPriceId && plan.yearlyPriceEur != null && plan.yearlyPriceEur > 0) {
        warnings.push(`${plan.name} plan missing yearly Stripe Price ID`);
      }
      return {
        slug: plan.slug,
        name: plan.name,
        monthlyPriceId,
        yearlyPriceId,
        warnings,
      };
    });

  const packRows = packs.map((pack) => {
    const priceId = resolvePackStripePriceId(pack);
    const warnings: string[] = [];
    if (!priceId) {
      warnings.push(`${pack.name} missing Stripe Price ID`);
      missingConfiguration.push(`${pack.name}: missing Stripe Price ID`);
    }
    return { slug: pack.slug, name: pack.name, priceId, warnings };
  });

  return {
    connected: isStripeConfigured(),
    environment,
    webhookConfigured: Boolean(webhook),
    plans: planRows,
    creditPacks: packRows,
    missingConfiguration: [...new Set(missingConfiguration)],
    recentBillingFailures: recentFailures,
  };
}
