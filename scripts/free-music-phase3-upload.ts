#!/usr/bin/env npx tsx
/**
 * Idempotent Free Music master upload to Vercel Blob.
 * Usage:
 *   npx tsx scripts/free-music-phase3-upload.ts --pilot-only
 *   npx tsx scripts/free-music-phase3-upload.ts --all
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadFreeMusicRegistry } from "@/lib/free-music/registry";
import { uploadFreeMusicTracksIdempotent } from "@/lib/free-music/blob-upload";
import { PILOT_TRACK_IDS } from "@/lib/free-music/reconcile";

const all = process.argv.includes("--all");
const pilotOnly = process.argv.includes("--pilot-only") || !all;
const outDir = join(process.cwd(), "docs/audits/studio-free-music/phase-3");
mkdirSync(outDir, { recursive: true });

const registry = loadFreeMusicRegistry(true);
const tracks = registry.filter((t) =>
  pilotOnly
    ? PILOT_TRACK_IDS.includes(t.trackId as (typeof PILOT_TRACK_IDS)[number])
    : t.rightsReviewStatus === "APPROVED"
);

async function main() {
  const result = await uploadFreeMusicTracksIdempotent(tracks);
  const payload = { generatedAt: new Date().toISOString(), pilotOnly, ...result };
  writeFileSync(join(outDir, "PRODUCTION-STORAGE-CERTIFICATION.json"), JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
  if (result.failed > 0) process.exit(1);
}

void main();
