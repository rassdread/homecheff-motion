import { prisma } from "@/lib/prisma";
import {
  TIMELINE_EXPORT_CAPABILITY,
  canCancelTimelineExport,
} from "@/lib/studio-timeline-export-status";

type JobRow = {
  id: string;
  status: string;
  metadataJson: unknown;
};

function projectIdOf(metadataJson: unknown): string {
  if (!metadataJson || typeof metadataJson !== "object") return "";
  const value = (metadataJson as { projectId?: unknown }).projectId;
  return typeof value === "string" ? value : "";
}

export async function startTimelineExportJob(input: {
  ownerId: string;
  storyboardId: string;
  projectId: string;
}) {
  return prisma.studioGenerationJob.create({
    data: {
      ownerId: input.ownerId,
      storyboardId: input.storyboardId,
      capability: TIMELINE_EXPORT_CAPABILITY,
      actionType: "timeline_export",
      status: "processing",
      executionMode: "sync",
      providerAdapter: "ffmpeg",
      idempotencyKey: `timeline-export:${input.projectId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      maxAttempts: 2,
      creditCost: 0,
      creditsReserved: 0,
      creditsCharged: 0,
      chargeFinalized: true,
      startedAt: new Date(),
      metadataJson: { projectId: input.projectId },
    },
    select: { id: true, status: true },
  });
}

export async function readTimelineExportJob(jobId: string, ownerId: string): Promise<JobRow | null> {
  return prisma.studioGenerationJob.findFirst({
    where: { id: jobId, ownerId, capability: TIMELINE_EXPORT_CAPABILITY },
    select: { id: true, status: true, metadataJson: true },
  });
}

export async function readTimelineExportJobById(jobId: string) {
  return prisma.studioGenerationJob.findFirst({
    where: { id: jobId, capability: TIMELINE_EXPORT_CAPABILITY },
    select: {
      id: true,
      ownerId: true,
      status: true,
      metadataJson: true,
      creditCost: true,
      creditsCharged: true,
      errorCode: true,
      attempt: true,
      maxAttempts: true,
      outputAssetId: true,
    },
  });
}

export async function rememberTimelineExportRequest(input: {
  jobId: string;
  ownerId: string;
  projectId: string;
  revision: number;
  burnLanguage: string;
  width: number;
  height: number;
}) {
  await prisma.studioGenerationJob.updateMany({
    where: {
      id: input.jobId,
      ownerId: input.ownerId,
      capability: TIMELINE_EXPORT_CAPABILITY,
      status: { in: ["pending", "queued", "processing"] },
    },
    data: {
      status: "queued",
      executionMode: "worker",
      maxAttempts: 2,
      metadataJson: {
        async: true,
        stage: "preparing",
        projectId: input.projectId,
        revision: input.revision,
        burnLanguage: input.burnLanguage,
        width: input.width,
        height: input.height,
      },
    },
  });
}

const EXPORT_STAGES = new Set(["preparing", "rendering_scenes", "processing_audio", "finalizing", "saving"]);

export async function recordTimelineExportStage(jobId: string, ownerId: string, stage: string) {
  if (!EXPORT_STAGES.has(stage)) return;
  const job = await prisma.studioGenerationJob.findFirst({
    where: { id: jobId, ownerId, capability: TIMELINE_EXPORT_CAPABILITY, status: "processing" },
    select: { metadataJson: true },
  });
  if (!job || !job.metadataJson || typeof job.metadataJson !== "object" || Array.isArray(job.metadataJson)) return;
  await prisma.studioGenerationJob.updateMany({
    where: { id: jobId, ownerId, capability: TIMELINE_EXPORT_CAPABILITY, status: "processing" },
    data: { metadataJson: { ...(job.metadataJson as Record<string, unknown>), stage } },
  });
}

export async function readTimelineExportView(jobId: string, ownerId: string) {
  return prisma.studioGenerationJob.findFirst({
    where: { id: jobId, ownerId, capability: TIMELINE_EXPORT_CAPABILITY },
    select: {
      id: true,
      status: true,
      metadataJson: true,
      errorCode: true,
      outputAssetId: true,
      updatedAt: true,
      creditCost: true,
      creditsCharged: true,
    },
  });
}

export async function readLatestTimelineExportForProject(ownerId: string, projectId: string) {
  return prisma.studioGenerationJob.findFirst({
    where: {
      ownerId,
      capability: TIMELINE_EXPORT_CAPABILITY,
      metadataJson: { path: ["projectId"], equals: projectId },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      metadataJson: true,
      errorCode: true,
      outputAssetId: true,
      updatedAt: true,
      creditCost: true,
      creditsCharged: true,
    },
  });
}

export async function finishTimelineExportJob(input: {
  jobId: string;
  ownerId: string;
  outcome: "succeeded" | "failed" | "cancelled";
  errorCode?: string;
  outputAssetId?: string;
}) {
  const now = new Date();
  const data =
    input.outcome === "succeeded"
      ? {
          status: "succeeded",
          completedAt: now,
          errorCode: "",
          errorMessageSafe: "",
          ...(input.outputAssetId ? { outputAssetId: input.outputAssetId } : {}),
        }
      : input.outcome === "cancelled"
        ? { status: "cancelled", cancelledAt: now, errorCode: "cancelled", errorMessageSafe: "Export was cancelled." }
        : {
            status: "failed",
            failedAt: now,
            errorCode: input.errorCode || "export_failed",
            errorMessageSafe: "Export did not finish.",
          };
  await prisma.studioGenerationJob.updateMany({
    where: {
      id: input.jobId,
      ownerId: input.ownerId,
      capability: TIMELINE_EXPORT_CAPABILITY,
      status: { in: ["pending", "queued", "processing", "cancel_requested"] },
    },
    data,
  });
}

export async function cancelTimelineExportJob(input: { jobId: string; ownerId: string; projectId: string }) {
  const job = await readTimelineExportJob(input.jobId, input.ownerId);
  if (!job || projectIdOf(job.metadataJson) !== input.projectId) {
    return { ok: false as const, code: "not_found", httpStatus: 404 };
  }
  if (job.status === "cancelled" || job.status === "cancel_requested") {
    return { ok: true as const, code: "already_cancelled", httpStatus: 200 };
  }
  if (!canCancelTimelineExport(job.status)) {
    return { ok: false as const, code: "not_cancellable", httpStatus: 409 };
  }
  await prisma.studioGenerationJob.updateMany({
    where: { id: job.id, ownerId: input.ownerId, status: job.status },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      errorCode: "cancelled",
      errorMessageSafe: "Export was cancelled.",
    },
  });
  return { ok: true as const, code: "cancelled", httpStatus: 200 };
}
