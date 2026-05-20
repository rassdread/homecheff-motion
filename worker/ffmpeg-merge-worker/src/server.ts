import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { put } from "@vercel/blob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerRoot = path.resolve(__dirname, "..");
const outputsDir = path.join(workerRoot, "outputs");

function resolveListenPort(): number {
  const n = Number.parseInt(String(process.env.PORT || "8080"), 10);
  return Number.isFinite(n) && n > 0 ? n : 8080;
}

const port = resolveListenPort();
const WORKER_PUBLIC_URL = (process.env.WORKER_PUBLIC_URL || `http://localhost:${port}`).replace(
  /\/+$/,
  ""
);
const MERGE_WORKER_API_KEY = process.env.MERGE_WORKER_API_KEY?.trim();
const MOTION_WORKER_SECRET = process.env.MOTION_WORKER_SECRET?.trim();
const FFMPEG_PATH = process.env.FFMPEG_PATH?.trim() || "ffmpeg";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN?.trim();

/** Tune with `src/lib/media-export-constants.ts` (final merge only, not Vidu segments). */
const FINAL_MERGE_CRF = "25";
const FINAL_MERGE_PRESET = "veryfast";
const DEFAULT_EXPORT_MAX_WIDTH = 1280;

type JobStatus = "queued" | "processing" | "completed" | "failed";

type JobRecord = {
  id: string;
  projectId: string;
  exportId: string;
  callbackUrl: string | null;
  status: JobStatus;
  progress: number;
  outputVideoUrl: string | null;
  errorMessage: string | null;
  videos: { id: string; order: number; url: string }[];
  outputFilename: string;
  exportMaxWidth: number;
};

const jobs = new Map<string, JobRecord>();

function logMerge(phase: string, data: Record<string, unknown>) {
  console.log("[merge-worker]", { phase, ...data });
}

