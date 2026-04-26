import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getAnimationProjectById } from "@/server/animation-projects/queries";
import {
  assertExternalMergeConfigured,
  resolveAnimationExportMode,
} from "@/server/animation-export/export-config";
import {
  pollExternalMergeJob,
  startExternalMergeJob,
} from "@/server/animation-export/external-merge-client";
import { maybeDeleteTransitionBlobVideosAfterFinalExport } from "@/server/animation-export/cleanup-generated-assets";
import {
  FINAL_MERGE_DISABLE_AUDIO,
  FINAL_MERGE_VIDEO_CRF,
  FINAL_MERGE_VIDEO_PRESET,
  getFinalMergeMaxWidthFromViduResolution,
} from "@/lib/media-export-constants";

const EXPORT_CHAIN = new Map<string, Promise<unknown>>();
const EXTERNAL_EXPORT_PROVIDER = "external-ffmpeg";

function ffmpegBinary(): string {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
}

function escapeConcatPath(filePath: string): string {
  return filePath.replace(/'/g, `'\\''`);
}

function publicUrlForFinalVideo(projectId: string): string {
  return `/generated/animations/projects/${projectId}/final.mp4`;
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
      throw new Error(`Local video file missing for path: ${trimmed}`);
    }
    return abs;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    let response: Response;
    try {
      response = await fetch(trimmed, { signal: AbortSignal.timeout(60_000) });
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Network error while downloading video.";
      throw new Error(
        `Could not download transition video from URL (${trimmed}). ${message}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `Could not download transition video: HTTP ${response.status} for ${trimmed}`
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      throw new Error(`Downloaded empty video body for ${trimmed}`);
    }

    const dest = path.join(workDir, `segment-${index}.mp4`);
    await fs.writeFile(dest, buffer);
    return dest;
  }

  throw new Error(`Unsupported transition video URL (expected /… or http(s)…): ${trimmed}`);
}

function runFfmpeg(
  binary: string,
  args: string[],
  options: { cwd?: string }
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: options.cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(
          new Error(
            "FFmpeg is not available in this environment. Install ffmpeg or set FFMPEG_PATH."
          )
        );
        return;
      }
      reject(err);
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1, stderr });
    });
  });
}

async function assertFfmpegAvailable(): Promise<void> {
  const binary = ffmpegBinary();
  const result = await runFfmpeg(binary, ["-version"], {});
  if (result.code !== 0) {
    throw new Error(
      "FFmpeg is not available in this environment (ffmpeg -version exited non-zero)."
    );
  }
}

/**
 * Final merged deliverable: single H.264 pass, capped width, CRF ~23–28 range, faststart.
 * Not used for per-transition Vidu source clips.
 */
async function concatAndEncodeFinalMergedVideo(
  workDir: string,
  segmentPaths: string[],
  outputFile: string,
  maxWidth: number
): Promise<void> {
  const binary = ffmpegBinary();
  const concatLines = segmentPaths
    .map((p) => `file '${escapeConcatPath(path.resolve(p))}'`)
    .join("\n");
  const concatFile = path.join(workDir, "concat.txt");
  await fs.writeFile(concatFile, `${concatLines}\n`, "utf8");

  const baseArgs = ["-y", "-f", "concat", "-safe", "0", "-i", concatFile];
  const vf = `scale=w='if(gt(iw,${maxWidth}),${maxWidth},iw)':h=-2,format=yuv420p`;
  const videoArgs = [
    ...baseArgs,
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
    "+faststart",
  ];
  if (FINAL_MERGE_DISABLE_AUDIO) {
    videoArgs.push("-an");
  } else {
    videoArgs.push("-c:a", "aac", "-b:a", "128k");
  }
  videoArgs.push(outputFile);

  const encoded = await runFfmpeg(binary, videoArgs, { cwd: workDir });
  if (encoded.code === 0) {
    return;
  }

  throw new Error(
    `FFmpeg final merge encode failed (code ${encoded.code}). stderr:\n${encoded.stderr.trim().slice(-4000)}`
  );
}

async function runExclusiveExport<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
  const previous = EXPORT_CHAIN.get(projectId) ?? Promise.resolve();
  const run = previous.then(() => fn());
  EXPORT_CHAIN.set(projectId, run.catch(() => undefined));
  return run;
}

