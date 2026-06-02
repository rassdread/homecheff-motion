#!/usr/bin/env npx tsx
/**
 * Story Mode repair without Vidu — normalizes transition rows and reruns merge.
 *
 * Usage:
 *   npx tsx scripts/repair-story-instant-project.ts <projectId>
 */

import { prisma } from "../src/lib/prisma";
import { parseInstantMode } from "../src/lib/instant-premium-mode-types";
import { repairInstantPremiumFinalVideo } from "../src/server/instant-premium/finalize-repair";
import { buildProviderVideoStorageRows } from "../src/server/instant-premium/canonical-provider-video";
import { selectTransitionsForProviderStorageValidation } from "../src/server/instant-premium/story-mode-transitions";
import { ensureStoryModeTransitionRows } from "../src/server/instant-premium/story-mode-transitions";

const projectId = process.argv[2]?.trim();
if (!projectId) {
  console.error("Usage: npx tsx scripts/repair-story-instant-project.ts <projectId>");
  process.exit(1);
}

async function main() {
  const normalized = await ensureStoryModeTransitionRows(projectId);
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!project) {
    console.error("Project not found.");
    process.exit(1);
  }

  const mode = parseInstantMode(project.instantMode);
  const forStorage = selectTransitionsForProviderStorageValidation(
    mode,
    project.transitions
  );
  const probe = await buildProviderVideoStorageRows(
    forStorage.map((t, idx) => ({
      transitionId: t.id,
      segmentIndex: idx,
      transitionOrder: t.order,
      status: t.status,
      provider: t.provider,
      providerJobId: t.providerJobId,
      outputVideoUrl: t.outputVideoUrl,
      updatedAt: t.updatedAt,
    }))
  );

  console.info("[repair-story]", {
    projectId,
    mode,
    normalized,
    transitionCount: project.transitions.length,
    exportBefore: project.exports[0],
    providerProbe: probe,
  });

  const repair = await repairInstantPremiumFinalVideo(projectId, {
    force: true,
    source: "repair-story-script",
  });

  const after = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  console.info("[repair-story]", {
    repair,
    exportAfter: after?.exports[0],
    transitions: after?.transitions.map((t) => ({
      id: t.id,
      order: t.order,
      status: t.status,
      outputVideoUrl: t.outputVideoUrl,
    })),
  });

  if (!repair.ok) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
