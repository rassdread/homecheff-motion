import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { pollProjectJobs } from "@/server/animation-jobs/service";
import { getVideoProvider } from "@/server/video-providers";
import {
  FINAL_MERGE_DISABLE_AUDIO,
  FINAL_MERGE_VIDEO_CRF,
  FINAL_MERGE_VIDEO_PRESET,
  getFinalMergeMaxWidthFromViduResolution,
} from "@/lib/media-export-constants";

type InstantSegmentStatus = "queued" | "generating" | "completed" | "failed";

export type InstantPremiumStatusResponse = {
  projectId: string;
  projectType: "instant_premium";
  status: "queued" | "running" | "finalizing" | "completed" | "failed";
  phase: "generating_clips" | "merging_clips" | "uploading_final" | "completed" | "failed";
  progressPercent: number;
  segments: Array<{
    index: number;
    status: InstantSegmentStatus;
    sourceImageId: string;
    sourceImageUrl: string | null;
    videoUrl: string | null;
    durationSeconds: number | null;
    providerTaskId: string | null;
    error: string | null;
  }>;
  finalVideoUrl: string | null;
  finalDurationSeconds: number | null;
  downloadable: boolean;
  errorMessage: string | null;
  missingSegments?: number[];
};

const MERGE_CHAIN = new Map<string, Promise<unknown>>();

function isInstantLikeProject(project: {
  projectType?: string | null;
  stylePreset?: string | null;
  instantOutputDurationSeconds?: number | null;
  instantSelectedChips?: unknown;
  instantUserIntent?: string | null;
}): boolean {
  return (
    project.projectType === "instant_premium" ||
    project.stylePreset === "food_promo" ||
    project.stylePreset === "clean_business" ||
    project.stylePreset === "social_boost" ||
    project.instantOutputDurationSeconds != null ||
    project.instantSelectedChips != null ||
    (project.instantUserIntent?.trim().length ?? 0) > 0
  );
}

function ffmpegBinary(): string {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
}

function mapTransitionStatus(status: string): InstantSegmentStatus {
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "generating" || status === "rendering" || status === "processing") return "generating";
  return "queued";
}

function absolutePublicPath(...segments: string[]): string {
  return path.join(process.cwd(), "public", ...segments);
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveTransitionVideoToSegment(
  url: string,
  workDir: string,
  index: number
): Promise<string> {
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) {
    const relative = trimmed.replace(/^\/+/, "");
    const abs = absolutePublicPath(...relative.split("/"));
    if (!(await pathExists(abs))) {
      throw new Error(`Missing local segment: ${trimmed}`);
    }
    return abs;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const response = await fetch(trimmed, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) {
      throw new Error(`Could not download segment URL ${trimmed} (HTTP ${response.status})`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length <= 0) {
      throw new Error(`Downloaded empty segment for ${trimmed}`);
    }
    const dest = path.join(workDir, `segment-${index}.mp4`);
    await fs.writeFile(dest, buffer);
    return dest;
  }
  throw new Error(`Unsupported segment URL: ${trimmed}`);
}

function runFfmpeg(
  binary: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number }
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: options.cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (options.timeoutMs && options.timeoutMs > 0) {
      timeout = setTimeout(() => child.kill("SIGKILL"), options.timeoutMs);
    }

    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (timeout) clearTimeout(timeout);
      reject(err);
    });
    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      resolve({ code: code ?? 1, stderr });
    });
  });
}

