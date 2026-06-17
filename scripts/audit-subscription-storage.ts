/**
 * Audit: DB + billing policy storage limits vs official SSOT
 * Run: npx tsx scripts/audit-subscription-storage.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/prisma";
import { OFFICIAL_PLAN_STORAGE_GB } from "@/lib/studio-subscription-storage";
import { getPlanBenefits } from "@/server/studio-account/studio-billing-policy-service";
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

  const dbPlans = await prisma.studioSubscriptionPlan.findMany({
    where: { slug: { in: ["creator", "pro", "studio"] } },
    orderBy: { displayOrder: "asc" },
  });

  const policy = await prisma.studioBillingPolicy.findUnique({ where: { id: "default" } });

  const rows = [];
  for (const slug of ["free", "creator", "pro", "studio"] as const) {
    const official = OFFICIAL_PLAN_STORAGE_GB[slug];
    const tsConfig = STUDIO_PLANS[slug].storageLimitGb;
    const dbPlan = dbPlans.find((p) => p.slug === slug);
    const runtimeBenefits = await getPlanBenefits(slug);
    const policyGb = runtimeBenefits.storageLimitGb;

    rows.push({
      slug,
      officialGb: official,
      tsConfigGb: tsConfig,
      dbGb: dbPlan?.storageLimitGb ?? null,
      runtimePolicyGb: policyGb,
      tsMatchesOfficial: tsConfig === official,
      dbMatchesOfficial: dbPlan ? dbPlan.storageLimitGb === official : slug === "free",
      runtimeMatchesOfficial: policyGb === official,
    });
  }

  console.log(
    JSON.stringify(
      {
        official: OFFICIAL_PLAN_STORAGE_GB,
        rows,
        policyRowExists: Boolean(policy),
        allAligned: rows.every(
          (r) => r.tsMatchesOfficial && r.runtimeMatchesOfficial && (r.slug === "free" || r.dbMatchesOfficial)
        ),
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