type LoadedAnimationProject = NonNullable<Awaited<ReturnType<typeof getAnimationProjectById>>>;

async function loadProjectOrThrow(projectId: string): Promise<LoadedAnimationProject> {
  const p = await getAnimationProjectById(projectId);
  if (!p) {
    throw new Error("Project not found.");
  }
  return p;
}

async function runExclusiveExportCatch(
  projectId: string,
  fn: () => Promise<LoadedAnimationProject | null>
): Promise<LoadedAnimationProject> {
  try {
    const result = await runExclusiveExport(projectId, fn);
    if (result) {
      return result;
    }
  } catch {
    /* fall through to reload */
  }
  return loadProjectOrThrow(projectId);
}

function mapRemoteMergeStatusToExportStatus(remote: string): string {
  const s = remote.toLowerCase();
  if (s === "completed") {
    return "completed";
  }
  if (s === "failed") {
    return "failed";
  }
  return "rendering";
}

async function runExternalExportStart(projectId: string) {
  assertExternalMergeConfigured();
  const project = await getAnimationProjectById(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const latestExport = project.exports[0];
  if (latestExport?.status === "completed" && latestExport.outputVideoUrl?.trim()) {
    if (project.status !== "completed") {
      await prisma.animationProject.update({
        where: { id: projectId },
        data: { status: "completed" },
      });
    }
    return loadProjectOrThrow(projectId);
  }

  if (
    latestExport?.provider === EXTERNAL_EXPORT_PROVIDER &&
    latestExport.providerJobId?.trim() &&
    latestExport.status === "rendering"
  ) {
    return loadProjectOrThrow(projectId);
  }

  const transitions = [...project.transitions].sort((a, b) => a.order - b.order);
  if (transitions.length === 0) {
    throw new Error("No transitions to export.");
  }

  const transitionsReady = transitions.every(
    (t) => t.status === "completed" && Boolean(t.outputVideoUrl?.trim())
  );
  if (!transitionsReady) {
    throw new Error("Not all transitions are completed with a video URL.");
  }

  const canExport =
    project.status === "rendering" ||
    (project.status === "failed" && latestExport?.status === "failed");

  if (!canExport) {
    throw new Error(
      `Export cannot run (project status: ${project.status}, latest export: ${latestExport?.status ?? "none"}).`
    );
  }

  if (project.status === "failed" && latestExport?.status === "failed") {
    await prisma.animationProject.update({
      where: { id: projectId },
      data: { status: "rendering" },
    });
  }

  let exportRecordId: string;
  if (latestExport?.status === "failed" || latestExport?.status === "rendering") {
    const updated = await prisma.animationExport.update({
      where: { id: latestExport.id },
      data: {
        status: "rendering",
        progress: 0,
        errorMessage: null,
        outputVideoUrl: null,
        provider: null,
        providerJobId: null,
      },
    });
    exportRecordId = updated.id;
  } else if (!latestExport) {
    const created = await prisma.animationExport.create({
      data: {
        projectId,
        status: "rendering",
        progress: 0,
      },
    });
    exportRecordId = created.id;
  } else {
    throw new Error(`Cannot start export: existing export is ${latestExport.status}.`);
  }

  try {
    const remote = await startExternalMergeJob({
      projectId,
      transitionVideos: transitions.map((t) => ({
        transitionId: t.id,
        order: t.order,
        outputVideoUrl: t.outputVideoUrl!,
      })),
      outputFilename: "final.mp4",
      exportMaxWidth: getFinalMergeMaxWidthFromViduResolution(project.viduResolution),
    });

    if (!remote.jobId.trim()) {
      throw new Error("External merge API returned an empty jobId.");
    }

    const exportStatus = mapRemoteMergeStatusToExportStatus(remote.status);
    await prisma.animationExport.update({
      where: { id: exportRecordId },
      data: {
        provider: EXTERNAL_EXPORT_PROVIDER,
        providerJobId: remote.jobId.trim(),
        progress: remote.progress,
        status: exportStatus,
        errorMessage: remote.errorMessage,
        outputVideoUrl: remote.outputVideoUrl?.trim() || null,
      },
    });

    if (remote.status.toLowerCase() === "completed" && remote.outputVideoUrl?.trim()) {
      await prisma.animationProject.update({
        where: { id: projectId },
        data: { status: "completed" },
      });
      await maybeDeleteTransitionBlobVideosAfterFinalExport(projectId).catch(() => undefined);
    } else if (remote.status.toLowerCase() === "failed") {
      await prisma.animationProject.update({
        where: { id: projectId },
        data: { status: "failed" },
      });
      throw new Error(remote.errorMessage ?? "External merge failed.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "External export start failed.";
    await prisma.animationExport.update({
      where: { id: exportRecordId },
      data: {
        status: "failed",
        progress: 0,
        errorMessage: message,
        outputVideoUrl: null,
        provider: EXTERNAL_EXPORT_PROVIDER,
        providerJobId: null,
      },
    });
    await prisma.animationProject.update({
      where: { id: projectId },
      data: { status: "failed" },
    });
    throw new Error(message);
  }

  return loadProjectOrThrow(projectId);
}

async function syncExternalMergePoll(projectId: string) {
  const project = await getAnimationProjectById(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  const ex = project.exports[0];
  if (!ex?.providerJobId?.trim() || ex.provider !== EXTERNAL_EXPORT_PROVIDER) {
    return project;
  }

  let remote: Awaited<ReturnType<typeof pollExternalMergeJob>>;
  try {
    remote = await pollExternalMergeJob(ex.providerJobId);
  } catch {
    const again = await getAnimationProjectById(projectId);
    if (!again) {
      throw new Error("Project not found.");
    }
    return again;
  }

  const exportStatus = mapRemoteMergeStatusToExportStatus(remote.status);
  await prisma.animationExport.update({
    where: { id: ex.id },
    data: {
      status: exportStatus,
      progress: remote.progress,
      outputVideoUrl: remote.outputVideoUrl?.trim() || null,
      errorMessage: remote.errorMessage,
    },
  });

  if (remote.status.toLowerCase() === "completed" && remote.outputVideoUrl?.trim()) {
    await prisma.animationProject.update({
      where: { id: projectId },
      data: { status: "completed" },
    });
    await maybeDeleteTransitionBlobVideosAfterFinalExport(projectId).catch(() => undefined);
  } else if (remote.status.toLowerCase() === "failed") {
    await prisma.animationProject.update({
      where: { id: projectId },
      data: { status: "failed" },
    });
  }

  const out = await getAnimationProjectById(projectId);
  if (!out) {
    throw new Error("Project not found.");
  }
  return out;
}

export async function startProjectExport(projectId: string) {
  const mode = resolveAnimationExportMode();
  if (mode === "external") {
    assertExternalMergeConfigured();
  }
  return runExclusiveExport(projectId, async () => {
    if (mode === "external") {
      return runExternalExportStart(projectId);
    }
    return runLocalProjectExportMerge(projectId);
  });
}

export async function pollProjectExport(projectId: string) {
  const project = await getAnimationProjectById(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  /** User-cancelled or other terminal failure: do not auto-restart merge from poll. */
  if (project.status === "failed") {
    return project;
  }

  const latestExport = project.exports[0];
  const allTransitionsDone =
    project.transitions.length > 0 &&
    project.transitions.every(
      (t) => t.status === "completed" && Boolean(t.outputVideoUrl?.trim())
    );

  const mode = resolveAnimationExportMode();

  if (mode === "external") {
    const exportDone =
      latestExport?.status === "completed" && Boolean(latestExport.outputVideoUrl?.trim());

    if (project.status === "rendering" && allTransitionsDone && !exportDone) {
      const hasPollableJob =
        latestExport?.provider === EXTERNAL_EXPORT_PROVIDER &&
        Boolean(latestExport.providerJobId?.trim());

      if (hasPollableJob) {
        return runExclusiveExportCatch(projectId, () => syncExternalMergePoll(projectId));
      }

      const needsStart =
        !latestExport ||
        latestExport.status === "failed" ||
        (latestExport.status === "rendering" &&
          (!latestExport.provider ||
            (latestExport.provider === EXTERNAL_EXPORT_PROVIDER &&
              !latestExport.providerJobId?.trim())));

      if (needsStart) {
        return runExclusiveExportCatch(projectId, () => runExternalExportStart(projectId));
      }
    }

    return project;
  }

  const shouldRunFromPoll =
    project.status === "rendering" &&
    allTransitionsDone &&
    (!latestExport || latestExport.status === "failed");

  if (shouldRunFromPoll) {
    return runExclusiveExportCatch(projectId, () => runLocalProjectExportMerge(projectId));
  }

  return project;
}

async function runLocalProjectExportMerge(projectId: string) {
  const project = await getAnimationProjectById(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const latestExport = project.exports[0];
  if (latestExport?.status === "completed" && latestExport.outputVideoUrl) {
    if (project.status !== "completed") {
      await prisma.animationProject.update({
        where: { id: projectId },
        data: { status: "completed" },
      });
    }
    return loadProjectOrThrow(projectId);
  }

  const transitions = [...project.transitions].sort((a, b) => a.order - b.order);
  if (transitions.length === 0) {
    throw new Error("No transitions to export.");
  }

  const transitionsReady = transitions.every(
    (t) => t.status === "completed" && Boolean(t.outputVideoUrl?.trim())
  );
  if (!transitionsReady) {
    throw new Error("Not all transitions are completed with a video URL.");
  }

  const canExport =
    project.status === "rendering" ||
    (project.status === "failed" && latestExport?.status === "failed");

  if (!canExport) {
    throw new Error(
      `Export cannot run (project status: ${project.status}, latest export: ${latestExport?.status ?? "none"}).`
    );
  }

  if (project.status === "failed" && latestExport?.status === "failed") {
    await prisma.animationProject.update({
      where: { id: projectId },
      data: { status: "rendering" },
    });
  }

  let exportRecordId: string;
  if (latestExport?.status === "failed" || latestExport?.status === "rendering") {
    const updated = await prisma.animationExport.update({
      where: { id: latestExport.id },
      data: {
        status: "rendering",
        progress: 5,
        errorMessage: null,
        outputVideoUrl: null,
        provider: null,
        providerJobId: null,
      },
    });
    exportRecordId = updated.id;
  } else if (!latestExport) {
    const created = await prisma.animationExport.create({
      data: {
        projectId,
        status: "rendering",
        progress: 5,
      },
    });
    exportRecordId = created.id;
  } else {
    throw new Error(`Cannot start export: existing export is ${latestExport.status}.`);
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `hc-export-${projectId}-`));
  const outDir = absolutePublicPath("generated", "animations", "projects", projectId);
  await ensureDir(outDir);
  const finalAbs = path.join(outDir, "final.mp4");
  const publicUrl = publicUrlForFinalVideo(projectId);

  try {
    await assertFfmpegAvailable();

    await prisma.animationExport.update({
      where: { id: exportRecordId },
      data: { progress: 15 },
    });

    const segmentPaths: string[] = [];
    for (let i = 0; i < transitions.length; i += 1) {
      const url = transitions[i].outputVideoUrl!;
      const seg = await resolveTransitionVideoToSegment(url, workDir, i);
      segmentPaths.push(seg);
    }

    await prisma.animationExport.update({
      where: { id: exportRecordId },
      data: { progress: 45 },
    });

    await concatAndEncodeFinalMergedVideo(
      workDir,
      segmentPaths,
      finalAbs,
      getFinalMergeMaxWidthFromViduResolution(project.viduResolution)
    );

    await prisma.animationExport.update({
      where: { id: exportRecordId },
      data: {
        status: "completed",
        progress: 100,
        outputVideoUrl: publicUrl,
        errorMessage: null,
      },
    });

    await prisma.animationProject.update({
      where: { id: projectId },
      data: { status: "completed" },
    });

    await maybeDeleteTransitionBlobVideosAfterFinalExport(projectId).catch(() => undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export merge failed.";
    await prisma.animationExport.update({
      where: { id: exportRecordId },
      data: {
        status: "failed",
        progress: 0,
        errorMessage: message,
        outputVideoUrl: null,
      },
    });
    await prisma.animationProject.update({
      where: { id: projectId },
      data: { status: "failed" },
    });
    throw new Error(message);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }

  return loadProjectOrThrow(projectId);
}
