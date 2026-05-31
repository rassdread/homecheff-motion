#!/usr/bin/env npx tsx
/**
 * Backfill transition segment videos to Vercel Blob.
 *
 * Usage:
 *   npx tsx scripts/backfill-segment-blobs.ts
 *   npx tsx scripts/backfill-segment-blobs.ts --since=2026-05-21
 *   npx tsx scripts/backfill-segment-blobs.ts --project=<projectId>
 *   npx tsx scripts/backfill-segment-blobs.ts --dry-run
 */

import { isBlobSegmentUrl } from "../src/lib/segment-blob-storage";
import { prisma } from "../src/lib/prisma";
import { ensureTransitionOutputInBlob } from "../src/server/animation-projects/ensure-transition-blob";

const DEFAULT_SINCE = "2026-05-21T00:00:00.000Z";

function parseArgs(argv: string[]) {
  const args = argv.filter((a) => a !== "--");
  const dryRun = args.includes("--dry-run");
  const sinceArg = args.find((a) => a.startsWith("--since="))?.slice("--since=".length);
  const projectId = args.find((a) => a.startsWith("--project="))?.slice("--project=".length)?.trim();
  const since = sinceArg ? new Date(sinceArg) : new Date(DEFAULT_SINCE);
  if (Number.isNaN(since.getTime())) {
    throw new Error(`Invalid --since date: ${sinceArg}`);
  }
  return { dryRun, since, projectId: projectId || undefined };
}

async function main() {
  const { dryRun, since, projectId } = parseArgs(process.argv.slice(2));

  const transitions = await prisma.animationTransition.findMany({
    where: {
      status: "completed",
      outputVideoUrl: { not: null },
      ...(projectId ? { projectId } : {}),
      project: projectId ? undefined : { createdAt: { gte: since } },
    },
    orderBy: [{ project: { createdAt: "asc" } }, { order: "asc" }],
    select: {
      id: true,
      projectId: true,
      order: true,
      status: true,
      outputVideoUrl: true,
      providerJobId: true,
      project: { select: { createdAt: true } },
    },
  });

  const pending = transitions.filter((t) => !isBlobSegmentUrl(t.outputVideoUrl));
  console.info("[backfill-segment-blobs]", {
    since: since.toISOString(),
    projectId: projectId ?? "all",
    dryRun,
    totalCompleted: transitions.length,
    pendingBlob: pending.length,
  });

  if (dryRun) {
    for (const t of pending) {
      console.info("would backfill", {
        projectId: t.projectId,
        order: t.order,
        createdAt: t.project.createdAt.toISOString(),
        url: t.outputVideoUrl?.slice(0, 80),
      });
    }
    return;
  }

  let stored = 0;
  let alreadyStored = 0;
  let failed = 0;

  for (const transition of pending) {
    const result = await ensureTransitionOutputInBlob(transition);
    if (result.ok) {
      if (result.alreadyStored) {
        alreadyStored += 1;
      } else {
        stored += 1;
        console.info("stored", {
          projectId: transition.projectId,
          order: transition.order,
          url: result.url.slice(0, 100),
        });
      }
    } else {
      failed += 1;
      console.error("failed", {
        projectId: transition.projectId,
        order: transition.order,
        error: result.error,
      });
    }
  }

  console.info("[backfill-segment-blobs] done", {
    stored,
    alreadyStored,
    failed,
    skippedAlreadyBlob: transitions.length - pending.length,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
