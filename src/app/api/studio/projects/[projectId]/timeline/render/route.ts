/**
 * Owner-scoped timeline export.
 * Downloads only media URLs already attached to this film by the timeline service,
 * then calls the existing FFmpeg adapter. No wallet and no provider.
 */

import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { localPathIfAllowed, certifiedLocalMediaId, readCertifiedLocalFile } from "@/lib/studio-local-media";
import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getFilmTimeline } from "@/server/studio/studio-timeline-service";
import { renderTimelineFilm } from "@/server/studio/studio-timeline-render";
import { publishLibraryVideo } from "@/server/studio/publish-library-video";
import {
  cancelTimelineExportJob,
  finishTimelineExportJob,
  readTimelineExportJob,
  startTimelineExportJob,
} from "@/server/studio/studio-timeline-export-job";
import { safeTimelineExportFailure } from "@/lib/studio-timeline-export-status";
import { resolveFilmExportRuntime } from "@/server/studio/film-export-runtime";
import type { TimelineAudioInput, TimelineVisualInput } from "@/lib/studio-timeline-render-plan";
import type { TimelineCue } from "@/lib/studio-timeline";

const PROTECTED_FILM_IDS = new Set(["cmvcbmxdp00032jryohiw8a84"]);

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

  if (resolveFilmExportRuntime() === "external_worker") {
    return await fail("film_export_worker_required", 503);
  }

  const width = body?.width === 1280 && body?.height === 720 ? 1280 : 720;
  const height = width === 1280 ? 720 : 1280;
  const burnLanguage = typeof body?.burnLanguage === "string" ? body.burnLanguage : loaded.timeline.previewLanguage;
  const cues: TimelineCue[] = burnLanguage
    ? (loaded.timeline.subtitles.find((track) => track.language === burnLanguage)?.cues ?? [])
    : [];

  const workDir = await mkdtemp(path.join(os.tmpdir(), "studio-film-"));
  try {
    const visuals: TimelineVisualInput[] = [];
    const audio: TimelineAudioInput[] = [];
    let fileIndex = 0;
    for (const track of loaded.timeline.tracks) {
      for (const clip of track.clips) {
        if (request.signal.aborted) return await fail("cancelled", 409);
        if (track.type === "SUBTITLE") continue;
        const remote = clip.playbackUrl || (track.type === "VIDEO" ? clip.stillUrl : null);
        if (!remote) {
          if (track.type === "VIDEO") return await fail("missing_media", 422);
          continue;
        }
        if (!isFetchableBlob(remote) && !localPathIfAllowed(remote) && !ownedCertifiedFile(user.id, remote)) {
          return await fail("unsupported_source", 422);
        }
        const local = path.join(workDir, `source-${fileIndex}`);
        fileIndex += 1;
        const saved = await downloadBlob(remote, local, user.id);
        if (!saved.ok) return await fail("download", 502);
        if (track.type === "VIDEO") {
          visuals.push({
            path: local,
            kind: clip.playbackUrl ? "video" : "still",
            startMs: clip.startMs,
            durationMs: clip.durationMs,
            inMs: clip.inMs,
          });
        } else if (clip.audible && (track.type === "DIALOGUE" || track.type === "NARRATION" || track.type === "MUSIC" || track.type === "SFX")) {
          audio.push({
            track: track.type,
            path: local,
            startMs: clip.startMs,
            durationMs: clip.durationMs,
            inMs: clip.inMs,
            volume: Math.round((clip.volume / 100) * (track.volume / 100) * 100),
          });
        }
      }
    }
    const outputPath = path.join(workDir, "film.mp4");
    const rendered = await renderTimelineFilm({
      workDir: path.join(workDir, "render"),
      outputPath,
      width,
      height,
      visuals,
      audio,
      cues,
      burnSubtitles: cues.length > 0,
      signal: request.signal,
    });
    if (!rendered.ok) {
      return await fail(rendered.code, rendered.code === "cancelled" ? 409 : 422);
    }
    if (request.signal.aborted) return await fail("cancelled", 409);
    const current = jobId ? await readTimelineExportJob(jobId, user.id) : null;
    if (current && (current.status === "cancelled" || current.status === "cancel_requested")) {
      return NextResponse.json({ error: "Export was cancelled.", code: "cancelled", jobId }, { status: 409 });
    }
    const bytes = await readFile(outputPath);
    let libraryAsset = "";
    try {
      const stored = await publishLibraryVideo({
        ownerId: user.id,
        sourceKind: "timeline_export",
        sourceId: `${projectId}:${loaded.timeline.revision}:${burnLanguage || "none"}`,
        title: loaded.timeline.title || "Film",
        description: "Timeline export. The original clips were not replaced.",
        bytes,
        projectId,
        durationSeconds: rendered.durationMs / 1000,
        width,
        height,
        language: burnLanguage,
        metadata: { revision: loaded.timeline.revision, burnLanguage: burnLanguage || null },
      });
      libraryAsset = stored.assetId;
    } catch {
      libraryAsset = "";
    }
    if (jobId) {
      await finishTimelineExportJob({ jobId, ownerId: user.id, outcome: "succeeded" });
    }
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="film.mp4"',
        "Cache-Control": "no-store",
        "X-Studio-Library-Asset": libraryAsset || "unavailable",
        "X-Studio-Export-Job": jobId,
      },
    });
  } catch {
    return await fail(request.signal.aborted ? "cancelled" : "export_failed", request.signal.aborted ? 409 : 500);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function isFetchableBlob(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "blob.vercel-storage.com" || host.endsWith(".blob.vercel-storage.com"));
  } catch {
    return false;
  }
}

async function downloadBlob(url: string, dest: string, ownerId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  await mkdir(path.dirname(dest), { recursive: true });
  const local = localPathIfAllowed(url) || ownedCertifiedFile(ownerId, url);
  if (local) {
    await copyFile(local, dest);
    return { ok: true };
  }
  const response = await fetch(url);
  if (!response.ok) return { ok: false, message: "Studio storage did not return the file." };
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > 80 * 1024 * 1024) {
    return { ok: false, message: "The file is empty or larger than the export limit." };
  }
  await writeFile(dest, bytes);
  return { ok: true };
}

function ownedCertifiedFile(ownerId: string, value: string): string | null {
  const id = certifiedLocalMediaId(value);
  if (!id) return null;
  const found = readCertifiedLocalFile(id);
  if (!found || found.record.ownerId !== ownerId) return null;
  return found.absolutePath;
}
