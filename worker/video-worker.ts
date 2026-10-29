import { realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import express from "express";
import {
  checkVideoFfmpegCapability,
  toVideoHealthResponse,
} from "../src/lib/video-ffmpeg-capability";
import { getVideoWorkerSecret } from "../src/lib/video-render-mode";
import { logBlobConfigStatus } from "../src/lib/vercel-blob-config";
import {
  runInstantPremiumWorkerProcess,
  runInstantPremiumWorkerRetryOverlay,
} from "../src/server/instant-premium/worker-job";
import { runLanguageExportWorkerRender } from "../src/server/instant-premium/language-export-worker-job";
import {
  acceptFilmTimelineJob,
  failOpenFilmExport,
  FILM_EXPORT_CONCURRENCY,
  findNextDurableFilmExport,
  runFilmTimelineWorkerRender,
  type FilmAccept,
} from "../src/server/studio/film-timeline-worker-job";
import { installWorkerFfmpegPaths } from "../src/worker/video-tools/resolve-worker-ffmpeg";
import {
  callbackFromResult,
  executeMarketplaceVideoJob,
  notifyMarketplaceCallback,
} from "../src/server/marketplace-video/run-marketplace-video-job";
import {
  MARKETPLACE_VIDEO_NAMESPACE,
  isMarketplaceJobId,
  marketplaceJobAdmission,
  parseMarketplaceJobRequest,
} from "../src/server/marketplace-video/marketplace-video-job";

const port = Number.parseInt(String(process.env.PORT || "8090"), 10) || 8090;
const RUNNING = new Set<string>();
const LANGUAGE_EXPORT_RUNNING = new Set<string>();
const FILM_EXPORT_RUNNING = new Set<string>();
let marketplaceVideoActive = 0;
let filmDrainTimer: ReturnType<typeof setTimeout> | null = null;
let filmDrainTries = 0;

function otherStudioRenderBusy(): boolean {
  return marketplaceJobAdmission({
    studioActive: RUNNING.size + LANGUAGE_EXPORT_RUNNING.size,
    marketplaceActive: marketplaceVideoActive,
  }) === "busy";
}

export function handleFilmQueueRetryRejection(queue: Promise<void>, schedule: () => void): void {
  void queue.catch((error: unknown) => {
    console.error("[video-worker]", {
      phase: "film_queue_retry_failed",
      error: error instanceof Error ? error.name : "error",
    });
    schedule();
  });
}

export function scheduleFilmDrain(): void {
  if (filmDrainTimer || filmDrainTries >= 30) return;
  filmDrainTries += 1;
  filmDrainTimer = setTimeout(() => {
    filmDrainTimer = null;
    handleFilmQueueRetryRejection(pumpFilmQueue(), scheduleFilmDrain);
  }, 2000);
}

export async function pumpFilmQueue(
  findNext: (busyIds: string[]) => Promise<string | null> = findNextDurableFilmExport,
): Promise<void> {
  if (FILM_EXPORT_RUNNING.size >= FILM_EXPORT_CONCURRENCY || otherStudioRenderBusy()) {
    scheduleFilmDrain();
    return;
  }
  const next = await findNext([...FILM_EXPORT_RUNNING]);
  if (!next) return;
  const decision = await claimAndStartFilmExport(next);
  if (decision.kind === "queued") scheduleFilmDrain();
}

function finishFilmInBackground(jobId: string): void {
  void runFilmTimelineWorkerRender(jobId)
    .catch(() => failOpenFilmExport(jobId))
    .finally(() => {
      FILM_EXPORT_RUNNING.delete(jobId);
      filmDrainTries = 0;
      void pumpFilmQueue().catch(() => scheduleFilmDrain());
    });
}

async function claimAndStartFilmExport(jobId: string): Promise<FilmAccept | { kind: "running" }> {
  if (FILM_EXPORT_RUNNING.has(jobId)) return { kind: "running" };
  if (FILM_EXPORT_RUNNING.size >= FILM_EXPORT_CONCURRENCY || otherStudioRenderBusy()) return { kind: "queued" };
  FILM_EXPORT_RUNNING.add(jobId);
  try {
    await installWorkerFfmpegPaths();
    const decision = await acceptFilmTimelineJob(jobId);
    if (decision.kind !== "start") {
      FILM_EXPORT_RUNNING.delete(jobId);
      return decision;
    }
    finishFilmInBackground(jobId);
    return { kind: "start" };
  } catch (error) {
    FILM_EXPORT_RUNNING.delete(jobId);
    console.error("[video-worker]", {
      phase: "film_export_accept_failed",
      jobId,
      error: error instanceof Error ? error.name : "error",
    });
    throw error;
  }
}

function writeFilmDecision(res: express.Response, jobId: string, decision: FilmAccept | { kind: "running" }): void {
  if (decision.kind === "start" || decision.kind === "running") {
    res.status(202).json({ ok: true, jobId, status: "processing" });
    return;
  }
  if (decision.kind === "queued") {
    res.status(202).json({ ok: true, jobId, status: "queued" });
    return;
  }
  if (decision.kind === "succeeded") {
    res.status(200).json({
      ok: true,
      jobId,
      status: "succeeded",
      libraryAssetId: decision.libraryAssetId,
      downloadUrl: decision.downloadUrl,
    });
    return;
  }
  res.status(decision.httpStatus).json({
    ok: false,
    jobId,
    status: decision.code === "cancelled" ? "cancelled" : "failed",
    code: decision.code,
  });
}

function requireWorkerAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const secret = getVideoWorkerSecret();
  if (!secret) {
    res.status(503).json({ error: "VIDEO_WORKER_SECRET is not configured." });
    return;
  }
  const header = req.headers.authorization?.trim();
  if (header !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

const app = express();
app.use(express.json({ limit: "1mb" }));

function workerSourceCommit(): string | null {
  return (
    process.env.RENDER_GIT_COMMIT?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.SOURCE_COMMIT_SHA?.trim() ||
    null
  );
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "instant-premium-video-worker",
    sourceCommitSha: workerSourceCommit(),
  });
});

