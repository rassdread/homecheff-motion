#!/usr/bin/env npx tsx
/**
 * Audit video repair state for a project (read-only).
 * Usage: npx tsx scripts/audit-repair-project.ts <projectId>
 */

import { prisma } from "../src/lib/prisma";
import {
  readVideoRepairAudit,
  resolveVideoRepairStageFromExport,
  INSTANT_VIDEO_REPAIR_STAGE_I18N,
} from "../src/lib/instant-video-repair";
import { getFinalExportStage } from "../src/server/instant-premium/final-export-stage";
import { resolveInstantPremiumProgress } from "../src/lib/instant-premium-progress-stage";

const projectId = process.argv[2]?.trim();
if (!projectId) {
  console.error("Usage: npx tsx scripts/audit-repair-project.ts <projectId>");
  process.exit(1);
}

async function main() {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      exports: { orderBy: { createdAt: "desc" }, take: 5 },
      transitions: { orderBy: { order: "asc" } },
    },
  });

  if (!project) {
    console.error("Project not found.");
    process.exit(1);
  }

  const latestExport = project.exports[0] ?? null;
  const audit = readVideoRepairAudit(project.instantFinalRebuildAuditJson);
  const repairRunning = audit?.status === "running";
  const finalExportStage = getFinalExportStage(projectId)?.stage ?? null;
  const resolvedStage = resolveVideoRepairStageFromExport({
    repairRunning,
    exportProgress: latestExport?.progress ?? null,
    exportStatus: latestExport?.status ?? null,
    projectStatus: project.status,
    finalExportStage,
  });

  const progressView = resolveInstantPremiumProgress({
    status: project.status,
    phase:
      project.status === "rendering" || project.status === "finalizing"
        ? "merging_clips"
        : project.status,
    progressPercent: latestExport?.progress ?? 0,
    isRestoringFinalVideo: repairRunning,
    isRebuildingFinalVideo: project.instantFinalRebuildStatus === "running",
    overlayFailed: project.status === "failed_overlay",
    exportProgress: latestExport?.progress ?? null,
    exportStatus: latestExport?.status ?? null,
    failureReason: project.failureReason as never,
  });

  console.log(
    JSON.stringify(
      {
        auditedAt: new Date().toISOString(),
        project: {
          id: project.id,
          status: project.status,
          projectType: project.projectType,
          instantMode: project.instantMode,
          instantFinalRebuildStatus: project.instantFinalRebuildStatus,
          instantWorkerJobStatus: project.instantWorkerJobStatus,
          instantWorkerJobStartedAt: project.instantWorkerJobStartedAt?.toISOString() ?? null,
          instantCleanFinalVideoUrl: project.instantCleanFinalVideoUrl,
          failureReason: project.failureReason,
          lastOverlayError: project.lastOverlayError,
          updatedAt: project.updatedAt.toISOString(),
          instantFinalRebuiltAt: project.instantFinalRebuiltAt?.toISOString() ?? null,
          instantFinalRebuildCount: project.instantFinalRebuildCount,
        },
        videoRepairAudit: audit,
        derived: {
          repairRunning,
          resolvedRepairStage: resolvedStage,
          finalExportStage,
          activeOperation: progressView.activeOperation,
          progressStage: progressView.stage,
          displayPercent: progressView.displayPercent,
        },
        exports: project.exports.map((e) => ({
          id: e.id,
          status: e.status,
          progress: e.progress,
          provider: e.provider,
          providerJobId: e.providerJobId,
          outputVideoUrl: e.outputVideoUrl,
          errorMessage: e.errorMessage,
          createdAt: e.createdAt.toISOString(),
          updatedAt: e.updatedAt.toISOString(),
        })),
        transitions: project.transitions.map((t) => ({
          order: t.order,
          status: t.status,
          progress: t.progress,
          outputVideoUrl: t.outputVideoUrl,
          errorMessage: t.errorMessage,
        })),
        uiWouldShow: {
          videoRepairUserMessageKey:
            audit?.status === "failed"
              ? "instant.videoRepair.failedUser"
              : repairRunning
                ? INSTANT_VIDEO_REPAIR_STAGE_I18N[
                    (resolvedStage ?? audit?.stage ?? "started") as keyof typeof INSTANT_VIDEO_REPAIR_STAGE_I18N
                  ]
                : null,
          videoRepairStage: resolvedStage ?? audit?.stage ?? null,
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
