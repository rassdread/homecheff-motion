/**
 * Shared film export used by the Next route and the existing video worker.
 * Downloads only media already attached to the film. No wallet and no provider.
 */

import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { localPathIfAllowed, certifiedLocalMediaId, readCertifiedLocalFile } from "@/lib/studio-local-media";
import { prisma } from "@/lib/prisma";
import { getFilmTimeline } from "@/server/studio/studio-timeline-service";
import { renderTimelineFilm } from "@/server/studio/studio-timeline-render";
import { publishLibraryVideo } from "@/server/studio/publish-library-video";
import { finishTimelineExportJob, readTimelineExportJob, recordTimelineExportStage } from "@/server/studio/studio-timeline-export-job";
import type { TimelineAudioInput, TimelineVisualInput } from "@/lib/studio-timeline-render-plan";
import type { TimelineCue } from "@/lib/studio-timeline";

export const PROTECTED_FILM_IDS = new Set(["cmvcbmxdp00032jryohiw8a84"]);

export type FilmExportExecution =
  | {
      ok: true;
      bytes: Buffer;
      libraryAssetId: string;
      downloadUrl: string;
      durationMs: number;
    }
  | { ok: false; code: string; httpStatus: number };

export async function executeOwnedFilmExport(input: {
  ownerId: string;
  projectId: string;
  jobId: string;
  revision?: number;
  burnLanguage?: string;
  width: number;
  height: number;
  signal?: AbortSignal;
}): Promise<FilmExportExecution> {
  if (PROTECTED_FILM_IDS.has(input.projectId)) {
    await failJob(input.jobId, input.ownerId, "protected");
    return { ok: false, code: "protected", httpStatus: 403 };
  }
  const loaded = await getFilmTimeline(input.ownerId, input.projectId);
  if ("error" in loaded) {
    await failJob(input.jobId, input.ownerId, loaded.error.code);
    return { ok: false, code: loaded.error.code, httpStatus: loaded.error.httpStatus };
  }
  if (!loaded.timeline) {
    await failJob(input.jobId, input.ownerId, "not_found");
    return { ok: false, code: "not_found", httpStatus: 404 };
  }
  if (typeof input.revision === "number" && input.revision !== loaded.timeline.revision) {
    await failJob(input.jobId, input.ownerId, "conflict");
    return { ok: false, code: "conflict", httpStatus: 409 };
  }
  const current = await readTimelineExportJob(input.jobId, input.ownerId);
  if (current && (current.status === "cancelled" || current.status === "cancel_requested")) {
    return { ok: false, code: "cancelled", httpStatus: 409 };
  }
  const burnLanguage = input.burnLanguage ?? loaded.timeline.previewLanguage;
  const cues: TimelineCue[] = burnLanguage
    ? (loaded.timeline.subtitles.find((track) => track.language === burnLanguage)?.cues ?? [])
    : [];
  const workDir = await mkdtemp(path.join(os.tmpdir(), "studio-film-"));
  const stage = (name: "preparing" | "rendering_scenes" | "processing_audio" | "finalizing" | "saving") =>
    recordTimelineExportStage(input.jobId, input.ownerId, name).catch(() => undefined);
  try {
    await stage("preparing");
    const visuals: TimelineVisualInput[] = [];
    const audio: TimelineAudioInput[] = [];
    let fileIndex = 0;
    for (const track of loaded.timeline.tracks) {
      for (const clip of track.clips) {
        if (input.signal?.aborted) {
          await failJob(input.jobId, input.ownerId, "cancelled");
          return { ok: false, code: "cancelled", httpStatus: 409 };
        }
        if (track.type === "SUBTITLE") continue;
        const remote = clip.playbackUrl || (track.type === "VIDEO" ? clip.stillUrl : null);
        if (!remote) {
          if (track.type === "VIDEO") {
            await failJob(input.jobId, input.ownerId, "missing_media");
            return { ok: false, code: "missing_media", httpStatus: 422 };
          }
          continue;
        }
        if (!isFetchableBlob(remote) && !localPathIfAllowed(remote) && !ownedCertifiedFile(input.ownerId, remote)) {
          await failJob(input.jobId, input.ownerId, "unsupported_source");
          return { ok: false, code: "unsupported_source", httpStatus: 422 };
        }
        const local = path.join(workDir, `source-${fileIndex}`);
        fileIndex += 1;
        const saved = await downloadBlob(remote, local, input.ownerId);
        if (!saved.ok) {
          await failJob(input.jobId, input.ownerId, "download");
          return { ok: false, code: "download", httpStatus: 502 };
        }
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
      width: input.width,
      height: input.height,
      visuals,
      audio,
      cues,
      burnSubtitles: cues.length > 0,
      signal: input.signal,
      onStage: stage,
    });
    if (!rendered.ok) {
      const code = rendered.code === "cancelled" ? "cancelled" : rendered.code;
      await failJob(input.jobId, input.ownerId, code);
      return { ok: false, code, httpStatus: rendered.code === "cancelled" ? 409 : 422 };
    }
    const again = await readTimelineExportJob(input.jobId, input.ownerId);
    if (again && (again.status === "cancelled" || again.status === "cancel_requested")) {
      return { ok: false, code: "cancelled", httpStatus: 409 };
    }
    const bytes = await readFile(outputPath);
    await stage("saving");
    let libraryAssetId = "";
    let downloadUrl = "";
    try {
      const stored = await publishLibraryVideo({
        ownerId: input.ownerId,
        sourceKind: "timeline_export",
        sourceId: `${input.projectId}:${loaded.timeline.revision}:${burnLanguage || "none"}`,
        title: loaded.timeline.title || "Film",
        description: "Timeline export. The original clips were not replaced.",
        bytes,
        projectId: input.projectId,
        durationSeconds: rendered.durationMs / 1000,
        width: input.width,
        height: input.height,
        language: burnLanguage,
        metadata: { revision: loaded.timeline.revision, burnLanguage: burnLanguage || null },
      });
      libraryAssetId = stored.assetId;
      downloadUrl = stored.url;
    } catch {
      libraryAssetId = "";
      downloadUrl = "";
    }
    if (!libraryAssetId || !downloadUrl) {
      await failJob(input.jobId, input.ownerId, "storage");
      return { ok: false, code: "storage", httpStatus: 502 };
    }
    await finishTimelineExportJob({
      jobId: input.jobId,
      ownerId: input.ownerId,
      outcome: "succeeded",
      outputAssetId: libraryAssetId,
    });
    return { ok: true, bytes, libraryAssetId, downloadUrl, durationMs: rendered.durationMs };
  } catch {
    const code = input.signal?.aborted ? "cancelled" : "export_failed";
    await failJob(input.jobId, input.ownerId, code);
    return { ok: false, code, httpStatus: input.signal?.aborted ? 409 : 500 };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export async function readOwnedTimelineDownload(ownerId: string, libraryAssetId: string): Promise<Buffer | null> {
  if (!libraryAssetId) return null;
  const asset = await prisma.studioLibraryAsset.findFirst({
    where: { id: libraryAssetId, ownerId, sourceKind: "timeline_export", deletedAt: null },
    select: { id: true, downloadUrl: true },
  });
  if (!asset?.downloadUrl) return null;
  return readAuthorizedExportBytes({ ownerId, libraryAssetId: asset.id, downloadUrl: asset.downloadUrl });
}

export async function readAuthorizedExportBytes(input: {
  ownerId: string;
  libraryAssetId: string;
  downloadUrl: string;
}): Promise<Buffer | null> {
  if (!input.libraryAssetId || !input.downloadUrl) return null;
  const asset = await prisma.studioLibraryAsset.findFirst({
    where: { id: input.libraryAssetId, ownerId: input.ownerId, deletedAt: null },
    select: { downloadUrl: true },
  });
  if (!asset || asset.downloadUrl !== input.downloadUrl) return null;
  const local = localPathIfAllowed(asset.downloadUrl) || ownedCertifiedFile(input.ownerId, asset.downloadUrl);
  if (local) return readFile(local);
  if (!isFetchableBlob(asset.downloadUrl)) return null;
  const response = await fetch(asset.downloadUrl);
  if (!response.ok) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > 80 * 1024 * 1024) return null;
  return bytes;
}

async function failJob(jobId: string, ownerId: string, code: string) {
  await finishTimelineExportJob({
    jobId,
    ownerId,
    outcome: code === "cancelled" ? "cancelled" : "failed",
    errorCode: code,
  });
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
