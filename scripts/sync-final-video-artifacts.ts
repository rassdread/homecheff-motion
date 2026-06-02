#!/usr/bin/env npx tsx
/**
 * Sync DB export state from existing final/clean blobs (no Vidu, merge, or upload).
 *
 * Usage:
 *   npx tsx scripts/sync-final-video-artifacts.ts <projectId>
 */

import { syncFinalVideoArtifactsFromBlob } from "../src/server/instant-premium/sync-final-video-artifacts";

const projectId = process.argv[2]?.trim();
if (!projectId) {
  console.error("Usage: npx tsx scripts/sync-final-video-artifacts.ts <projectId>");
  process.exit(1);
}

async function main() {
  const result = await syncFinalVideoArtifactsFromBlob(projectId);
  console.info("[sync-final-video-artifacts]", JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[sync-final-video-artifacts]", error);
  process.exit(1);
});
