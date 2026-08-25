#!/usr/bin/env npx tsx
/**
 * Target B forensic — capture automatic failure + blob key evidence (0 providers).
 */
import { config } from "dotenv";
config({ path: ".env" });

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { finalBlobPathname, cleanFinalBlobPathname } from "../src/lib/final-video-storage";
import { resolveFinalBlobVersionForUpload } from "../src/server/instant-premium/render-version-service";

const PROJECT_ID = "cmt5hnj1s0003jh09hns3vu4v";
const OUT = join(process.cwd(), "docs/audits/full-studio-cert");

async function headBlob(pathname: string) {
  const base = "https://it3xt8um5uqzpebe.public.blob.vercel-storage.com";
  try {
    const res = await fetch(`${base}/${pathname}`, { method: "HEAD", redirect: "follow" });
    return { pathname, status: res.status, contentType: res.headers.get("content-type"), ok: res.ok };
  } catch (err) {
    return {
      pathname,
      status: 0,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const project = await prisma.animationProject.findUnique({
    where: { id: PROJECT_ID },
    select: {
      id: true,
      status: true,
      instantFinalRebuildCount: true,
      instantPreviousFinalVideoUrl: true,
      instantCleanFinalVideoUrl: true,
      instantFinalRebuildStatus: true,
      instantWorkerJobStatus: true,
      failureReason: true,
      lastOverlayError: true,
    },
  });
  const exportRow = await prisma.animationExport.findFirst({
    where: { projectId: PROJECT_ID },
    orderBy: { createdAt: "desc" },
  });
  const versions = await prisma.projectRenderVersion.findMany({
    where: { projectId: PROJECT_ID },
    orderBy: { renderVersionNumber: "desc" },
    take: 3,
    select: {
      id: true,
      renderVersionNumber: true,
      status: true,
      finalVideoUrl: true,
      exportId: true,
      updatedAt: true,
    },
  });

  const rebuildCount = project?.instantFinalRebuildCount ?? 0;
  const nextCount = rebuildCount + 1;
  const preFixVersion = 0;
  const postFixVersion = resolveFinalBlobVersionForUpload({
    pendingRenderVersionNumber: null,
    isMergeOnlyTextRebuild: false,
    nextTextRebuildCount: nextCount,
    existingRebuildCount: rebuildCount,
  });

  const blobChecks = await Promise.all([
    headBlob(finalBlobPathname(PROJECT_ID, 0)),
    headBlob(finalBlobPathname(PROJECT_ID, rebuildCount)),
    headBlob(finalBlobPathname(PROJECT_ID, nextCount)),
    headBlob(cleanFinalBlobPathname(PROJECT_ID, 0)),
    headBlob(cleanFinalBlobPathname(PROJECT_ID, rebuildCount)),
    headBlob(cleanFinalBlobPathname(PROJECT_ID, nextCount)),
  ]);

  let workerHealth: Record<string, unknown> | null = null;
  const workerBase = process.env.VIDEO_WORKER_BASE_URL?.trim();
  if (workerBase) {
    try {
      const res = await fetch(`${workerBase}/health/video`, { signal: AbortSignal.timeout(12_000) });
      workerHealth = (await res.json()) as Record<string, unknown>;
    } catch (err) {
      workerHealth = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  const report = {
    at: new Date().toISOString(),
    projectId: PROJECT_ID,
    exportId: exportRow?.id ?? null,
    renderVersionId: versions[0]?.id ?? null,
    project,
    export: exportRow
      ? {
          id: exportRow.id,
          status: exportRow.status,
          progress: exportRow.progress,
          errorMessage: exportRow.errorMessage,
          hasOutputVideoUrl: Boolean(exportRow.outputVideoUrl),
          updatedAt: exportRow.updatedAt,
        }
      : null,
    versions,
    uploadTargetAnalysis: {
      instantFinalRebuildCount: rebuildCount,
      nextTextRebuildCount: nextCount,
      automaticPreFixTarget: finalBlobPathname(PROJECT_ID, preFixVersion),
      automaticPreFixAllowOverwrite: false,
      automaticPostFixTarget: finalBlobPathname(PROJECT_ID, postFixVersion),
      automaticPostFixUsesReplaceFinalVideoBlobSafely: postFixVersion > 0,
      rebuildTarget: finalBlobPathname(PROJECT_ID, nextCount),
      rebuildAllowOverwrite: true,
    },
    blobChecks,
    workerHealth,
    localGitHead: "32abbba208666a8c37a0aa543c0210e7d4987935",
  };

  writeFileSync(join(OUT, "TARGET-B-FIRST-DIVERGENCE-CAPTURE.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
