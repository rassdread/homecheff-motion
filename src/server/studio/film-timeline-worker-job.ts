/**
 * Film timeline job on the existing video worker.
 * The worker loads the job row. It does not trust a client owner id.
 * Export stays at zero credits. A completed library asset is not encoded again.
 * The worker process keeps running after it accepts the job.
 */

import { prisma } from "@/lib/prisma";
import { executeOwnedFilmExport } from "@/server/studio/execute-timeline-film-export";
import {
  finishTimelineExportJob,
  readTimelineExportJobById,
} from "@/server/studio/studio-timeline-export-job";

export const FILM_EXPORT_CONCURRENCY = 1;
export const FILM_EXPORT_MAX_ATTEMPTS = 2;

export type FilmTimelineWorkerResult = {
  ok: boolean;
  jobId: string;
  status: string;
  code?: string;
  libraryAssetId?: string;
  downloadUrl?: string;
};

export type FilmAccept =
  | { kind: "start" }
  | { kind: "running" }
  | { kind: "queued" }
  | { kind: "succeeded"; libraryAssetId: string; downloadUrl: string }
  | { kind: "failed"; code: string; httpStatus: number };

function metaNumber(metadata: unknown, key: string): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function metaString(metadata: unknown, key: string): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function isAsyncFilm(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return (metadata as { async?: unknown }).async === true;
}

function safeCode(value: string): string {
  return /^[a-z0-9_]+$/.test(value) ? value : "export_failed";
}

export async function acceptFilmTimelineJob(jobId: string): Promise<FilmAccept> {
  const id = jobId.trim();
  const job = id ? await readTimelineExportJobById(id) : null;
  if (!job || !isAsyncFilm(job.metadataJson)) return { kind: "failed", code: "not_found", httpStatus: 404 };
  if (job.creditsCharged !== 0 || job.creditCost !== 0) {
    await finishTimelineExportJob({ jobId: id, ownerId: job.ownerId, outcome: "failed", errorCode: "billing" });
    return { kind: "failed", code: "billing", httpStatus: 422 };
  }
  const projectId = metaString(job.metadataJson, "projectId");
  if (!projectId) return { kind: "failed", code: "not_found", httpStatus: 404 };
  if (job.status === "cancelled" || job.status === "cancel_requested") {
    return { kind: "failed", code: "cancelled", httpStatus: 409 };
  }
  if (job.status === "succeeded") {
    const existing = await existingExport(job.ownerId, projectId, job.metadataJson);
    if (existing) return { kind: "succeeded", ...existing };
    return { kind: "failed", code: "download", httpStatus: 422 };
  }
  if (job.status === "failed") {
    return { kind: "failed", code: safeCode(job.errorCode || "export_failed"), httpStatus: 422 };
  }
  const claimed = await prisma.studioGenerationJob.updateMany({
    where: {
      id,
      capability: "TIMELINE_EXPORT",
      status: { in: ["queued", "pending", "processing"] },
      attempt: { lt: job.maxAttempts || FILM_EXPORT_MAX_ATTEMPTS },
      creditCost: 0,
      creditsCharged: 0,
    },
    data: {
      status: "processing",
      attempt: { increment: 1 },
      startedAt: new Date(),
      executionMode: "worker",
    },
  });
  if (claimed.count === 0) {
    const again = await readTimelineExportJobById(id);
    if (again?.status === "processing") return { kind: "running" };
    if (again?.status === "succeeded") {
      const existing = await existingExport(again.ownerId, projectId, again.metadataJson);
      if (existing) return { kind: "succeeded", ...existing };
    }
    return { kind: "failed", code: "export_failed", httpStatus: 422 };
  }
  return { kind: "start" };
}

export async function findNextDurableFilmExport(busyIds: string[]): Promise<string | null> {
  const rows = await prisma.studioGenerationJob.findMany({
    where: {
      capability: "TIMELINE_EXPORT",
      status: { in: ["queued", "processing"] },
      ...(busyIds.length > 0 ? { id: { notIn: busyIds } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { id: true, ownerId: true, status: true, attempt: true, maxAttempts: true, metadataJson: true },
  });
  let chosen: string | null = null;
  for (const row of rows) {
    if (!isAsyncFilm(row.metadataJson)) continue;
    const limit = row.maxAttempts || FILM_EXPORT_MAX_ATTEMPTS;
    if (row.status === "processing" && row.attempt >= limit) {
      await finishTimelineExportJob({
        jobId: row.id,
        ownerId: row.ownerId,
        outcome: "failed",
        errorCode: "interrupted",
      });
      continue;
    }
    if (!chosen) chosen = row.id;
  }
  return chosen;
}

export async function failOpenFilmExport(jobId: string): Promise<void> {
  const job = await readTimelineExportJobById(jobId);
  if (!job) return;
  if (job.status === "succeeded" || job.status === "failed" || job.status === "cancelled") return;
  await finishTimelineExportJob({
    jobId,
    ownerId: job.ownerId,
    outcome: "failed",
    errorCode: "export_failed",
  });
}

export async function runFilmTimelineWorkerRender(jobId: string): Promise<FilmTimelineWorkerResult> {
  const id = jobId.trim();
  const job = id ? await readTimelineExportJobById(id) : null;
  if (!job) return { ok: false, jobId: id, status: "failed", code: "not_found" };
  if (job.creditsCharged !== 0 || job.creditCost !== 0) {
    return { ok: false, jobId: id, status: "failed", code: "billing" };
  }
  const projectId = metaString(job.metadataJson, "projectId");
  if (!projectId) return { ok: false, jobId: id, status: "failed", code: "not_found" };
  if (job.status === "cancelled" || job.status === "cancel_requested") {
    return { ok: false, jobId: id, status: "cancelled", code: "cancelled" };
  }
  if (job.status === "succeeded") {
    const existing = await existingExport(job.ownerId, projectId, job.metadataJson);
    if (existing) return { ok: true, jobId: id, status: "succeeded", ...existing };
  }
  const width = metaNumber(job.metadataJson, "width") === 1280 ? 1280 : 720;
  const height = width === 1280 ? 720 : 1280;
  const revision = metaNumber(job.metadataJson, "revision");
  const rendered = await executeOwnedFilmExport({
    ownerId: job.ownerId,
    projectId,
    jobId: id,
    revision: revision ?? undefined,
    burnLanguage: metaString(job.metadataJson, "burnLanguage"),
    width,
    height,
  });
  if (!rendered.ok) {
    return { ok: false, jobId: id, status: rendered.code === "cancelled" ? "cancelled" : "failed", code: rendered.code };
  }
  return {
    ok: true,
    jobId: id,
    status: "succeeded",
    libraryAssetId: rendered.libraryAssetId,
    downloadUrl: rendered.downloadUrl,
  };
}

async function existingExport(ownerId: string, projectId: string, metadata: unknown) {
  const revision = metaNumber(metadata, "revision");
  const language = metaString(metadata, "burnLanguage") || "none";
  if (revision == null) return null;
  const sourceId = `${projectId}:${revision}:${language}`;
  const asset = await prisma.studioLibraryAsset.findFirst({
    where: { ownerId, sourceKind: "timeline_export", sourceId, deletedAt: null },
    select: { id: true, downloadUrl: true },
  });
  if (!asset?.downloadUrl) return null;
  return { libraryAssetId: asset.id, downloadUrl: asset.downloadUrl };
}
