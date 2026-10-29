/**
 * Owner-scoped timeline export.
 * Local mode calls the shared FFmpeg adapter directly.
 * Worker mode sends the existing generation job to the video worker.
 * No wallet and no provider.
 */

import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getFilmTimeline } from "@/server/studio/studio-timeline-service";
import {
  cancelTimelineExportJob,
  finishTimelineExportJob,
  readTimelineExportJob,
  rememberTimelineExportRequest,
  startTimelineExportJob,
} from "@/server/studio/studio-timeline-export-job";
import { safeTimelineExportFailure } from "@/lib/studio-timeline-export-status";
import { resolveFilmExportRuntime } from "@/server/studio/film-export-runtime";
import { executeOwnedFilmExport, PROTECTED_FILM_IDS, readAuthorizedExportBytes } from "@/server/studio/execute-timeline-film-export";
import { isVideoWorkerConfigured } from "@/lib/video-render-mode";
import { requestWorkerFilmTimelineRender } from "@/lib/video-worker-client";

/** Matches the existing long video routes. The platform default is shorter than one FFmpeg segment. */
export const maxDuration = 300;

type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  if (PROTECTED_FILM_IDS.has(projectId)) {
    return NextResponse.json(
      { error: "This film is protected. Export it only after a separate approval.", code: "protected" },
      { status: 403 },
    );
  }
  const body = (await request.json().catch(() => null)) as {
    phase?: string;
    jobId?: string;
    revision?: number;
    burnLanguage?: string;
    width?: number;
    height?: number;
  } | null;
  const loaded = await getFilmTimeline(user.id, projectId);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error.message, code: loaded.error.code }, { status: loaded.error.httpStatus });
  }
  if (!loaded.timeline) {
    return NextResponse.json({ error: "Create the timeline first.", code: "not_found" }, { status: 404 });
  }
  if (body?.phase === "start") {
    if (!loaded.timeline.storyboardId) {
      return NextResponse.json({ error: "This film has no scenes yet.", code: "source" }, { status: 400 });
    }
    const job = await startTimelineExportJob({
      ownerId: user.id,
      storyboardId: loaded.timeline.storyboardId,
      projectId,
    });
    return NextResponse.json({ jobId: job.id, status: job.status });
  }
  if (body?.phase === "cancel") {
    const result = await cancelTimelineExportJob({
      jobId: typeof body.jobId === "string" ? body.jobId : "",
      ownerId: user.id,
      projectId,
    });
    return NextResponse.json({ ok: result.ok, code: result.code }, { status: result.httpStatus });
  }
  if (typeof body?.revision === "number" && body.revision !== loaded.timeline.revision) {
    return NextResponse.json({ error: "The timeline changed. Reload it.", code: "conflict" }, { status: 409 });
  }

  let jobId = typeof body?.jobId === "string" ? body.jobId : "";
  if (jobId) {
    const existing = await readTimelineExportJob(jobId, user.id);
    if (!existing) {
      return NextResponse.json({ error: "Export was not found.", code: "not_found" }, { status: 404 });
    }
    if (existing.status === "cancelled" || existing.status === "cancel_requested") {
      return NextResponse.json({ error: "Export was cancelled.", code: "cancelled" }, { status: 409 });
    }
  } else if (loaded.timeline.storyboardId) {
    const job = await startTimelineExportJob({
      ownerId: user.id,
      storyboardId: loaded.timeline.storyboardId,
      projectId,
    });
    jobId = job.id;
  }
  const fail = async (code: string, httpStatus: number) => {
    const safe = safeTimelineExportFailure(code);
    if (jobId) {
      await finishTimelineExportJob({
        jobId,
        ownerId: user.id,
        outcome: safe.code === "cancelled" ? "cancelled" : "failed",
        errorCode: safe.code,
      });
    }
    return NextResponse.json({ error: safe.message, code: safe.code, jobId }, { status: httpStatus });
  };
  if (!jobId) return await fail("source", 400);

  const width = body?.width === 1280 && body?.height === 720 ? 1280 : 720;
  const height = width === 1280 ? 720 : 1280;
  const burnLanguage = typeof body?.burnLanguage === "string" ? body.burnLanguage : loaded.timeline.previewLanguage;

  if (resolveFilmExportRuntime() === "external_worker") {
    if (!isVideoWorkerConfigured()) return await fail("film_export_worker_required", 503);
    await rememberTimelineExportRequest({
      jobId,
      ownerId: user.id,
      projectId,
      revision: loaded.timeline.revision,
      burnLanguage,
      width,
      height,
    });
    let worker: Awaited<ReturnType<typeof requestWorkerFilmTimelineRender>>;
    try {
      worker = await requestWorkerFilmTimelineRender(jobId);
    } catch {
      return await fail("export_failed", 502);
    }
    if (!worker.ok || !worker.libraryAssetId || !worker.downloadUrl) {
      return NextResponse.json(
        { error: safeTimelineExportFailure(worker.code || "export_failed").message, code: worker.code || "export_failed", jobId },
        { status: worker.code === "cancelled" ? 409 : 422 },
      );
    }
    const bytes = await readAuthorizedExportBytes({
      ownerId: user.id,
      libraryAssetId: worker.libraryAssetId,
      downloadUrl: worker.downloadUrl,
    });
    if (!bytes) return await fail("download", 502);
    return mp4(bytes, worker.libraryAssetId, jobId);
  }

  const rendered = await executeOwnedFilmExport({
    ownerId: user.id,
    projectId,
    jobId,
    revision: typeof body?.revision === "number" ? body.revision : loaded.timeline.revision,
    burnLanguage,
    width,
    height,
    signal: request.signal,
  });
  if (!rendered.ok) {
    const safe = safeTimelineExportFailure(rendered.code);
    return NextResponse.json({ error: safe.message, code: safe.code, jobId }, { status: rendered.httpStatus });
  }
  return mp4(rendered.bytes, rendered.libraryAssetId, jobId);
}

function mp4(bytes: Buffer, libraryAsset: string, jobId: string) {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": 'attachment; filename="film.mp4"',
      "Cache-Control": "no-store",
      "X-Studio-Library-Asset": libraryAsset || "unavailable",
      "X-Studio-Export-Job": jobId,
    },
  });
}
