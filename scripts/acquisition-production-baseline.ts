/**
 * Anonymized Production commercial baseline for Studio (acquisition measurement).
 * No PII in output. Writes JSON under homecheff-leads/docs/gtm/evidence-acquisition-baseline/.
 *
 * Usage (from homecheff-motion): npx tsx scripts/acquisition-production-baseline.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { prisma } from "../src/lib/prisma";

/** GTM acquisition playbook commercial list prices (EUR/mo) for MRR baseline. */
const ACQUISITION_MRR_EUR: Record<string, number> = {
  creator: 15,
  pro: 29,
  studio: 79,
};

const ACTIVE_BILLING = ["active", "past_due", "prepaid"] as const;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function main() {
  const now = new Date();
  const d30 = daysAgo(30);
  const leadsEvidenceDir = join(
    "/Users/sergioarrias/HomeCheffProjects/homecheff-leads",
    "docs/gtm/evidence-acquisition-baseline",
  );

  const [
    STUDIO_USERS,
    STUDIO_FREE_USERS,
    paidAccounts,
    packPurchases30,
    projectsCreated30,
    exports30,
    hcSpendRows,
    animationActiveOwners,
    creativeActiveOwners,
    exportActiveOwners,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.studioAccount.count({ where: { accountType: "free" } }),
    prisma.studioAccount.findMany({
      where: {
        accountType: { in: ["creator", "pro", "studio"] },
        billingStatus: { in: [...ACTIVE_BILLING] },
      },
      select: { accountType: true },
    }),
    prisma.studioLedgerEntry
      .count({
        where: {
          actionType: "credit_purchase",
          createdAt: { gte: d30 },
        },
      })
      .catch(() => -1),
    prisma.animationProject
      .count({ where: { createdAt: { gte: d30 } } })
      .catch(async () => {
        try {
          return await prisma.studioCreativeProject.count({ where: { createdAt: { gte: d30 } } });
        } catch {
          return -1;
        }
      }),
    prisma.animationExport
      .count({
        where: {
          status: "completed",
          createdAt: { gte: d30 },
        },
      })
      .catch(() => -1),
    prisma.studioLedgerEntry
      .aggregate({
        where: {
          createdAt: { gte: d30 },
          creditsDelta: { lt: 0 },
          actionType: { in: ["usage_capture", "usage_charge"] },
        },
        _sum: { creditsDelta: true },
      })
      .catch(() => null),
    prisma.animationProject
      .findMany({
        where: { updatedAt: { gte: d30 } },
        select: { ownerId: true },
        distinct: ["ownerId"],
      })
      .catch(() => [] as { ownerId: string }[]),
    prisma.studioCreativeProject
      .findMany({
        where: { updatedAt: { gte: d30 } },
        select: { ownerId: true },
        distinct: ["ownerId"],
      })
      .catch(() => [] as { ownerId: string }[]),
    prisma.animationExport
      .findMany({
        where: { createdAt: { gte: d30 }, status: "completed" },
        select: { project: { select: { ownerId: true } } },
      })
      .catch(() => [] as { project: { ownerId: string } }[]),
  ]);

  const activeSet = new Set<string>();
  for (const r of animationActiveOwners) activeSet.add(r.ownerId);
  for (const r of creativeActiveOwners) activeSet.add(r.ownerId);
  for (const r of exportActiveOwners) {
    if (r.project?.ownerId) activeSet.add(r.project.ownerId);
  }

  let creatorActive = 0;
  let proActive = 0;
  let studioActive = 0;
  let mrrEur = 0;
  for (const a of paidAccounts) {
    const t = a.accountType;
    if (t === "creator") creatorActive += 1;
    else if (t === "pro") proActive += 1;
    else if (t === "studio") studioActive += 1;
    const price = ACQUISITION_MRR_EUR[t];
    if (typeof price === "number") mrrEur += price;
  }

  let STUDIO_HC_SPENT_30D: number | string = "UNKNOWN";
  let hcSpentWhy: string | undefined;
  if (hcSpendRows && hcSpendRows._sum.creditsDelta != null) {
    STUDIO_HC_SPENT_30D = Math.abs(hcSpendRows._sum.creditsDelta);
  } else if (hcSpendRows === null) {
    STUDIO_HC_SPENT_30D = "UNKNOWN";
    hcSpentWhy =
      "StudioLedgerEntry aggregate failed (table/query unavailable); lifetimeSpent has no 30d delta snapshot";
  } else {
    STUDIO_HC_SPENT_30D = 0;
  }

  const stamp = now.toISOString().slice(0, 10);
  const metrics: Record<string, number | string | null> = {
    BASELINE_DATE: stamp,
    PRODUCT: "studio",
    STUDIO_USERS,
    STUDIO_ACTIVE_30D: activeSet.size,
    STUDIO_FREE_USERS,
    STUDIO_CREATOR_ACTIVE: creatorActive,
    STUDIO_PRO_ACTIVE: proActive,
    STUDIO_STUDIO_ACTIVE: studioActive,
    STUDIO_MRR: mrrEur,
    STUDIO_MRR_PRICE_MAP: "creator=15,pro=29,studio=79 (GTM acquisition list; not legacy 7.99)",
    STUDIO_PACK_PURCHASES_30D: packPurchases30 < 0 ? "UNKNOWN" : packPurchases30,
    STUDIO_PROJECTS_CREATED_30D: projectsCreated30 < 0 ? "UNKNOWN" : projectsCreated30,
    STUDIO_EXPORTS_30D: exports30 < 0 ? "UNKNOWN" : exports30,
    STUDIO_HC_SPENT_30D,
    ...(hcSpentWhy ? { STUDIO_HC_SPENT_30D_WHY: hcSpentWhy } : {}),
  };

  const rows = Object.entries(metrics)
    .filter(([k]) => k !== "PRODUCT" && k !== "STUDIO_MRR_PRICE_MAP" && !k.endsWith("_WHY"))
    .map(([METRIC, VALUE]) => ({
      BASELINE_DATE: stamp,
      PRODUCT: "studio",
      METRIC,
      VALUE,
      SOURCE: "studio_production_db_aggregate",
    }));

  mkdirSync(leadsEvidenceDir, { recursive: true });
  const outPath = join(leadsEvidenceDir, `studio-baseline-${stamp}.json`);
  writeFileSync(
    outPath,
    JSON.stringify({ capturedAt: now.toISOString(), metrics, rows }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, outPath, metrics }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
