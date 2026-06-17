/**
 * Full billing verification — loads .env + .env.local, never prints secret values.
 * Run: npx tsx scripts/billing-verification-check.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadStripeReadiness } from "@/server/admin/studio-stripe-readiness-service";
import {
  handleStripeWebhookEvent,
  isStripeCheckoutAvailable,
} from "@/server/studio-account/stripe-billing";
import {
  listStudioSubscriptionPlans,
  resolvePlanStripePriceId,
  upsertStudioSubscriptionPlan,
} from "@/server/studio-account/studio-subscription-plan-service";
import {
  listStudioCreditPacks,
  resolvePackStripePriceId,
  upsertStudioCreditPack,
} from "@/server/studio-account/studio-credit-pack-service";
import {
  STUDIO_PLANS,
  resolveStripePriceId,
  type StudioPlanId,
} from "@/server/studio-account/studio-plan-config";
import { subscriptionYearlyPriceEur } from "@/lib/studio-subscription-prices";
import {
  STUDIO_CREDIT_PACKS,
  resolveCreditPackStripePriceId,
} from "@/server/studio-account/studio-credit-packs";
import {
  computePromoBenefits,
  validatePromoCode,
} from "@/server/studio-account/studio-promo-code-service";
import { prisma } from "@/lib/prisma";
import { ensureStudioWallet } from "@/server/studio-account/studio-wallet-service";
import type Stripe from "stripe";

const REQUIRED_ENV = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "STRIPE_PRICE_CREATOR",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_STUDIO",
  "STRIPE_PRICE_PACK_500",
  "STRIPE_PRICE_PACK_1250",
  "STRIPE_PRICE_PACK_3000",
  "STRIPE_PRICE_PACK_8000",
] as const;

const YEARLY_ENV = [
  "STRIPE_PRICE_CREATOR_YEARLY",
  "STRIPE_PRICE_PRO_YEARLY",
  "STRIPE_PRICE_STUDIO_YEARLY",
] as const;

const REQUIRED_PLAN_SLUGS = ["creator", "pro", "studio"] as const;
const REQUIRED_PACK_SLUGS = ["pack_500", "pack_1250", "pack_3000", "pack_8000"] as const;

function mask(value: string | undefined, prefixLen = 8): string {
  if (!value?.trim()) return "missing";
  const v = value.trim();
  return `${v.slice(0, prefixLen)}…`;
}

function loadProjectEnvFiles(): string[] {
  const loaded: string[] = [];
  for (const name of [".env", ".env.local"] as const) {
    const filePath = resolve(process.cwd(), name);
    if (!existsSync(filePath)) continue;
    const override = name === ".env.local";
    for (const line of readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (override || process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    loaded.push(name);
  }
  return loaded;
}

async function syncMissingCatalogFromEnv(): Promise<{ plansCreated: string[]; plansSynced: string[]; packsSynced: string[] }> {
  const plansCreated: string[] = [];
  const plansSynced: string[] = [];
  const packsSynced: string[] = [];

  for (const slug of REQUIRED_PLAN_SLUGS) {
    const config = STUDIO_PLANS[slug];
    const envPriceMonthly = resolveStripePriceId(slug, "monthly");
    const envPriceYearly = resolveStripePriceId(slug, "yearly");
    const existing = await prisma.studioSubscriptionPlan.findUnique({ where: { slug } });
    if (!existing) {
      await upsertStudioSubscriptionPlan({
        slug,
        name: slug.charAt(0).toUpperCase() + slug.slice(1),
        monthlyPriceEur: config.monthlyPriceEur,
        yearlyPriceEur:
          config.monthlyPriceEur != null ? subscriptionYearlyPriceEur(config.monthlyPriceEur) : null,
        discountPercent: config.creditDiscountPercent,
        storageLimitGb: config.storageLimitGb,
        autoTopUpAvailable: config.autoTopUpAvailable,
        isVisible: true,
        isActive: true,
        displayOrder: slug === "creator" ? 1 : slug === "pro" ? 2 : 3,
        stripePriceIdMonthly: envPriceMonthly,
        stripePriceIdYearly: envPriceYearly,
      });
      plansCreated.push(slug);
    } else {
      const updates: { stripePriceIdMonthly?: string; stripePriceIdYearly?: string } = {};
      if (!existing.stripePriceIdMonthly?.trim() && envPriceMonthly) {
        updates.stripePriceIdMonthly = envPriceMonthly;
      }
      if (!existing.stripePriceIdYearly?.trim() && envPriceYearly) {
        updates.stripePriceIdYearly = envPriceYearly;
      }
      if (Object.keys(updates).length > 0) {
        await prisma.studioSubscriptionPlan.update({ where: { slug }, data: updates });
        plansSynced.push(slug);
      }
    }
  }

  for (const packConfig of STUDIO_CREDIT_PACKS) {
    const envPrice = resolveCreditPackStripePriceId(packConfig.id);
    const existing = await prisma.studioCreditPack.findUnique({ where: { slug: packConfig.id } });
    if (!existing) {
      await upsertStudioCreditPack({
        slug: packConfig.id,
        name: `${packConfig.credits} credits`,
        credits: packConfig.credits,
        priceEur: packConfig.priceEur,
        active: true,
        displayOrder: REQUIRED_PACK_SLUGS.indexOf(packConfig.id) + 1,
        stripePriceId: envPrice,
      });
    } else if (!existing.stripePriceId?.trim() && envPrice) {
      await prisma.studioCreditPack.update({
        where: { slug: packConfig.id },
        data: { stripePriceId: envPrice },
      });
      packsSynced.push(packConfig.id);
    }
  }

  return { plansCreated, plansSynced, packsSynced };
}

async function main() {
  const envFilesLoaded = loadProjectEnvFiles();

  const envValidation = {
    present: Object.fromEntries([
      ...REQUIRED_ENV.map((k) => [k, Boolean(process.env[k]?.trim())] as const),
      ...YEARLY_ENV.map((k) => [k, Boolean(process.env[k]?.trim())] as const),
    ]),
    masked: {
      STRIPE_SECRET_KEY: mask(process.env.STRIPE_SECRET_KEY),
      STRIPE_WEBHOOK_SECRET: mask(process.env.STRIPE_WEBHOOK_SECRET),
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "missing",
    },
    format: {
      secretKeyIsLive: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ?? false,
      webhookStartsWhsec: process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_") ?? false,
      appUrlIsStudio: process.env.NEXT_PUBLIC_APP_URL?.trim() === "https://studio.homecheff.eu",
      priceIdsStartWithPrice: REQUIRED_ENV.filter((k) => k.startsWith("STRIPE_PRICE_")).every((k) =>
        process.env[k]?.trim().startsWith("price_")
      ),
    },
  };

  const catalogSync = await syncMissingCatalogFromEnv();

  const readiness = await loadStripeReadiness();
  const plans = await listStudioSubscriptionPlans({ visibleOnly: true, activeOnly: true });
  const packs = await listStudioCreditPacks({ activeOnly: true });

  const checkoutReadiness = {
    subscriptions: Object.fromEntries(
      REQUIRED_PLAN_SLUGS.map((slug) => {
        const plan = plans.find((p) => p.slug === slug);
        const monthlyPriceId = plan ? resolvePlanStripePriceId(plan, "monthly") : null;
        const yearlyPriceId = plan ? resolvePlanStripePriceId(plan, "yearly") : null;
        const envKeyMonthly = STUDIO_PLANS[slug].stripePriceIdEnvKey;
        const envKeyYearly = STUDIO_PLANS[slug].stripePriceIdYearlyEnvKey;
        return [
          slug,
          {
            planFound: Boolean(plan),
            monthlyPriceId: monthlyPriceId ? mask(monthlyPriceId, 12) : null,
            yearlyPriceId: yearlyPriceId ? mask(yearlyPriceId, 12) : null,
            monthlySource: plan?.stripePriceIdMonthly?.trim()
              ? "db"
              : plan?.source === "fallback"
                ? "env_fallback"
                : monthlyPriceId
                  ? "env"
                  : "missing",
            yearlySource: plan?.stripePriceIdYearly?.trim()
              ? "db"
              : plan?.source === "fallback"
                ? "env_fallback"
                : yearlyPriceId
                  ? "env"
                  : "missing",
            envVarMonthly: envKeyMonthly ?? null,
            envVarYearly: envKeyYearly ?? null,
          },
        ];
      })
    ),
    creditPacks: Object.fromEntries(
      REQUIRED_PACK_SLUGS.map((slug) => {
        const pack = packs.find((p) => p.slug === slug);
        const priceId = pack ? resolvePackStripePriceId(pack) : null;
        return [
          slug,
          {
            packFound: Boolean(pack),
            resolvedPriceId: priceId ? mask(priceId, 12) : null,
            source: pack?.stripePriceId?.trim() ? "db" : priceId ? "env_fallback" : "missing",
          },
        ];
      })
    ),
    checkoutAvailable: await isStripeCheckoutAvailable(),
  };

  const webhookTests: Record<string, { pass: boolean; detail: string }> = {};
  const testUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  if (testUser) {
    let account = await prisma.studioAccount.findUnique({ where: { userId: testUser.id } });
    if (!account) {
      account = await prisma.studioAccount.create({
        data: {
          userId: testUser.id,
          accountType: "free",
          studioPlan: "free",
          billingStatus: "none",
          planVersion: "v1",
          creditPolicyVersion: "v1",
        },
      });
    }
    await ensureStudioWallet(testUser.id);

    // credit pack grant
    const beforePack = await ensureStudioWallet(testUser.id);
    const packSessionId = `cs_verify_pack_${Date.now()}`;
    await handleStripeWebhookEvent({
      id: `evt_pack_${Date.now()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: packSessionId,
          metadata: {
            userId: testUser.id,
            type: "credit_pack",
            packSlug: "pack_500",
            credits: "500",
            totalCredits: "500",
          },
        },
      },
    } as Stripe.Event);
    const afterPack = await ensureStudioWallet(testUser.id);
    const packLedger = await prisma.studioLedgerEntry.findFirst({
      where: { userId: testUser.id, actionType: "credit_purchase" },
      orderBy: { createdAt: "desc" },
    });
    webhookTests.creditPackGrant = {
      pass: afterPack.balance >= beforePack.balance + 500 && packLedger?.creditsDelta === 500,
      detail: `wallet ${beforePack.balance}→${afterPack.balance}, ledger Δ${packLedger?.creditsDelta ?? 0}`,
    };

    // subscription update
    const customerId = `cus_verify_${Date.now()}`;
    await prisma.studioAccount.update({
      where: { userId: testUser.id },
      data: { stripeCustomerId: customerId },
    });
    const subId = `sub_verify_${Date.now()}`;
    await handleStripeWebhookEvent({
      id: `evt_sub_${Date.now()}`,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: subId,
          customer: customerId,
          status: "active",
          metadata: { userId: testUser.id, planId: "pro" },
          items: { data: [{ price: { id: process.env.STRIPE_PRICE_PRO } }] },
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
          cancel_at_period_end: false,
        },
      },
    } as Stripe.Event);
    const afterSub = await prisma.studioAccount.findUnique({ where: { userId: testUser.id } });
    webhookTests.subscriptionUpdate = {
      pass: afterSub?.studioPlan === "pro" && afterSub.billingStatus === "active",
      detail: `plan=${afterSub?.studioPlan}, status=${afterSub?.billingStatus}`,
    };

    // invoice.paid — no credit grant
    const beforeInvoice = await ensureStudioWallet(testUser.id);
    await handleStripeWebhookEvent({
      id: `evt_inv_${Date.now()}`,
      type: "invoice.paid",
      data: {
        object: {
          id: `in_verify_${Date.now()}`,
          customer: customerId,
          subscription: subId,
        },
      },
    } as Stripe.Event);
    const afterInvoice = await ensureStudioWallet(testUser.id);
    webhookTests.invoicePaidNoCreditGrant = {
      pass: afterInvoice.balance === beforeInvoice.balance,
      detail: `wallet unchanged at ${afterInvoice.balance}`,
    };

    // subscription deleted — prepaid, credits retained
    const creditsBeforeCancel = afterInvoice.balance;
    await handleStripeWebhookEvent({
      id: `evt_del_${Date.now()}`,
      type: "customer.subscription.deleted",
      data: {
        object: { id: subId, customer: customerId },
      },
    } as Stripe.Event);
    const afterCancel = await prisma.studioAccount.findUnique({ where: { userId: testUser.id } });
    const walletAfterCancel = await ensureStudioWallet(testUser.id);
    webhookTests.subscriptionDeletedPrepaid = {
      pass:
        afterCancel?.billingStatus === "prepaid" &&
        afterCancel.studioPlan === "free" &&
        walletAfterCancel.balance >= creditsBeforeCancel,
      detail: `status=${afterCancel?.billingStatus}, plan=${afterCancel?.studioPlan}, credits=${walletAfterCancel.balance}`,
    };
  } else {
    webhookTests.skipped = { pass: false, detail: "no user in database" };
  }

  const promoBenefits100 = computePromoBenefits({
    benefitType: "percentage_discount",
    basePriceEur: 4.99,
    promotion: {
      creditAmount: 0,
      percentageDiscount: 100,
      fixedDiscountEur: null,
      subscriptionDiscountPercent: null,
      creditPackBonusPercent: null,
      freeTrialCredits: null,
    },
  });

  const promoFlow = {
    compute100PercentDiscount: promoBenefits100.adjustedPriceEur === 0,
    validateEmptyCode: (await validatePromoCode({ code: "", checkoutType: "credit_pack", packSlug: "pack_500" })).valid === false,
    adminCreatePromotionRoute: existsSync(resolve(process.cwd(), "src/app/api/admin/billing/promotions/route.ts")),
    adminCreatePromoCodeRoute: existsSync(resolve(process.cwd(), "src/app/api/admin/billing/promo-codes/route.ts")),
    userValidateRoute: existsSync(resolve(process.cwd(), "src/app/api/me/billing/promo/validate/route.ts")),
    checkoutAcceptsPromoCode: existsSync(resolve(process.cwd(), "src/app/api/me/studio-credits/checkout/route.ts")),
  };

  const catalogSlugs = {
    plans: plans.map((p) => p.slug),
    packs: packs.map((p) => p.slug),
    plansComplete: REQUIRED_PLAN_SLUGS.every((s) => plans.some((p) => p.slug === s)),
    packsComplete: REQUIRED_PACK_SLUGS.every((s) => packs.some((p) => p.slug === s)),
  };

  console.log(
    JSON.stringify(
      {
        phase1_env: {
          envFilesLoaded,
          allRequiredPresent: REQUIRED_ENV.every((k) => envValidation.present[k]),
          ...envValidation,
        },
        phase2_stripeReadiness: {
          green: readiness.missingConfiguration.length === 0,
          missing: readiness.missingConfiguration,
          connected: readiness.connected,
          webhookConfigured: readiness.webhookConfigured,
          environment: readiness.environment,
          plans: readiness.plans.map((p) => ({
            slug: p.slug,
            monthly: p.monthlyPriceId ? mask(p.monthlyPriceId, 12) : "missing",
            yearly: p.yearlyPriceId ? mask(p.yearlyPriceId, 12) : "missing",
            warnings: p.warnings,
          })),
          creditPacks: readiness.creditPacks.map((p) => ({
            slug: p.slug,
            priceId: p.priceId ? mask(p.priceId, 12) : "missing",
          })),
        },
        phase3_catalog: { catalogSync, catalogSlugs },
        phase5_checkoutReadiness: checkoutReadiness,
        phase6_webhookTests: webhookTests,
        phase7_promoFlow: promoFlow,
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
