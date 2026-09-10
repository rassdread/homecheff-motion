#!/usr/bin/env npx tsx
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const PROFILE = join(ROOT, ".px4a7-prod-profile");
const STUDIO = "https://studio.homecheff.eu";
const PROJECT_ID = "cmt5hnj1s0003jh09hns3vu4v";

async function main() {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: true,
    args: ["--headless=new"],
  });
  try {
    const r = await ctx.request.get(`${STUDIO}/api/instant-premium/projects/${PROJECT_ID}/status`);
    const j = (await r.json()) as Record<string, unknown>;
    const segments = (j.segments as Array<Record<string, unknown>>) ?? [];
    const slim = {
      http: r.status(),
      status: j.status,
      phase: j.phase,
      progressPercent: j.progressPercent,
      failureReason: j.failureReason,
      canRepairFinalVideo: j.canRepairFinalVideo,
      isRestoringFinalVideo: j.isRestoringFinalVideo,
      stuck: j.stuck,
      finalVideoUrl: j.finalVideoUrl ? "PRESENT" : null,
      downloadable: j.downloadable,
      export: j.export,
      instantWorkerJobStatus: j.instantWorkerJobStatus,
      instantFinalRebuildStatus: j.instantFinalRebuildStatus,
      segmentCount: segments.length,
      segments: segments.map((s) => ({
        id: s.id,
        status: s.status,
        order: s.order,
        urlKeys: Object.keys(s).filter((k) => /url/i.test(k)),
        hasOutputVideo: Boolean(
          (s.outputVideoUrl as string)?.trim() ||
            (s.videoUrl as string)?.trim() ||
            (s.resultVideoUrl as string)?.trim()
        ),
        hasSourceImage: Boolean((s.sourceImageUrl as string)?.trim()),
      })),
      topKeys: Object.keys(j).sort(),
    };
    writeFileSync(
      join(ROOT, "docs/audits/full-studio-cert/scenario-a-status-slim.json"),
      JSON.stringify(slim, null, 2)
    );
    console.log(JSON.stringify(slim, null, 2));

    if (process.argv.includes("--rebuild")) {
      console.log("\nPOST rebuild-final-video…");
      const rb = await ctx.request.post(
        `${STUDIO}/api/instant-premium/projects/${PROJECT_ID}/rebuild-final-video`,
        { data: {}, timeout: 300_000 }
      );
      const body = await rb.json();
      console.log("rebuild http", rb.status());
      console.log(
        JSON.stringify(
          {
            ok: body?.ok ?? body?.rebuild?.ok,
            code: body?.code ?? body?.rebuild?.code,
            finalVideoUrlPresent: Boolean(body?.finalVideoUrl || body?.rebuild?.finalVideoUrl),
            message: body?.message ?? body?.rebuild?.message,
            clipsReady: body?.rebuild?.clipsReady,
          },
          null,
          2
        )
      );
      writeFileSync(
        join(ROOT, "docs/audits/full-studio-cert/scenario-a-rebuild.json"),
        JSON.stringify(
          {
            http: rb.status(),
            ok: body?.ok,
            code: body?.code,
            clipsReady: body?.rebuild?.clipsReady,
            finalVideoUrlPresent: Boolean(body?.finalVideoUrl),
            message: body?.message ?? body?.rebuild?.message,
            keys: Object.keys(body ?? {}),
          },
          null,
          2
        )
      );
    }

    const wallet = await (await ctx.request.get(`${STUDIO}/api/me/studio-account`)).json();
    console.log(
      "wallet",
      wallet?.wallet?.availableBalance,
      "spent",
      wallet?.wallet?.lifetimeSpent
    );
  } finally {
    await ctx.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
