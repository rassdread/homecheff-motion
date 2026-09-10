#!/usr/bin/env npx tsx
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

async function main() {
  const ROOT = process.cwd();
  const ctx = await chromium.launchPersistentContext(join(ROOT, ".px4a7-prod-profile"), {
    channel: "chrome",
    headless: true,
    args: ["--headless=new"],
  });
  try {
    const STUDIO = "https://studio.homecheff.eu";
    const id = "cmt5hnj1s0003jh09hns3vu4v";
    const j = await (await ctx.request.get(`${STUDIO}/api/instant-premium/projects/${id}/status`)).json();
    const pick = {
      status: j.status,
      phase: j.phase,
      progressPercent: j.progressPercent,
      finalizationStuck: j.finalizationStuck,
      canRetryMerge: j.canRetryMerge,
      canRebuildFinalVideo: j.canRebuildFinalVideo,
      canRepairFinalVideo: j.canRepairFinalVideo,
      isRestoringFinalVideo: j.isRestoringFinalVideo,
      isRebuildingFinalVideo: j.isRebuildingFinalVideo,
      workerJobStatus: j.workerJobStatus,
      videoRepairStatus: j.videoRepairStatus,
      videoRepairStage: j.videoRepairStage,
      videoRepairUserMessageKey: j.videoRepairUserMessageKey,
      repairAdminDetail: j.repairAdminDetail,
      exportStatus: j.exportStatus,
      exportLastError: j.exportLastError,
      exportFailureReason: j.exportFailureReason,
      workerError: j.workerError,
      errorMessage: j.errorMessage,
      retryState: j.retryState,
      segmentsMergeFailed: j.segmentsMergeFailed,
      finalRebuildFailed: j.finalRebuildFailed,
      rebuildCount: j.rebuildCount,
      currentStage: j.currentStage,
      finalExportStage: j.finalExportStage,
      activeOperation: j.activeOperation,
      segment0: {
        status: j.segments?.[0]?.status,
        hasVideo: Boolean(j.segments?.[0]?.videoUrl),
        videoTail: j.segments?.[0]?.videoUrl?.split("?")[0]?.slice(-60),
        sourceTail: j.segments?.[0]?.sourceImageUrl?.split("?")[0]?.slice(-60),
      },
    };
    writeFileSync(join(ROOT, "docs/audits/full-studio-cert/scenario-a-diag.json"), JSON.stringify(pick, null, 2));
    console.log(JSON.stringify(pick, null, 2));

    if (process.argv.includes("--retry-merge") && j.canRetryMerge) {
      // discover retry endpoint from codebase if needed
      console.log("canRetryMerge true — need retry endpoint");
    }
    if (process.argv.includes("--rebuild") && (j.canRebuildFinalVideo || j.canRepairFinalVideo || j.finalizationStuck)) {
      const rb = await ctx.request.post(
        `${STUDIO}/api/instant-premium/projects/${id}/rebuild-final-video`,
        { data: {}, timeout: 300_000 }
      );
      const body = await rb.json();
      console.log("rebuild", rb.status(), JSON.stringify({
        ok: body?.ok ?? body?.rebuild?.ok,
        code: body?.code ?? body?.rebuild?.code,
        final: Boolean(body?.finalVideoUrl),
        clipsReady: body?.rebuild?.clipsReady,
        message: body?.message ?? body?.rebuild?.message,
      }));
    }
  } finally {
    await ctx.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
