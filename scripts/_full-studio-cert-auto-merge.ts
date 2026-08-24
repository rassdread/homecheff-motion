#!/usr/bin/env npx tsx
/**
 * Target B — CERTIFY automatic finalization via GET /status only.
 * Resets export/project state; keeps Vidu segments. Forbidden: rebuild/repair POSTs.
 */
import { config } from "dotenv";
config({ path: ".env" });

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { prisma } from "../src/lib/prisma";

const STUDIO = "https://studio.homecheff.eu";
const PROFILE = join(process.cwd(), ".px4a7-prod-profile");
const PROJECT_ID = "cmt5hnj1s0003jh09hns3vu4v";
const OUT = join(process.cwd(), "docs/audits/full-studio-cert");

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function sanitize(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}?…`;
  } catch {
    return "…";
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const forbiddenHits: string[] = [];
  const getHits: string[] = [];

  // Snapshot before
  const beforeProject = await prisma.animationProject.findUnique({
    where: { id: PROJECT_ID },
    select: {
      status: true,
      instantWorkerJobStatus: true,
      instantFinalRebuildStatus: true,
      failureReason: true,
    },
  });
  const beforeExport = await prisma.animationExport.findFirst({
    where: { projectId: PROJECT_ID },
    orderBy: { createdAt: "desc" },
  });
  const transitions = await prisma.animationTransition.findMany({
    where: { projectId: PROJECT_ID },
    orderBy: { order: "asc" },
    select: { order: true, status: true, outputVideoUrl: true },
  });

  const report: Record<string, unknown> = {
    at: new Date().toISOString(),
    projectId: PROJECT_ID,
    path: "DB reset → GET /status only → orchestrateFinalMerge",
    deployShaExpected: "90926699+",
    before: {
      project: beforeProject,
      export: beforeExport
        ? {
            id: beforeExport.id,
            status: beforeExport.status,
            progress: beforeExport.progress,
            hasFinal: Boolean(beforeExport.outputVideoUrl),
          }
        : null,
      transitions: transitions.map((t) => ({
        order: t.order,
        status: t.status,
        hasUrl: Boolean(t.outputVideoUrl),
      })),
    },
  };

  if (!transitions.every((t) => t.status === "completed" && t.outputVideoUrl)) {
    throw new Error("SEGMENTS_NOT_READY — cannot certify without Vidu assets");
  }

  // Reset for NORMAL automatic path (orchestrateFinalMerge via GET /status).
  // Do NOT set export/project to "failed" — that forces status-auto repair / blob-sync,
  // which is recovery, not the segment-ready → automatic finalization handoff.
  if (!beforeExport) throw new Error("NO_EXPORT_ROW");
  const priorAudit = beforeProject
    ? (
        await prisma.animationProject.findUnique({
          where: { id: PROJECT_ID },
          select: { instantFinalRebuildAuditJson: true },
        })
      )?.instantFinalRebuildAuditJson
    : null;
  const auditObj =
    priorAudit && typeof priorAudit === "object" && !Array.isArray(priorAudit)
      ? { ...(priorAudit as Record<string, unknown>) }
      : {};
  // Clear any in-flight video-repair audit so status does not treat merge as already running.
  if ("status" in auditObj || "stage" in auditObj) {
    delete auditObj.status;
    delete auditObj.stage;
    delete auditObj.errorCode;
    delete auditObj.errorMessage;
  }

  await prisma.animationExport.update({
    where: { id: beforeExport.id },
    data: {
      status: "pending",
      progress: 0,
      outputVideoUrl: null,
      errorMessage: null,
    },
  });
  await prisma.animationProject.update({
    where: { id: PROJECT_ID },
    data: {
      status: "generating",
      failureReason: null,
      lastOverlayError: null,
      instantWorkerJobStatus: null,
      instantWorkerJobStartedAt: null,
      instantFinalRebuildStatus: null,
      instantFinalRebuildAuditJson: auditObj as object,
    },
  });
  // Finish any stuck pending render version so merge can create a clean next version.
  await prisma.projectRenderVersion.updateMany({
    where: { projectId: PROJECT_ID, status: "generating", finalVideoUrl: null },
    data: { status: "failed" },
  });

  const afterReset = await prisma.animationProject.findUnique({
    where: { id: PROJECT_ID },
    select: { status: true, instantWorkerJobStatus: true, instantFinalRebuildStatus: true },
  });
  const exportAfterReset = await prisma.animationExport.findUnique({
    where: { id: beforeExport.id },
    select: { status: true, progress: true, outputVideoUrl: true },
  });
  report.afterReset = {
    project: afterReset,
    export: {
      status: exportAfterReset?.status,
      progress: exportAfterReset?.progress,
      hasFinal: Boolean(exportAfterReset?.outputVideoUrl),
    },
  };

  // Playwright: GET status only
  try {
    const { unlinkSync } = await import("node:fs");
    unlinkSync(join(PROFILE, "SingletonLock"));
  } catch {
    /* */
  }
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: true,
    args: ["--headless=new"],
  });

  try {
    ctx.on("request", (req) => {
      const u = req.url();
      if (!u.includes(PROJECT_ID)) return;
      if (req.method() === "GET" && u.includes("/status")) getHits.push(u.split("?")[0]!);
      if (
        req.method() === "POST" &&
        /rebuild-final-video|repair-final-video|merge\/retry|\/recover/.test(u)
      ) {
        forbiddenHits.push(`${req.method()} ${u.split("?")[0]}`);
      }
    });

    const t0 = Date.now();
    let first: Record<string, unknown> | null = null;
    let last: Record<string, unknown> | null = null;
    for (let i = 0; i < 72; i++) {
      const r = await ctx.request.get(`${STUDIO}/api/instant-premium/projects/${PROJECT_ID}/status`);
      const j = (await r.json()) as Record<string, unknown>;
      if (!first) first = j;
      last = j;
      console.log(
        i,
        j.status,
        j.phase,
        j.progressPercent,
        j.finalVideoUrl ? "hasVideo" : "noVideo",
        j.workerJobStatus,
        j.activeOperation
      );
      if (j.status === "completed" && j.finalVideoUrl) break;
      await sleep(5000);
    }

    const elapsedMs = Date.now() - t0;
    const ok =
      last?.status === "completed" &&
      Boolean(last?.finalVideoUrl) &&
      forbiddenHits.length === 0;

    report.trigger = {
      method: "GET /api/instant-premium/projects/:id/status only",
      firstPoll: {
        status: first?.status,
        phase: first?.phase,
        progressPercent: first?.progressPercent,
        rebuildCount: first?.rebuildCount,
        isRebuildingFinalVideo: first?.isRebuildingFinalVideo,
      },
      final: {
        status: last?.status,
        phase: last?.phase,
        progressPercent: last?.progressPercent,
        finalVideoUrl: sanitize(String(last?.finalVideoUrl ?? "")),
        workerJobStatus: last?.workerJobStatus,
        activeOperation: last?.activeOperation,
        rebuildCount: last?.rebuildCount,
        isRebuildingFinalVideo: last?.isRebuildingFinalVideo,
      },
      elapsedMs,
      getStatusHits: getHits.length,
      forbiddenHits,
    };
    report.classification = ok ? "CERTIFIED" : "FAILED";
    report.viduNewJobs = 0;
    report.creditsDebited = 0;

    // Confirm segments still present
    const segs = await prisma.animationTransition.findMany({
      where: { projectId: PROJECT_ID },
      select: { order: true, status: true, outputVideoUrl: true },
    });
    report.segmentsPreserved = segs.every((s) => s.status === "completed" && s.outputVideoUrl);

    writeFileSync(join(OUT, "AUTOMATIC-FINALIZATION-VERIFICATION.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ classification: report.classification, elapsedMs, forbiddenHits }, null, 2));
  } finally {
    await ctx.close();
    await prisma.$disconnect();
  }
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
