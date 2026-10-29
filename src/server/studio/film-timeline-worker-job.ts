/**
 * Film timeline job on the existing video worker.
 * The worker loads the job row. It does not trust a client owner id.
 * Export stays at zero credits. A repeat call does not encode again
 * when the same library asset is already stored.
 */

import { prisma } from "@/lib/prisma";
import { executeOwnedFilmExport } from "@/server/studio/execute-timeline-film-export";
import { readTimelineExportJobById } from "@/server/studio/studio-timeline-export-job";

export type FilmTimelineWorkerResult = {
  ok: boolean;
  jobId: string;
  status: string;
  code?: string;
  libraryAssetId?: string;
  downloadUrl?: string;
};

function metaNumber(metadata: unknown, key: string): number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function metaString(metadata: unknown, key: string): string {
  if (!metadata || typeof metadata !== "object") return "";
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
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
