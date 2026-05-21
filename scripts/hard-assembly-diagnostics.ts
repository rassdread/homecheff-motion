#!/usr/bin/env npx tsx
/**
 * Print hard assembly diagnostics (same payload as admin API).
 *
 * Usage: npx tsx scripts/hard-assembly-diagnostics.ts <projectId>
 */

import { buildHardAssemblyDiagnostics } from "../src/server/instant-premium/hard-assembly-diagnostics";
import { prisma } from "../src/lib/prisma";

async function main() {
  const projectId = process.argv[2]?.trim();
  if (!projectId) {
    console.error("Usage: npx tsx scripts/hard-assembly-diagnostics.ts <projectId>");
    process.exit(1);
  }
  const diagnostics = await buildHardAssemblyDiagnostics(projectId);
  if (!diagnostics) {
    console.error("Project not found.");
    process.exit(1);
  }
  console.log(JSON.stringify(diagnostics, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