async function concatAndEncode(
  workDir: string,
  segmentPaths: string[],
  outputFile: string,
  maxWidth: number,
  segmentDurationSeconds?: number | null
) {
  const args = ["-y"];
  const canCrossfade =
    segmentPaths.length > 1 &&
    typeof segmentDurationSeconds === "number" &&
    Number.isFinite(segmentDurationSeconds) &&
    segmentDurationSeconds > 1;

  if (canCrossfade) {
    const perSegment = Number(segmentDurationSeconds);
    const crossfadeSeconds = Math.max(0.2, Math.min(0.5, perSegment / 4, 0.35));
    for (const seg of segmentPaths) {
      args.push("-i", seg);
    }

    const filterParts: string[] = [];
    for (let i = 0; i < segmentPaths.length; i += 1) {
      filterParts.push(
        `[${i}:v]settb=AVTB,scale=w='if(gt(iw,${maxWidth}),${maxWidth},iw)':h=-2,format=yuv420p[v${i}]`
      );
    }
    let timelineSeconds = perSegment;
    let lastLabel = "v0";
    for (let i = 1; i < segmentPaths.length; i += 1) {
      const outLabel = `x${i}`;
      const offset = Math.max(0, timelineSeconds - crossfadeSeconds);
      filterParts.push(
        `[${lastLabel}][v${i}]xfade=transition=fade:duration=${crossfadeSeconds.toFixed(3)}:offset=${offset.toFixed(3)}[${outLabel}]`
      );
      lastLabel = outLabel;
      timelineSeconds += perSegment - crossfadeSeconds;
    }

    args.push(
      "-filter_complex",
      filterParts.join(";"),
      "-map",
      `[${lastLabel}]`,
      "-c:v",
      "libx264",
      "-preset",
      FINAL_MERGE_VIDEO_PRESET,
      "-crf",
      String(FINAL_MERGE_VIDEO_CRF),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart"
    );
  } else {
    const concatFile = path.join(workDir, "concat.txt");
    const concatLines = segmentPaths.map((p) => `file '${path.resolve(p).replace(/'/g, `'\\''`)}'`).join("\n");
    await fs.writeFile(concatFile, `${concatLines}\n`, "utf8");
    const vf = `scale=w='if(gt(iw,${maxWidth}),${maxWidth},iw)':h=-2,format=yuv420p`;
    args.push(
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFile,
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-preset",
      FINAL_MERGE_VIDEO_PRESET,
      "-crf",
      String(FINAL_MERGE_VIDEO_CRF),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart"
    );
  }

  if (FINAL_MERGE_DISABLE_AUDIO) {
    args.push("-an");
  } else {
    args.push("-c:a", "aac", "-b:a", "128k");
  }
  args.push(outputFile);
  const encoded = await runFfmpeg(ffmpegBinary(), args, { cwd: workDir, timeoutMs: 10 * 60 * 1000 });
  if (encoded.code !== 0) {
    throw new Error(`Instant merge ffmpeg failed: ${encoded.stderr.trim().slice(-3000)}`);
  }
}

async function withMergeLock(projectId: string, fn: () => Promise<void>) {
  const prev = MERGE_CHAIN.get(projectId) ?? Promise.resolve();
  const run = prev.then(fn);
  MERGE_CHAIN.set(projectId, run.catch(() => undefined));
  return run;
}

async function uploadMergedVideoToBlob(projectId: string, mergedPath: string): Promise<string> {
  const body = await fs.readFile(mergedPath);
  if (!body || body.length <= 0) {
    throw new Error("Merged video is empty before blob upload.");
  }
  const blob = await put(`motion/final/${projectId}/final.mp4`, body, {
    access: "public",
    contentType: "video/mp4",
    addRandomSuffix: false,
  });
  return blob.url;
}

async function persistSegmentVideoToBlob(
  projectId: string,
  segmentOrder: number,
  sourceUrl: string
): Promise<string> {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    throw new Error("Missing segment URL.");
  }
  if (trimmed.includes(".public.blob.vercel-storage.com/")) {
    return trimmed;
  }
  const response = await fetch(trimmed, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new Error(`Could not download segment URL ${trimmed} (HTTP ${response.status})`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (!body || body.length <= 0) {
    throw new Error(`Downloaded empty segment for ${trimmed}`);
  }
  const blob = await put(`motion/segments/${projectId}/segment-${segmentOrder + 1}.mp4`, body, {
    access: "public",
    contentType: "video/mp4",
    addRandomSuffix: false,
  });
  return blob.url;
}

async function mergeInstantProject(projectId: string, options?: { force?: boolean }): Promise<void> {
  await withMergeLock(projectId, async () => {
    const project = await prisma.animationProject.findUnique({
      where: { id: projectId },
      include: {
        transitions: { orderBy: { order: "asc" } },
        exports: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!project || !isInstantLikeProject(project)) {
      return;
    }

    const latestExport = project.exports[0];
    if (!options?.force && latestExport?.status === "completed" && latestExport.outputVideoUrl) {
      return;
    }
    if (!options?.force && latestExport?.status === "rendering") {
      return;
    }

    const completed = project.transitions.filter((t) => t.status === "completed" && t.outputVideoUrl?.trim());
    if (completed.length !== project.transitions.length || completed.length === 0) {
      return;
    }

    const exportRow =
      latestExport?.status === "failed"
        ? await prisma.animationExport.update({
            where: { id: latestExport.id },
            data: { status: "rendering", progress: 10, errorMessage: null, outputVideoUrl: null },
          })
        : latestExport
          ? await prisma.animationExport.update({
              where: { id: latestExport.id },
              data: { status: "rendering", progress: 10, errorMessage: null, outputVideoUrl: null },
            })
          : await prisma.animationExport.create({
              data: { projectId, status: "rendering", progress: 10, provider: "instant-local-ffmpeg" },
            });

    await prisma.animationProject.update({ where: { id: projectId }, data: { status: "rendering" } });
    console.info("[hc-instant-premium]", {
      projectId,
      phase: "mergeStart",
      mergeStart: true,
      segmentCount: completed.length,
      mergeInputUrls: completed.map((t) => t.outputVideoUrl),
    });

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `hc-instant-merge-${projectId}-`));
    const outDir = absolutePublicPath("generated", "animations", "projects", projectId);
    await ensureDir(outDir);
    const finalAbs = path.join(outDir, "final.mp4");
    try {
      const segmentPaths: string[] = [];
      for (let i = 0; i < completed.length; i += 1) {
        segmentPaths.push(await resolveTransitionVideoToSegment(completed[i].outputVideoUrl!, workDir, i));
      }
      await prisma.animationExport.update({
        where: { id: exportRow.id },
        data: { progress: 70, status: "rendering" },
      });
      await concatAndEncode(
        workDir,
        segmentPaths,
        finalAbs,
        getFinalMergeMaxWidthFromViduResolution(project.viduResolution),
        project.viduDurationSeconds ?? null
      );
      const stat = await fs.stat(finalAbs).catch(() => null);
      if (!stat || stat.size <= 0) {
        throw new Error("Final merged video is empty.");
      }
      const finalUrl = await uploadMergedVideoToBlob(projectId, finalAbs);
      await prisma.animationExport.update({
        where: { id: exportRow.id },
        data: { status: "completed", progress: 100, outputVideoUrl: finalUrl, errorMessage: null },
      });
      await prisma.animationProject.update({ where: { id: projectId }, data: { status: "completed" } });
      console.info("[hc-instant-premium]", {
        projectId,
        phase: "mergeComplete",
        mergeOutputBytes: stat.size,
        finalVideoUrl: finalUrl,
        completed: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instant merge failed.";
      await prisma.animationExport.update({
        where: { id: exportRow.id },
        data: { status: "failed", progress: 0, errorMessage: message, outputVideoUrl: null },
      });
      await prisma.animationProject.update({ where: { id: projectId }, data: { status: "failed" } });
      console.info("[hc-instant-premium]", {
        projectId,
        phase: "failed",
        error: message,
      });
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });
}

type RecoverResult = {
  segmentCount: number;
  completedSegments: number;
  missingSegments: number[];
  mergeStarted: boolean;
  mergeCompleted: boolean;
  finalVideoUrlPresent: boolean;
  duplicateSegments?: number[];
};

export async function refreshTransitionOutputsFromProvider(projectId: string): Promise<void> {
  const transitions = await prisma.animationTransition.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  const provider = getVideoProvider();
  await Promise.all(
    transitions.map(async (tr) => {
      if (!tr.providerJobId?.trim()) {
        return;
      }
      try {
        const polled = await provider.getVideoJobStatus(tr.providerJobId);
        if (polled.status === "completed" && polled.outputVideoUrl?.trim()) {
          let stableUrl = polled.outputVideoUrl.trim();
          try {
            stableUrl = await persistSegmentVideoToBlob(projectId, tr.order, stableUrl);
          } catch {
            // keep provider URL as fallback if blob sync fails
          }
          await prisma.animationTransition.update({
            where: { id: tr.id },
            data: {
              status: "completed",
              progress: 100,
              outputVideoUrl: stableUrl,
              errorMessage: null,
            },
          });
        } else if (tr.status === "completed" && tr.outputVideoUrl?.trim()) {
          // Backfill old completed rows with stable blob URLs.
          let stableUrl = tr.outputVideoUrl.trim();
          try {
            stableUrl = await persistSegmentVideoToBlob(projectId, tr.order, stableUrl);
          } catch {
            return;
          }
          if (stableUrl !== tr.outputVideoUrl.trim()) {
            await prisma.animationTransition.update({
              where: { id: tr.id },
              data: { outputVideoUrl: stableUrl, updatedAt: new Date() },
            });
          }
        }
      } catch {
        // best effort only
      }
    })
  );
}

function duplicateCompletedSegmentOrders(
  transitions: Array<{ order: number; status: string; outputVideoUrl: string | null }>
): number[] {
  const seen = new Map<string, number>();
  const dupes: number[] = [];
  for (const t of transitions) {
    const url = t.outputVideoUrl?.trim();
    if (t.status !== "completed" || !url) continue;
    if (seen.has(url)) {
      dupes.push(t.order);
    } else {
      seen.set(url, t.order);
    }
  }
  return dupes.sort((a, b) => a - b);
}

export async function recoverExistingInstantProject(
  projectId: string,
  options?: { force?: boolean }
): Promise<RecoverResult> {
  await refreshTransitionOutputsFromProvider(projectId);

  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project || !isInstantLikeProject(project)) {
    throw new Error("Instant Premium project not found.");
  }
  const total = project.transitions.length;
  const completed = project.transitions.filter((t) => t.status === "completed" && t.outputVideoUrl?.trim());
  const missingSegments = project.transitions
    .filter((t) => !(t.status === "completed" && t.outputVideoUrl?.trim()))
    .map((t) => t.order);
  const duplicateSegments = duplicateCompletedSegmentOrders(project.transitions);
  const alreadyFinal = Boolean(project.exports[0]?.status === "completed" && project.exports[0]?.outputVideoUrl);

  console.info("[hc-instant-premium]", {
    action: "recover_existing_project",
    projectId,
    segmentCount: total,
    completedSegments: completed.length,
    missingSegments,
    duplicateSegments,
    mergeStarted: (options?.force || !alreadyFinal) && missingSegments.length === 0 && completed.length > 0,
    mergeCompleted: false,
    finalVideoUrlPresent: alreadyFinal,
  });

  if (duplicateSegments.length > 0) {
    return {
      segmentCount: total,
      completedSegments: completed.length,
      missingSegments,
      duplicateSegments,
      mergeStarted: false,
      mergeCompleted: false,
      finalVideoUrlPresent: false,
    };
  }

  if ((options?.force || !alreadyFinal) && missingSegments.length === 0 && completed.length > 0) {
    await mergeInstantProject(projectId, { force: Boolean(options?.force) });
  }

  const refreshed = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      exports: { orderBy: { createdAt: "desc" } },
    },
  });
  const finalVideoUrlPresent = Boolean(
    refreshed?.exports[0]?.status === "completed" && refreshed.exports[0]?.outputVideoUrl
  );
  console.info("[hc-instant-premium]", {
    action: "recover_existing_project",
    projectId,
    segmentCount: total,
    completedSegments: completed.length,
    missingSegments,
    duplicateSegments,
    mergeStarted: (options?.force || !alreadyFinal) && missingSegments.length === 0 && completed.length > 0,
    mergeCompleted: finalVideoUrlPresent,
    finalVideoUrlPresent,
  });
  return {
    segmentCount: total,
    completedSegments: completed.length,
    missingSegments,
    duplicateSegments,
    mergeStarted: (options?.force || !alreadyFinal) && missingSegments.length === 0 && completed.length > 0,
    mergeCompleted: finalVideoUrlPresent,
    finalVideoUrlPresent,
  };
}

export async function retryInstantPremiumMerge(projectId: string): Promise<void> {
  const p = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      projectType: true,
      stylePreset: true,
      instantOutputDurationSeconds: true,
      instantSelectedChips: true,
      instantUserIntent: true,
    },
  });
  if (!p || !isInstantLikeProject(p)) {
    throw new Error("Instant Premium project not found.");
  }
  await mergeInstantProject(projectId, { force: true });
}

export async function getInstantPremiumStatus(projectId: string): Promise<InstantPremiumStatusResponse> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      images: { orderBy: { order: "asc" } },
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project || !isInstantLikeProject(project)) {
    throw new Error("Instant Premium project not found.");
  }

  if (project.status === "generating") {
    await pollProjectJobs(project.id).catch(() => undefined);
  }

  const refreshed = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      images: { orderBy: { order: "asc" } },
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!refreshed || !isInstantLikeProject(refreshed)) {
    throw new Error("Instant Premium project not found.");
  }

  const transitionsCompleted =
    refreshed.transitions.length > 0 &&
    refreshed.transitions.every((t) => t.status === "completed" && t.outputVideoUrl?.trim());
  console.info("[hc-instant-premium]", {
    projectId,
    phase: "poll_status",
    allSegmentsCompleted: transitionsCompleted ? refreshed.transitions.length : 0,
  });
  if (transitionsCompleted) {
    await mergeInstantProject(projectId);
  }

  const finalState = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      images: { orderBy: { order: "asc" } },
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!finalState || !isInstantLikeProject(finalState)) {
    throw new Error("Instant Premium project not found.");
  }
  const latestExport = finalState.exports[0];
  const imageById = new Map(finalState.images.map((i) => [i.id, i]));
  const segmentDuration = finalState.viduDurationSeconds ?? null;
  const segments = finalState.transitions.map((t) => {
    const source = imageById.get(t.startImageId);
    const status = mapTransitionStatus(t.status);
    console.info("[hc-instant-premium]", {
      projectId,
      phase: "segment_status",
      segmentIndex: t.order,
      providerTaskId: t.providerJobId,
      segmentVideoUrlPresent: Boolean(t.outputVideoUrl),
      segmentSaved: Boolean(t.id),
    });
    return {
      index: t.order,
      status,
      sourceImageId: t.startImageId,
      sourceImageUrl: source?.previewUrl ?? null,
      videoUrl: t.outputVideoUrl,
      durationSeconds: segmentDuration,
      providerTaskId: t.providerJobId,
      error: t.errorMessage,
    };
  });

  const averageTransitions =
    finalState.transitions.length > 0
      ? Math.round(
          finalState.transitions.reduce((acc, tr) => acc + (tr.progress ?? 0), 0) /
            finalState.transitions.length
        )
      : 0;
  const progressPercent =
    finalState.status === "completed"
      ? 100
      : finalState.status === "failed"
        ? Math.max(0, latestExport?.progress ?? averageTransitions)
        : finalState.status === "rendering"
          ? Math.max(55, latestExport?.progress ?? 55)
          : Math.max(5, averageTransitions);
  const phase: InstantPremiumStatusResponse["phase"] =
    finalState.status === "failed"
      ? "failed"
      : finalState.status === "completed"
        ? "completed"
        : finalState.status === "rendering"
          ? latestExport?.progress && latestExport.progress >= 85
            ? "uploading_final"
            : "merging_clips"
          : "generating_clips";
  const status: InstantPremiumStatusResponse["status"] =
    finalState.status === "failed"
      ? "failed"
      : finalState.status === "completed"
        ? "completed"
        : finalState.status === "rendering"
          ? "finalizing"
          : "running";

  const finalVideoUrl = latestExport?.status === "completed" ? latestExport.outputVideoUrl ?? null : null;
  return {
    projectId: finalState.id,
    projectType: "instant_premium",
    status,
    phase,
    progressPercent,
    segments,
    finalVideoUrl,
    finalDurationSeconds:
      finalState.transitions.length > 0 && segmentDuration
        ? finalState.transitions.length * segmentDuration
        : null,
    downloadable: Boolean(finalVideoUrl),
    errorMessage:
      latestExport?.errorMessage ??
      finalState.transitions.find((t) => t.status === "failed")?.errorMessage ??
      null,
    missingSegments: finalState.transitions
      .filter((t) => !(t.status === "completed" && t.outputVideoUrl?.trim()))
      .map((t) => t.order),
  };
}
