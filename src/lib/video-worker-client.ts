import {
  getVideoWorkerBaseUrl,
  getVideoWorkerSecret,
  isVideoRenderWorkerMode,
} from "@/lib/video-render-mode";
import type { VideoHealthResponse } from "@/lib/video-ffmpeg-capability";
import type { VisionSetupDiagnostics } from "@/server/animation-export/local-vision/vision-setup-validation";
import type { ObjectDetectionResult } from "@/server/animation-export/local-vision/object-detector-types";

export type WorkerVisionDetectResponse = ObjectDetectionResult & {
  inferenceMs: number;
  detectedAt: string;
  backend: "local";
  service?: string;
};

export type WorkerHealthResponse = VideoHealthResponse & {
  service?: string;
};

export type WorkerJobResponse = {
  ok: boolean;
  projectId: string;
  status: string;
  message?: string;
};

function workerHeaders(): HeadersInit {
  const secret = getVideoWorkerSecret();
  if (!secret) {
    throw new Error("VIDEO_WORKER_SECRET is not configured.");
  }
  return {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };
}

function workerBaseUrl(): string {
  const base = getVideoWorkerBaseUrl();
  if (!base) {
    throw new Error("VIDEO_WORKER_BASE_URL is not configured.");
  }
  return base;
}

export async function fetchWorkerVisionHealth(
  probe = false
): Promise<(VisionSetupDiagnostics & { service?: string }) | null> {
  if (!isVideoRenderWorkerMode()) {
    return null;
  }
  const base = getVideoWorkerBaseUrl();
  if (!base) {
    return null;
  }
  const url = probe ? `${base}/health/vision?probe=1` : `${base}/health/vision`;
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(probe ? 20_000 : 12_000),
      cache: "no-store",
    });
    const body = (await res.json()) as VisionSetupDiagnostics & { service?: string };
    return { ...body, ok: res.ok && body.ok === true };
  } catch {
    return null;
  }
}

export async function fetchWorkerVideoHealth(): Promise<WorkerHealthResponse | null> {
  if (!isVideoRenderWorkerMode()) {
    return null;
  }
  const base = getVideoWorkerBaseUrl();
  if (!base) {
    return null;
  }
  try {
    const res = await fetch(`${base}/health/video`, {
      method: "GET",
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    const body = (await res.json()) as WorkerHealthResponse;
    return { ...body, ok: res.ok && body.ok === true };
  } catch {
    return {
      ok: false,
      ffmpegPath: null,
      hasDrawtext: false,
      fontPath: null,
      fontReadable: false,
      errors: ["worker health request failed"],
    };
  }
}

async function postWorkerJob(
  path: string,
  options?: { force?: boolean }
): Promise<WorkerJobResponse> {
  const res = await fetch(`${workerBaseUrl()}${path}`, {
    method: "POST",
    headers: workerHeaders(),
    body: JSON.stringify(options ?? {}),
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await res.json().catch(() => ({}))) as WorkerJobResponse & { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? body.message ?? `Worker request failed (${res.status})`);
  }
  return body;
}

/** Fire-and-forget worker process (idempotent on worker). */
export function triggerWorkerInstantPremiumProcess(
  projectId: string,
  options?: { force?: boolean }
): void {
  void postWorkerJob(`/jobs/instant-premium/${encodeURIComponent(projectId)}/process`, options).catch(
    (error) => {
      console.info("[hc-instant-premium]", {
        projectId,
        phase: "worker_trigger_failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  );
}

export async function requestWorkerInstantPremiumProcess(
  projectId: string,
  options?: { force?: boolean }
): Promise<WorkerJobResponse> {
  return postWorkerJob(`/jobs/instant-premium/${encodeURIComponent(projectId)}/process`, options);
}

export async function requestWorkerRetryOverlay(projectId: string): Promise<WorkerJobResponse> {
  return postWorkerJob(
    `/jobs/instant-premium/${encodeURIComponent(projectId)}/retry-overlay`,
    { force: true }
  );
}

export type LanguageExportWorkerJobResponse = {
  ok: boolean;
  exportId: string;
  status: string;
  message?: string;
};

/** Fire-and-forget language export render on the video worker. */
export function triggerWorkerLanguageExport(exportId: string): void {
  void postWorkerJob(`/jobs/language-export/${encodeURIComponent(exportId)}/render`).catch(
    (error) => {
      console.error("[language-export]", {
        exportId,
        phase: "worker_trigger_failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  );
}

export async function requestWorkerVisionDetect(input: {
  imageUrl?: string;
  imagePath?: string;
  imageBase64?: string;
}): Promise<WorkerVisionDetectResponse> {
  const res = await fetch(`${workerBaseUrl()}/vision/detect`, {
    method: "POST",
    headers: workerHeaders(),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as WorkerVisionDetectResponse & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(body.error ?? `Worker vision detect failed (${res.status})`);
  }
  return body;
}

export async function requestWorkerLanguageExportRender(
  exportId: string
): Promise<LanguageExportWorkerJobResponse> {
  const res = await fetch(
    `${workerBaseUrl()}/jobs/language-export/${encodeURIComponent(exportId)}/render`,
    {
      method: "POST",
      headers: workerHeaders(),
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(30_000),
    }
  );
  const body = (await res.json().catch(() => ({}))) as LanguageExportWorkerJobResponse & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(body.error ?? body.message ?? `Worker request failed (${res.status})`);
  }
  return body;
}
