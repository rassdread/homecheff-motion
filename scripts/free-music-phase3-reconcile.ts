#!/usr/bin/env npx tsx
/**
 * Phase 3 Free Music reconciliation — registry, local masters, pilot subset.
 * Usage: npx tsx scripts/free-music-phase3-reconcile.ts [--pilot-only]
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { reconcileFreeMusicCatalog, PILOT_TRACK_IDS, verifyTrackProvenance } from "@/lib/free-music/reconcile";
import { loadFreeMusicRegistry } from "@/lib/free-music/registry";

const pilotOnly = process.argv.includes("--pilot-only");
const mastersDir = join(process.cwd(), "tmp/free-music-masters");
const outDir = join(process.cwd(), "docs/audits/studio-free-music/phase-3");

mkdirSync(outDir, { recursive: true });

const report = reconcileFreeMusicCatalog({ mastersDir });
const tracks = loadFreeMusicRegistry(true).filter((t) =>
  pilotOnly ? PILOT_TRACK_IDS.includes(t.trackId as (typeof PILOT_TRACK_IDS)[number]) : true
);

const pilotProvenance = tracks.map((t) => verifyTrackProvenance(t, mastersDir));

const payload = {
  generatedAt: new Date().toISOString(),
  pilotOnly,
  mastersDir,
  summary: report,
  pilotProvenance,
};

writeFileSync(join(outDir, "MASTER-HASH-RECONCILIATION.json"), JSON.stringify(payload, null, 2));

console.log(JSON.stringify({ ok: true, ...report, pilotProvenancePass: pilotProvenance.filter((p) => p.trackProvenanceMatch === "PASS").length }, null, 2));
