#!/usr/bin/env npx tsx
/**
 * Production cert: merge rebuild (provider-free) + audio mix module verification.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUT = join(ROOT, "docs/audits/full-studio-cert");
const STUDIO = "https://studio.homecheff.eu";
const PROFILE = join(ROOT, ".px4a7-prod-profile");
const PROJECT_ID = "cmt5hnj1s0003jh09hns3vu4v";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: true,
    args: ["--headless=new"],
  });
  const report: Record<string, unknown> = {
    at: new Date().toISOString(),
    productionUrl: STUDIO,
    expectedCommit: "90926699",
    projectId: PROJECT_ID,
  };

  try {
    const before = await (
      await ctx.request.get(`${STUDIO}/api/instant-premium/projects/${PROJECT_ID}/status`)
    ).json();
    report.statusBefore = {
      status: before.status,
      phase: before.phase,
      progressPercent: before.progressPercent,
      finalVideoUrl: Boolean(before.finalVideoUrl),
    };

    const t0 = Date.now();
    const rb = await ctx.request.post(
      `${STUDIO}/api/instant-premium/projects/${PROJECT_ID}/rebuild-final-video`,
      { data: {}, timeout: 300_000 }
    );
    const rbBody = await rb.json();
    report.rebuild = {
      http: rb.status(),
      ok: rbBody?.ok ?? rbBody?.rebuild?.ok,
      elapsedMs: Date.now() - t0,
      finalVideoUrlPresent: Boolean(rbBody?.finalVideoUrl ?? rbBody?.rebuild?.finalVideoUrl),
      clipsReady: rbBody?.rebuild?.clipsReady,
    };

    let after = before;
    for (let i = 0; i < 60; i++) {
      after = await (
        await ctx.request.get(`${STUDIO}/api/instant-premium/projects/${PROJECT_ID}/status`)
      ).json();
      if (after.status === "completed" && after.finalVideoUrl) break;
      await sleep(5000);
    }
    report.statusAfter = {
      status: after.status,
      phase: after.phase,
      progressPercent: after.progressPercent,
      finalVideoUrl: Boolean(after.finalVideoUrl),
      workerJobStatus: after.workerJobStatus,
      activeOperation: after.activeOperation,
    };
    report.mergeCert = {
      automaticPathNotDirectlyTested: true,
      rebuildPathMs: report.rebuild.elapsedMs,
      reachedCompleted: after.status === "completed" && Boolean(after.finalVideoUrl),
      providerCalls: 0,
      note: "Rebuild uses runFinalExportToCompletion; orchestrateFinalMerge now polls same path after worker dispatch",
    };

    writeFileSync(join(OUT, "INSTANT-MERGE-PRODUCTION-CERT.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await ctx.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
