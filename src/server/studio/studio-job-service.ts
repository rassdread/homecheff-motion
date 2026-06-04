import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapStudioJobToDetail, mapStudioJobToListItem } from "@/lib/studio-job-map";
import { computeStudioJobProgress } from "@/lib/studio-job-progress";
import { isStudioJobType } from "@/lib/studio-job-validation";
import {
  studioStoryboardViewerCanModify,
  studioStoryboardViewerCanView,
} from "@/server/studio/studio-storyboard-access";
import { studioJobViewerCanView } from "@/server/studio/studio-job-access";
import type { SessionUser } from "@/server/auth/session";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";
import type {
  StudioJobCreateInput,
  StudioJobDetail,
  StudioJobListItem,
  StudioJobResult,
  StudioJobStatus,
  StudioJobType,
} from "@/types/studio-job";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export async function countActiveStudioJobsForStoryboard(
  storyboardId: string,
  type?: StudioJobType
): Promise<number> {
  return prisma.studioJob.count({
    where: {
      storyboardId,
      status: { in: ["queued", "running"] },
      ...(type ? { type } : {}),
    },
  });
}

export async function createStudioJob(
  storyboardId: string,
  type: StudioJobType,
  input: StudioJobCreateInput,
  viewer: Pick<SessionUser, "id" | "role">,
  totalSteps: number
): Promise<{ job: StudioJobListItem } | { error: ServiceError }> {
  if (!isStudioJobType(type)) {
    return { error: serviceError("INVALID_TYPE", "Invalid job type.", 400) };
  }

  const storyboard = await prisma.studioStoryboard.findUnique({
    where: { id: storyboardId },
    include: { scenes: { select: { id: true } } },
  });
  if (!storyboard) {
    return { error: serviceError("NOT_FOUND", "Storyboard not found.", 404) };
  }
  if (!studioStoryboardViewerCanModify(viewer, storyboard)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const active = await countActiveStudioJobsForStoryboard(storyboardId, type);
  if (active > 0) {
    return {
      error: serviceError(
        "JOB_ALREADY_RUNNING",
        "A job of this type is already running for this storyboard.",
        409
      ),
    };
  }

  const row = await prisma.studioJob.create({
    data: {
      ownerId: viewer.id,
      storyboardId,
      type,
      status: "queued",
      progress: 0,
      currentStep: "",
      totalSteps,
      inputJson: input as Prisma.InputJsonValue,
    },
  });

  return { job: mapStudioJobToListItem(row) };
}

export async function getStudioJob(
  storyboardId: string,
  jobId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ job: StudioJobDetail } | { error: ServiceError }> {
  const row = await prisma.studioJob.findFirst({
    where: { id: jobId, storyboardId },
  });
  if (!row) {
    return { error: serviceError("NOT_FOUND", "Job not found.", 404) };
  }
  if (!studioJobViewerCanView(viewer, row)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }
  return { job: mapStudioJobToDetail(row) };
}

export async function listStudioJobsForStoryboard(
  storyboardId: string,
  viewer: Pick<SessionUser, "id" | "role">,
  limit = 20
): Promise<{ jobs: StudioJobListItem[] } | { error: ServiceError }> {
  const storyboard = await prisma.studioStoryboard.findUnique({
    where: { id: storyboardId },
  });
  if (!storyboard) {
    return { error: serviceError("NOT_FOUND", "Storyboard not found.", 404) };
  }
  if (!studioStoryboardViewerCanView(viewer, storyboard)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const rows = await prisma.studioJob.findMany({
    where: { storyboardId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return { jobs: rows.map(mapStudioJobToListItem) };
}

export async function updateStudioJobProgress(
  jobId: string,
  params: {
    currentStep: number;
    totalSteps: number;
    currentStepLabel: string;
    partialResult?: Partial<StudioJobResult>;
  }
): Promise<void> {
  const existing = await prisma.studioJob.findUnique({ where: { id: jobId } });
  if (!existing || existing.status === "cancelled") {
    return;
  }

  const progress = computeStudioJobProgress(params.currentStep, params.totalSteps);
  const prevResult = (existing.resultJson ?? {}) as StudioJobResult;

  await prisma.studioJob.update({
    where: { id: jobId },
    data: {
      progress,
      currentStep: params.currentStepLabel,
      totalSteps: params.totalSteps,
      resultJson: params.partialResult
        ? ({ ...prevResult, ...params.partialResult } as Prisma.InputJsonValue)
        : undefined,
      updatedAt: new Date(),
    },
  });
}

export async function isStudioJobCancelled(jobId: string): Promise<boolean> {
  const row = await prisma.studioJob.findUnique({
    where: { id: jobId },
    select: { status: true },
  });
  return row?.status === "cancelled";
}

export async function markStudioJobRunning(jobId: string): Promise<boolean> {
  const row = await prisma.studioJob.findUnique({ where: { id: jobId } });
  if (!row || row.status === "cancelled") {
    return false;
  }

  await prisma.studioJob.update({
    where: { id: jobId },
    data: {
      status: "running",
      startedAt: row.startedAt ?? new Date(),
      progress: 0,
    },
  });
  return true;
}

export async function finalizeStudioJob(
  jobId: string,
  params: {
    status: Extract<StudioJobStatus, "completed" | "failed" | "cancelled">;
    errorMessage?: string;
    result: StudioJobResult;
  }
): Promise<void> {
  const now = new Date();
  await prisma.studioJob.update({
    where: { id: jobId },
    data: {
      status: params.status,
      progress: params.status === "completed" ? 100 : undefined,
      errorMessage: params.errorMessage ?? "",
      resultJson: params.result as Prisma.InputJsonValue,
      completedAt: params.status === "completed" ? now : undefined,
      failedAt: params.status === "failed" ? now : undefined,
      currentStep:
        params.status === "completed"
          ? "Completed"
          : params.status === "cancelled"
            ? "Cancelled"
            : "Failed",
    },
  });
}

export async function cancelStudioJob(
  storyboardId: string,
  jobId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ job: StudioJobListItem } | { error: ServiceError }> {
  const row = await prisma.studioJob.findFirst({
    where: { id: jobId, storyboardId },
  });
  if (!row) {
    return { error: serviceError("NOT_FOUND", "Job not found.", 404) };
  }
  if (!studioJobViewerCanView(viewer, row)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }
  if (row.ownerId !== viewer.id && viewer.role !== "admin") {
    return { error: serviceError("FORBIDDEN", "Only the job owner can cancel.", 403) };
  }
  if (row.status !== "queued" && row.status !== "running") {
    return {
      error: serviceError(
        "NOT_CANCELLABLE",
        "Only queued or running jobs can be cancelled.",
        400
      ),
    };
  }

  const updated = await prisma.studioJob.update({
    where: { id: jobId },
    data: {
      status: "cancelled",
      currentStep: "Cancelled",
      completedAt: new Date(),
    },
  });

  return { job: mapStudioJobToListItem(updated) };
}

export async function getStudioJobRowForRunner(jobId: string) {
  return prisma.studioJob.findUnique({
    where: { id: jobId },
    include: {
      storyboard: {
        include: {
          scenes: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });
}
