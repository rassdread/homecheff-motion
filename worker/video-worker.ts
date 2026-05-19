import express from "express";
import {
  checkVideoFfmpegCapability,
  toVideoHealthResponse,
} from "../src/lib/video-ffmpeg-capability";
import { getVideoWorkerSecret } from "../src/lib/video-render-mode";
import {
  runInstantPremiumWorkerProcess,
  runInstantPremiumWorkerRetryOverlay,
} from "../src/server/instant-premium/worker-job";

const port = Number.parseInt(String(process.env.PORT || "8090"), 10) || 8090;
const RUNNING = new Set<string>();

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

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "instant-premium-video-worker" });
});

app.get("/health/video", async (_req, res) => {
  const report = await checkVideoFfmpegCapability();
  const body = { ...toVideoHealthResponse(report), service: "instant-premium-video-worker" };
  res.status(body.ok ? 200 : 503).json(body);
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

app.listen(port, "0.0.0.0", () => {
  console.info("[video-worker]", { phase: "listening", port });
});
