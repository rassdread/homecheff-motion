/**
 * Audit: DB monthlyPriceEur vs Stripe Price.unit_amount
 * Run: npx tsx scripts/audit-subscription-prices.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe-server";
import { OFFICIAL_SUBSCRIPTION_MONTHLY_EUR } from "@/lib/studio-subscription-prices";
import { STUDIO_PLANS } from "@/server/studio-account/studio-plan-config";

function loadEnv() {
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
      if (override || process.env[key] === undefined) process.env[key] = value;
    }
  }
}

async function main() {
  loadEnv();
  const official = OFFICIAL_SUBSCRIPTION_MONTHLY_EUR;
  const stripe = getStripeClient();
  const plans = await prisma.studioSubscriptionPlan.findMany({ orderBy: { displayOrder: "asc" } });

  const officialPriceIds = new Set(
    ["creator", "pro", "studio"].map((slug) => {
      const envKey = STUDIO_PLANS[slug as keyof typeof STUDIO_PLANS].stripePriceIdEnvKey;
      return envKey ? process.env[envKey]?.trim() : null;
    }).filter(Boolean) as string[]
  );

  const legacySubscriptions: Array<{ id: string; status: string; priceId: string; amountEur: number | null }> =
    [];
  for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
    const priceId = sub.items.data[0]?.price?.id;
    if (!priceId || officialPriceIds.has(priceId)) {
      continue;
    }
    const unit = sub.items.data[0]?.price?.unit_amount;
    legacySubscriptions.push({
      id: sub.id,
      status: sub.status,
      priceId,
      amountEur: unit != null ? unit / 100 : null,
    });
  }

  const rows = [];
  for (const slug of ["creator", "pro", "studio"] as const) {
    const db = plans.find((p) => p.slug === slug);
    const tsConfig = STUDIO_PLANS[slug].monthlyPriceEur;
    const envKey = STUDIO_PLANS[slug].stripePriceIdEnvKey;
    const envPriceId = envKey ? process.env[envKey]?.trim() : null;

    let stripeEur: number | null = null;
    const priceId = db?.stripePriceIdMonthly?.trim() || envPriceId;
    if (priceId) {
      const price = await stripe.prices.retrieve(priceId);
      stripeEur = price.unit_amount != null ? price.unit_amount / 100 : null;
    }

    rows.push({
      slug,
      officialEur: official[slug],
      tsConfigEur: tsConfig,
      dbEur: db?.monthlyPriceEur ?? null,
      dbYearlyEur: db?.yearlyPriceEur ?? null,
      stripePriceId: priceId,
      stripeChargedEur: stripeEur,
      dbMatchesOfficial: db?.monthlyPriceEur === official[slug],
      tsMatchesOfficial: tsConfig === official[slug],
      stripeMatchesOfficial: stripeEur === official[slug],
    });
  }

  console.log(
    JSON.stringify(
      {
        official,
        rows,
        legacyStripeSubscriptions: legacySubscriptions,
        allAligned: rows.every((r) => r.dbMatchesOfficial && r.tsMatchesOfficial && r.stripeMatchesOfficial),
      },
      null,
      2
    )
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
