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

const PORT = Number(process.env.PORT?.trim() || "8787");
const WORKER_PUBLIC_URL = (process.env.WORKER_PUBLIC_URL || `http://localhost:${PORT}`).replace(
  /\/+$/,
  ""
);
const MERGE_WORKER_API_KEY = process.env.MERGE_WORKER_API_KEY?.trim();
const FFMPEG_PATH = process.env.FFMPEG_PATH?.trim() || "ffmpeg";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN?.trim();

type JobStatus = "queued" | "processing" | "completed" | "failed";

type JobRecord = {
  id: string;
  status: JobStatus;
  progress: number;
  outputVideoUrl: string | null;
  errorMessage: string | null;
  videos: { id: string; order: number; url: string }[];
  outputFilename: string;
};

const jobs = new Map<string, JobRecord>();

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

async function concatWithFfmpeg(
  workDir: string,
  segmentPaths: string[],
  outputFile: string
): Promise<void> {
  const concatLines = segmentPaths
    .map((p) => `file '${escapeConcatPath(path.resolve(p))}'`)
    .join("\n");
  const concatFile = path.join(workDir, "concat.txt");
  await fs.writeFile(concatFile, `${concatLines}\n`, "utf8");
  const baseArgs = ["-y", "-f", "concat", "-safe", "0", "-i", concatFile];

  const tryCopy = await runFfmpeg([...baseArgs, "-c", "copy", outputFile], workDir);
  if (tryCopy.code === 0) {
    return;
  }
  const tryReencode = await runFfmpeg(
    [
      ...baseArgs,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      outputFile,
    ],
    workDir
  );
  if (tryReencode.code === 0) {
    return;
  }
  const tryVideoOnly = await runFfmpeg(
    [
      ...baseArgs,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-an",
      "-movflags",
      "+faststart",
      outputFile,
    ],
    workDir
  );
  if (tryVideoOnly.code === 0) {
    return;
  }
  throw new Error("FFmpeg concat failed (see worker logs for stderr).");
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

async function processJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) {
    return;
  }
  job.status = "processing";
  job.progress = 5;

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `merge-${jobId}-`));
  const sorted = [...job.videos].sort((a, b) => a.order - b.order);
  const outName = job.outputFilename.replace(/[^a-zA-Z0-9._-]/g, "_") || "final.mp4";
  const localOut = path.join(workDir, outName);

  try {
    const segmentPaths: string[] = [];
    for (let i = 0; i < sorted.length; i += 1) {
      const segPath = path.join(workDir, `seg-${i}.mp4`);
      await downloadToFile(sorted[i].url, segPath);
      segmentPaths.push(segPath);
      job.progress = Math.min(85, 10 + Math.round((70 * (i + 1)) / sorted.length));
    }

    job.progress = 88;
    await concatWithFfmpeg(workDir, segmentPaths, localOut);

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

    job.outputVideoUrl = publicUrl;
    job.progress = 100;
    job.status = "completed";
    job.errorMessage = null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Merge failed";
    job.status = "failed";
    job.progress = 0;
    job.errorMessage = msg;
    job.outputVideoUrl = null;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/outputs", express.static(outputsDir));

app.post("/merge", requireAuth, (req, res) => {
  const body = req.body as {
    projectId?: string;
    videos?: { id?: string; order?: number; url?: string }[];
    outputFilename?: string;
  };
  if (!body?.videos || !Array.isArray(body.videos) || body.videos.length === 0) {
    res.status(400).json({ error: "videos array required" });
    return;
  }
  const videos = body.videos.map((v, idx) => ({
    id: typeof v.id === "string" && v.id ? v.id : `clip-${idx}`,
    order: typeof v.order === "number" ? v.order : idx,
    url: typeof v.url === "string" ? v.url.trim() : "",
  }));
  if (videos.some((v) => !v.url)) {
    res.status(400).json({ error: "Each video needs a url" });
    return;
  }

  const jobId = randomUUID();
  const job: JobRecord = {
    id: jobId,
    status: "queued",
    progress: 0,
    outputVideoUrl: null,
    errorMessage: null,
    videos,
    outputFilename: typeof body.outputFilename === "string" ? body.outputFilename : "final.mp4",
  };
  jobs.set(jobId, job);
  void processJob(jobId);

  res.status(202).json({
    jobId,
    status: job.status,
    progress: job.progress,
    outputVideoUrl: job.outputVideoUrl,
    errorMessage: job.errorMessage,
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

app.listen(PORT, () => {
  console.log(`ffmpeg-merge-worker listening on ${PORT} (public URL base: ${WORKER_PUBLIC_URL})`);
});
