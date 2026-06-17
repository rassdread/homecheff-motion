/**
 * One-time Vidu economics backfill from task API.
 * Run: npx tsx scripts/backfill-vidu-costs.ts [--dry-run]
 *
 * Creates ProviderUsageLog + ProviderCostEvent only.
 * Does NOT create StudioLedgerEntry or wallet charges.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/prisma";
import {
  CREDIT_UNIT_COST_USD,
  creditsToTotalCostUsd,
} from "@/server/provider-usage/credit-cost";
import {
  resolveRenderTypeForProject,
  resolveViduBillingContext,
} from "@/server/provider-usage/provider-usage-log";
import { COST_ACTION } from "@/server/provider-cost/cost-event-types";

function loadEnv(): void {
  for (const name of [".env", ".env.local"]) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (name === ".env.local" || process.env[k] === undefined) process.env[k] = v;
    }
  }
}

type ViduTask = {
  credits: number;
  duration: number;
  model?: string;
  resolution?: string;
  type?: string;
  state?: string;
};

async function fetchViduTask(providerJobId: string): Promise<ViduTask | null> {
  const base = (process.env.VIDU_BASE_URL ?? "https://api.vidu.com").replace(/\/$/, "");
  const key = process.env.VIDU_API_KEY?.trim();
  if (!key) {
    throw new Error("VIDU_API_KEY is required");
  }
  const res = await fetch(
    `${base}/ent/v2/tasks/${encodeURIComponent(providerJobId)}/creations`,
    { headers: { Authorization: `Token ${key}` } }
  );
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as Record<string, unknown>;
  if (typeof json.credits !== "number") {
    return null;
  }
  return {
    credits: json.credits,
    duration: typeof json.duration === "number" ? json.duration : 5,
    model: typeof json.model === "string" ? json.model : undefined,
    resolution: typeof json.resolution === "string" ? json.resolution : undefined,
    type: typeof json.type === "string" ? json.type : undefined,
    state: typeof json.state === "string" ? json.state : undefined,
  };
}

async function main() {
  loadEnv();
  const dryRun = process.argv.includes("--dry-run");

  const transitions = await prisma.animationTransition.findMany({
    where: { provider: "vidu", status: "completed", providerJobId: { not: null } },
    include: {
      project: {
        select: {
          ownerId: true,
          projectType: true,
          instantMode: true,
          sourceProjectId: true,
          instantFinalRebuildAuditJson: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let recovered = 0;
  let skipped = 0;
  let failed = 0;

  for (const transition of transitions) {
    const providerJobId = transition.providerJobId!;
    const existingPul = await prisma.providerUsageLog.findUnique({
      where: { provider_providerJobId: { provider: "vidu", providerJobId } },
    });
    const existingPce = await prisma.providerCostEvent.findFirst({
      where: { provider: "vidu", relatedJobId: providerJobId, actionType: COST_ACTION.VIDU_RENDER },
    });
    if (existingPul?.completedAt && existingPce?.completedAt) {
      skipped += 1;
      continue;
    }

    const task = await fetchViduTask(providerJobId);
    if (!task) {
      failed += 1;
      console.error(`FAIL ${providerJobId}: API unavailable or missing credits`);
      continue;
    }

    const billingCtx = resolveViduBillingContext(transition.project);
    const renderType = resolveRenderTypeForProject(transition.project);
    const totalCostUsd = creditsToTotalCostUsd(task.credits);
    const completedAt = transition.updatedAt;
    const metadata = {
      model: task.model,
      resolution: task.resolution,
      type: task.type,
      isHistoricalBackfill: true,
      backfillSource: "vidu_task_api",
    };

    if (dryRun) {
      console.log(`DRY ${providerJobId}: ${task.credits} credits ($${totalCostUsd.toFixed(4)})`);
      recovered += 1;
      continue;
    }

    try {
      await prisma.providerUsageLog.upsert({
        where: { provider_providerJobId: { provider: "vidu", providerJobId } },
        create: {
          provider: "vidu",
          providerJobId,
          projectId: transition.projectId,
          userId: transition.project.ownerId,
          renderType,
          status: "completed",
          durationSeconds: task.duration,
          creditsUsed: task.credits,
          creditUnitCostUsd: CREDIT_UNIT_COST_USD,
          totalCostUsd,
          isEstimated: false,
          startedAt: transition.createdAt,
          completedAt,
        },
        update: {
          creditsUsed: task.credits,
          totalCostUsd,
          durationSeconds: task.duration,
          isEstimated: false,
          estimateReason: null,
          needsReview: false,
          status: "completed",
          completedAt,
        },
      });

      if (existingPce) {
        await prisma.providerCostEvent.update({
          where: { id: existingPce.id },
          data: {
            providerJobId,
            unitsUsed: task.credits,
            internalCostUsd: totalCostUsd,
            totalCostUsd,
            status: "completed",
            isEstimated: false,
            estimateReason: null,
            completedAt,
            metadataJson: metadata,
          },
        });
      } else {
        await prisma.providerCostEvent.create({
          data: {
            provider: "vidu",
            actionType: COST_ACTION.VIDU_RENDER,
            projectId: transition.projectId,
            userId: transition.project.ownerId,
            providerJobId,
            relatedJobId: providerJobId,
            unitsUsed: task.credits,
            unitType: "credits",
            unitCostUsd: CREDIT_UNIT_COST_USD,
            internalCostUsd: totalCostUsd,
            totalCostUsd,
            status: "completed",
            isEstimated: false,
            metadataJson: {
              ...metadata,
              renderType,
              instantMode: billingCtx.instantMode,
            },
            startedAt: transition.createdAt,
            completedAt,
          },
        });
      }

      recovered += 1;
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${providerJobId}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        totalTransitions: transitions.length,
        recovered,
        skipped,
        failed,
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