app.get("/health/video", async (_req, res) => {
  const report = await checkVideoFfmpegCapability();
  const body = {
    ...toVideoHealthResponse(report),
    service: "instant-premium-video-worker",
    sourceCommitSha: workerSourceCommit(),
  };
  res.status(body.ok ? 200 : 503).json(body);
});

app.get("/health/vision", async (req, res) => {
  const probe = req.query.probe === "1" || req.query.probe === "true";
  const { getVisionSetupDiagnostics } = await import(
    "../src/server/animation-export/local-vision/vision-setup-validation"
  );
  const diagnostics = await getVisionSetupDiagnostics(probe);
  res.status(diagnostics.ok ? 200 : 503).json({
    ...diagnostics,
    service: "instant-premium-video-worker",
  });
});

app.post("/vision/detect", requireWorkerAuth, async (req, res) => {
  const startedAt = Date.now();
  const body = (req.body ?? {}) as {
    imageUrl?: string;
    imagePath?: string;
    imageBase64?: string;
  };

  const { withVisionDetectTempPath } = await import(
    "../src/server/animation-export/local-vision/vision-detect-input"
  );
  const { detectObjectsForEditor } = await import(
    "../src/server/animation-export/local-vision/object-detector"
  );

  try {
    const result = await withVisionDetectTempPath(body, async (tempPath) =>
      detectObjectsForEditor(tempPath)
    );
    const inferenceMs = Date.now() - startedAt;
    res.status(result.failed ? 503 : 200).json({
      ...result,
      inferenceMs,
      detectedAt: new Date().toISOString(),
      backend: "local",
      service: "instant-premium-video-worker",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({
      detections: [],
      failed: true,
      error: message,
      inferenceMs: Date.now() - startedAt,
      detectedAt: new Date().toISOString(),
      backend: "local",
      service: "instant-premium-video-worker",
    });
  }
});

app.post(
  "/jobs/instant-premium/:projectId/process",
  requireWorkerAuth,
  async (req, res) => {
    const projectId = String(req.params.projectId ?? "").trim();
    if (!projectId) {
      res.status(400).json({ error: "projectId is required." });
      return;
    }
    if (RUNNING.has(projectId)) {
      res.status(200).json({ ok: true, projectId, status: "running" });
      return;
    }
    if (marketplaceJobAdmission({ studioActive: 0, marketplaceActive: marketplaceVideoActive }) === "busy") {
      res.status(429).json({ ok: false, namespace: "STUDIO_RENDER", code: "BUSY" });
      return;
    }
    RUNNING.add(projectId);
    try {
      const force = Boolean(req.body?.force);
      const result = await runInstantPremiumWorkerProcess(projectId, { force });
      res.status(result.ok ? 200 : 500).json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        projectId,
        status: "failed",
        message: error instanceof Error ? error.message : "Worker process failed.",
      });
    } finally {
      RUNNING.delete(projectId);
    }
  }
);

app.post(
  "/jobs/instant-premium/:projectId/retry-overlay",
  requireWorkerAuth,
  async (req, res) => {
    const projectId = String(req.params.projectId ?? "").trim();
    if (!projectId) {
      res.status(400).json({ error: "projectId is required." });
      return;
    }
    if (RUNNING.has(projectId)) {
      res.status(200).json({ ok: true, projectId, status: "running" });
      return;
    }
    if (marketplaceJobAdmission({ studioActive: 0, marketplaceActive: marketplaceVideoActive }) === "busy") {
      res.status(429).json({ ok: false, namespace: "STUDIO_RENDER", code: "BUSY" });
      return;
    }
    RUNNING.add(projectId);
    try {
      const result = await runInstantPremiumWorkerRetryOverlay(projectId);
      res.status(result.ok ? 200 : 500).json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        projectId,
        status: "failed",
        message: error instanceof Error ? error.message : "Retry overlay failed.",
      });
    } finally {
      RUNNING.delete(projectId);
    }
  }
);