process.on("unhandledRejection", (reason) => {
  console.error("[merge-worker]", {
    phase: "process.unhandled_rejection",
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on("uncaughtException", (err) => {
  console.error("[merge-worker]", {
    phase: "process.uncaught_exception",
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
});

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!MERGE_WORKER_API_KEY) {
    next();
    return;
  }
  const header = req.headers.authorization?.trim();
  const expected = `Bearer ${MERGE_WORKER_API_KEY}`;
  if (header !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function escapeConcatPath(filePath: string): string {
  return filePath.replace(/'/g, `'\\''`);
}

function runFfmpeg(args: string[], cwd: string): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG_PATH, args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(new Error(`FFmpeg not found (${FFMPEG_PATH}). Install ffmpeg or set FFMPEG_PATH.`));
        return;
      }
      reject(err);
    });
    child.on("close", (code) => resolve({ code: code ?? 1, stderr }));
  });
}

async function concatAndEncodeFinalMergedVideo(
  workDir: string,
  segmentPaths: string[],
  outputFile: string,
  maxWidth: number
): Promise<void> {
  const concatLines = segmentPaths
    .map((p) => `file '${escapeConcatPath(path.resolve(p))}'`)
    .join("\n");
  const concatFile = path.join(workDir, "concat.txt");
  await fs.writeFile(concatFile, `${concatLines}\n`, "utf8");
  const baseArgs = ["-y", "-f", "concat", "-safe", "0", "-i", concatFile];
  const vf = `scale=w='if(gt(iw,${maxWidth}),${maxWidth},iw)':h=-2,format=yuv420p`;
  const args = [
    ...baseArgs,
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-preset",
    FINAL_MERGE_PRESET,
    "-crf",
    FINAL_MERGE_CRF,
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    outputFile,
  ];
  const r = await runFfmpeg(args, workDir);
  if (r.code !== 0) {
    throw new Error(`FFmpeg final merge failed: ${r.stderr.trim().slice(-2000)}`);
  }
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) {
    throw new Error(`Download failed HTTP ${res.status} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) {
    throw new Error(`Empty body for ${url}`);
  }
  await fs.writeFile(dest, buf);
}

function resolveJobIdFromBody(body: Record<string, unknown>): string {
  const raw = typeof body.jobId === "string" ? body.jobId.trim() : "";
  if (raw && /^[a-zA-Z0-9_-]{8,128}$/.test(raw)) {
    return raw;
  }
  return randomUUID();
}

async function notifyMainApp(
  job: JobRecord,
  state: {
    status: "completed" | "failed";
    progress: number;
    outputVideoUrl: string | null;
    errorMessage: string | null;
  }
): Promise<void> {
  const secret = MOTION_WORKER_SECRET;
  const url = job.callbackUrl?.trim();
  if (!url || !secret) {
    logMerge("merge.callback_skipped", {
      jobId: job.id,
      projectId: job.projectId,
      exportId: job.exportId,
      reason: !url ? "no_callback_url" : "no_motion_worker_secret",
    });
    return;
  }

  const body = {
    projectId: job.projectId,
    exportId: job.exportId,
    jobId: job.id,
    status: state.status,
    progress: state.progress,
    outputVideoUrl: state.outputVideoUrl ?? undefined,
    errorMessage: state.errorMessage ?? undefined,
  };

  logMerge("merge.callback_started", {
    jobId: job.id,
    projectId: job.projectId,
    exportId: job.exportId,
    fragmentCount: job.videos.length,
    callbackUrl: url,
    status: state.status,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-motion-worker-secret": secret,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const text = await res.text();
    logMerge("merge.callback_completed", {
      jobId: job.id,
      projectId: job.projectId,
      exportId: job.exportId,
      httpStatus: res.status,
      responsePreview: text.slice(0, 300),
    });
    if (!res.ok) {
      logMerge("merge.callback_http_error", {
        jobId: job.id,
        projectId: job.projectId,
        exportId: job.exportId,
        httpStatus: res.status,
        responsePreview: text.slice(0, 500),
      });
    }
  } catch (e) {
    logMerge("merge.callback_failed", {
      jobId: job.id,
      projectId: job.projectId,
      exportId: job.exportId,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
  }
}

async function runMergeJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) {
    logMerge("merge.job_missing", { jobId });
    return;
  }

  logMerge("merge.job_started", {
    jobId,
    projectId: job.projectId,
    exportId: job.exportId,
    fragmentCount: job.videos.length,
    outputFilename: job.outputFilename,
  });

  try {
    if (!job.projectId?.trim()) {
      throw new Error("Missing projectId");
    }
    if (!job.exportId?.trim()) {
      throw new Error("Missing exportId");
    }
    if (MOTION_WORKER_SECRET && !job.callbackUrl?.trim()) {
      throw new Error("MOTION_WORKER_SECRET is set but callbackUrl is missing");
    }
    if (!job.videos.length) {
      throw new Error("No video fragments");
    }

    logMerge("merge.payload_validated", {
      jobId,
      projectId: job.projectId,
      exportId: job.exportId,
      fragmentCount: job.videos.length,
    });

    job.status = "processing";
    job.progress = 5;

    logMerge("merge.assets_resolving", {
      jobId,
      projectId: job.projectId,
      exportId: job.exportId,
      fragmentCount: job.videos.length,
    });

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `merge-${jobId}-`));
    const sorted = [...job.videos].sort((a, b) => a.order - b.order);
    const outName = job.outputFilename.replace(/[^a-zA-Z0-9._-]/g, "_") || "final.mp4";
    const localOut = path.join(workDir, outName);

    try {
      logMerge("merge.assets_downloading", {
        jobId,
        projectId: job.projectId,
        exportId: job.exportId,
        fragmentCount: sorted.length,
      });

      const segmentPaths: string[] = [];
      for (let i = 0; i < sorted.length; i += 1) {
        const segPath = path.join(workDir, `seg-${i}.mp4`);
        await downloadToFile(sorted[i].url, segPath);
        segmentPaths.push(segPath);
        job.progress = Math.min(85, 10 + Math.round((70 * (i + 1)) / sorted.length));
      }

      logMerge("merge.ffmpeg_command_building", {
        jobId,
        projectId: job.projectId,
        exportId: job.exportId,
        fragmentCount: segmentPaths.length,
        exportMaxWidth: job.exportMaxWidth,
        outputPath: localOut,
      });

      job.progress = 88;
      logMerge("merge.ffmpeg_started", {
        jobId,
        projectId: job.projectId,
        exportId: job.exportId,
        fragmentCount: segmentPaths.length,
      });

      await concatAndEncodeFinalMergedVideo(workDir, segmentPaths, localOut, job.exportMaxWidth);

      logMerge("merge.ffmpeg_completed", {
        jobId,
        projectId: job.projectId,
        exportId: job.exportId,
        outputPath: localOut,
      });

      logMerge("merge.output_upload_started", {
        jobId,
        projectId: job.projectId,
        exportId: job.exportId,
        mode: BLOB_TOKEN ? "vercel_blob" : "local_disk",
      });

      let publicUrl: string;
      if (BLOB_TOKEN) {
        const fileBuffer = await fs.readFile(localOut);
        const blob = await put(`animations/merge/${jobId}/${outName}`, fileBuffer, {
          access: "public",
          contentType: "video/mp4",
          token: BLOB_TOKEN,
        });
        publicUrl = blob.url;
      } else {
        await fs.mkdir(outputsDir, { recursive: true });
        const diskName = `${jobId}-${outName}`;
        const diskPath = path.join(outputsDir, diskName);
        await fs.copyFile(localOut, diskPath);
        publicUrl = `${WORKER_PUBLIC_URL}/outputs/${encodeURIComponent(diskName)}`;
      }

      logMerge("merge.output_upload_completed", {
        jobId,
        projectId: job.projectId,
        exportId: job.exportId,
        outputUrl: publicUrl,
      });

      job.outputVideoUrl = publicUrl;
      job.progress = 100;
      job.status = "completed";
      job.errorMessage = null;

      await notifyMainApp(job, {
        status: "completed",
        progress: 100,
        outputVideoUrl: publicUrl,
        errorMessage: null,
      });

      logMerge("merge.job_completed", {
        jobId,
        projectId: job.projectId,
        exportId: job.exportId,
        outputUrl: publicUrl,
        fragmentCount: sorted.length,
      });
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Merge failed";
    const stack = e instanceof Error ? e.stack : undefined;
    job.status = "failed";
    job.progress = 0;
    job.errorMessage = msg;
    job.outputVideoUrl = null;

    logMerge("merge.job_failed", {
      jobId,
      projectId: job.projectId,
      exportId: job.exportId,
      fragmentCount: job.videos.length,
      error: msg,
      stack,
    });

    await notifyMainApp(job, {
      status: "failed",
      progress: 0,
      outputVideoUrl: null,
      errorMessage: msg,
    });
  }
}

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "ffmpeg-merge-worker" });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "homecheff-motion-merge-worker",
    port,
    time: new Date().toISOString(),
  });
});

