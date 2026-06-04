/**
 * Admin-wide video storage audit across animation projects.
 */

import { prisma } from "@/lib/prisma";
import { animationProjectWithMediaInclude } from "@/server/animation-projects/queries";
import {
  aggregateAdminStorageAudit,
  auditProjectStorage,
  projectStorageRowFromAudit,
  type AdminStorageAuditSummary,
} from "@/server/animation-projects/project-storage-audit";
import { computeExtendedStorageAuditMetrics } from "@/lib/storage-audit-extended";

const DEFAULT_PROJECT_LIMIT = 250;
const AUDIT_CONCURRENCY = 4;

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current]!);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function auditAdminVideoStorage(params?: {
  projectLimit?: number;
}): Promise<AdminStorageAuditSummary> {
  const limit = params?.projectLimit ?? DEFAULT_PROJECT_LIMIT;
  const projects = await prisma.animationProject.findMany({
    where: {
      OR: [
        { instantCleanFinalVideoUrl: { not: null } },
        { exports: { some: { outputVideoUrl: { not: null } } } },
        { languageExports: { some: { outputVideoUrl: { not: null } } } },
        { transitions: { some: { outputVideoUrl: { not: null } } } },
      ],
    },
    include: animationProjectWithMediaInclude,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const audits = await mapWithConcurrency(projects, AUDIT_CONCURRENCY, async (project) =>
    auditProjectStorage({ project })
  );
  const rows = audits.map(projectStorageRowFromAudit);
  const summary = aggregateAdminStorageAudit(rows);
  return {
    ...summary,
    extendedMetrics: computeExtendedStorageAuditMetrics({ audits, adminRows: rows }),
  };
}
