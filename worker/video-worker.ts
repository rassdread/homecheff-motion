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
import { installWorkerFfmpegPaths } from "../src/worker/video-tools/resolve-worker-ffmpeg";

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

const port = Number.parseInt(String(process.env.PORT || "8090"), 10) || 8090;
const RUNNING = new Set<string>();
const LANGUAGE_EXPORT_RUNNING = new Set<string>();

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

app.listen(port, "0.0.0.0", () => {
  console.info("[video-worker]", { phase: "listening", port });
});