app.use("/outputs", express.static(outputsDir));

app.post("/merge", requireAuth, (req, res) => {
  const body = req.body as Record<string, unknown>;
  const jobId = resolveJobIdFromBody(body);

  const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
  const exportId = typeof body.exportId === "string" ? body.exportId.trim() : "";
  const callbackUrl =
    typeof body.callbackUrl === "string" && body.callbackUrl.trim()
      ? body.callbackUrl.trim()
      : null;

  const videosRaw = body.videos;
  if (!videosRaw || !Array.isArray(videosRaw) || videosRaw.length === 0) {
    logMerge("merge.payload_invalid", {
      phaseDetail: "videos",
      jobId,
      projectId: projectId || undefined,
      exportId: exportId || undefined,
    });
    res.status(400).json({ error: "videos array required and non-empty" });
    return;
  }

  if (!projectId) {
    logMerge("merge.payload_invalid", { phaseDetail: "projectId", jobId, exportId });
    res.status(400).json({ error: "projectId required" });
    return;
  }

  if (!exportId) {
    logMerge("merge.payload_invalid", { phaseDetail: "exportId", jobId, projectId });
    res.status(400).json({ error: "exportId required" });
    return;
  }

  if (MOTION_WORKER_SECRET && !callbackUrl) {
    logMerge("merge.payload_invalid", {
      phaseDetail: "callbackUrl_required_when_secret_set",
      jobId,
      projectId,
      exportId,
    });
    res.status(400).json({ error: "callbackUrl required when worker has MOTION_WORKER_SECRET" });
    return;
  }

  const videos = videosRaw.map((v: unknown, idx: number) => {
    const row = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
    return {
      id: typeof row.id === "string" && row.id ? row.id : `clip-${idx}`,
      order: typeof row.order === "number" ? row.order : idx,
      url: typeof row.url === "string" ? row.url.trim() : "",
    };
  });

  if (videos.some((v) => !v.url)) {
    logMerge("merge.payload_invalid", {
      phaseDetail: "video_url",
      jobId,
      projectId,
      exportId,
      fragmentCount: videos.length,
    });
    res.status(400).json({ error: "Each video needs a url" });
    return;
  }

  let exportMaxWidth = DEFAULT_EXPORT_MAX_WIDTH;
  if (typeof body.exportMaxWidth === "number" && Number.isFinite(body.exportMaxWidth)) {
    const w = Math.round(body.exportMaxWidth);
    if (w >= 320 && w <= 3840) {
      exportMaxWidth = w;
    }
  }

  const job: JobRecord = {
    id: jobId,
    projectId,
    exportId,
    callbackUrl,
    status: "queued",
    progress: 0,
    outputVideoUrl: null,
    errorMessage: null,
    videos,
    outputFilename: typeof body.outputFilename === "string" ? body.outputFilename : "final.mp4",
    exportMaxWidth,
  };
  jobs.set(jobId, job);

  logMerge("merge.request_received", {
    jobId,
    projectId,
    exportId,
    fragmentCount: videos.length,
    hasCallback: Boolean(callbackUrl),
  });

  res.status(202).json({
    ok: true,
    accepted: true,
    jobId,
    status: job.status,
    progress: job.progress,
    outputVideoUrl: job.outputVideoUrl,
    errorMessage: job.errorMessage,
  });

  setImmediate(() => {
    void runMergeJob(jobId).catch((error) => {
      console.error("[merge-worker]", {
        phase: "merge.background_job_unhandled_error",
        jobId,
        projectId,
        exportId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    });
  });
});

app.get("/merge/:jobId", requireAuth, (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    outputVideoUrl: job.outputVideoUrl,
    errorMessage: job.errorMessage,
  });
});

app.listen(port, "0.0.0.0", () => {
  console.info("[blob-config]", {
    service: "ffmpeg-merge-worker",
    "token-present": Boolean(BLOB_TOKEN),
  });
  console.log("[merge-worker] listening", { port });
  console.log(`[merge-worker] Public URL base (for output links): ${WORKER_PUBLIC_URL}`);
});