app.post(
  "/jobs/language-export/:exportId/render",
  requireWorkerAuth,
  async (req, res) => {
    const exportId = String(req.params.exportId ?? "").trim();
    if (!exportId) {
      res.status(400).json({ error: "exportId is required." });
      return;
    }
    if (LANGUAGE_EXPORT_RUNNING.has(exportId)) {
      res.status(200).json({ ok: true, exportId, status: "running" });
      return;
    }
    if (marketplaceJobAdmission({ studioActive: 0, marketplaceActive: marketplaceVideoActive }) === "busy") {
      res.status(429).json({ ok: false, namespace: "STUDIO_LANGUAGE_EXPORT", code: "BUSY" });
      return;
    }
    LANGUAGE_EXPORT_RUNNING.add(exportId);
    try {
      await installWorkerFfmpegPaths();
      const result = await runLanguageExportWorkerRender(exportId);
      res.status(result.ok ? 200 : 500).json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        exportId,
        status: "failed",
        message: error instanceof Error ? error.message : "Language export render failed.",
      });
    } finally {
      LANGUAGE_EXPORT_RUNNING.delete(exportId);
    }
  }
);

app.post("/jobs/film-timeline/:jobId/render", requireWorkerAuth, async (req, res) => {
  const jobId = String(req.params.jobId ?? "").trim();
  if (!jobId) {
    res.status(400).json({ ok: false, jobId, status: "failed", code: "not_found" });
    return;
  }
  try {
    const decision = await claimAndStartFilmExport(jobId);
    writeFilmDecision(res, jobId, decision);
    if (decision.kind === "queued") scheduleFilmDrain();
  } catch {
    if (!res.headersSent) {
      res.status(500).json({ ok: false, jobId, status: "failed", code: "export_failed" });
    }
  }
});

app.post("/jobs/marketplace-video/:jobId/process", requireWorkerAuth, (req, res) => {
  const jobId = String(req.params.jobId ?? "").trim();
  if (!isMarketplaceJobId(jobId)) {
    res.status(400).json({ ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, code: "BAD_REQUEST" });
    return;
  }
  const parsed = parseMarketplaceJobRequest(req.body);
  if (!parsed.ok) {
    res.status(400).json({ ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, code: parsed.code });
    return;
  }
  const admission = marketplaceJobAdmission({
    studioActive: RUNNING.size + LANGUAGE_EXPORT_RUNNING.size,
    marketplaceActive: marketplaceVideoActive,
  });
  if (admission === "busy") {
    res.status(429).json({ ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, status: "PENDING", code: "BUSY" });
    return;
  }
  marketplaceVideoActive += 1;
  res.status(202).json({
    ok: true,
    namespace: MARKETPLACE_VIDEO_NAMESPACE,
    jobId,
    status: "PROCESSING",
  });
  const secret = getVideoWorkerSecret() ?? "";
  void executeMarketplaceVideoJob({
    jobId,
    sourceUrl: parsed.sourceUrl,
    maxDurationSeconds: parsed.maxDurationSeconds,
  })
    .then(async (result) => {
      if (parsed.callbackUrl) {
        await notifyMarketplaceCallback(parsed.callbackUrl, secret, callbackFromResult(jobId, result));
      }
    })
    .catch(async () => {
      if (parsed.callbackUrl) {
        await notifyMarketplaceCallback(parsed.callbackUrl, secret, {
          jobId,
          namespace: MARKETPLACE_VIDEO_NAMESPACE,
          status: "FAILED",
          failureCode: "FFMPEG",
          canonicalUrl: null,
          posterUrl: null,
          probe: null,
          decision: null,
        });
      }
    })
    .finally(() => {
      marketplaceVideoActive = Math.max(0, marketplaceVideoActive - 1);
    });
});

function isWorkerProcessEntry(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    const entryUrl = pathToFileURL(realpathSync(entry)).href;
    const moduleUrl = pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href;
    return entryUrl === moduleUrl;
  } catch {
    return false;
  }
}

if (isWorkerProcessEntry()) {
  logBlobConfigStatus("instant-premium-video-worker");

  void import("../src/server/animation-export/local-vision/vision-setup-validation").then(
    ({ logVisionSetupWarningsOnce }) => logVisionSetupWarningsOnce()
  );

  void installWorkerFfmpegPaths().catch((error) => {
    console.error("[video-worker]", {
      phase: "ffmpeg_install_failed",
      error: error instanceof Error ? error.message : String(error),
    });
  });

  app.listen(port, "0.0.0.0", () => {
    console.info("[video-worker]", { phase: "listening", port });
    void pumpFilmQueue().catch(() => scheduleFilmDrain());
  });
}
