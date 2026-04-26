import type {
  CreateStartEndVideoJobInput,
  CreateStartEndVideoJobResult,
  VideoJobLifecycleStatus,
  VideoJobStatusResult,
  VideoProvider,
} from "./types";
import {
  assertViduApiKeyPresent,
  assertViduRealCallsEnabled,
  isViduDebug,
  isViduRealCallsEnabled,
  resolvePublicImageUrlForVidu,
  resolveViduDurationSecondsForJob,
  resolveViduModelForJob,
  resolveViduResolutionForJob,
  viduBaseUrl,
} from "./vidu-config";

function viduDebug(message: string, details: Record<string, unknown>): void {
  if (!isViduDebug()) {
    return;
  }
  const safe: Record<string, unknown> = { ...details };
  if (typeof safe.apiKeyTail === "string") {
    /* already tail only */
  }
  console.info(`[Vidu] ${message}`, safe);
}

function maskApiKey(): string {
  const key = process.env.VIDU_API_KEY?.trim() ?? "";
  if (key.length <= 6) {
    return "[set]";
  }
  return `…${key.slice(-4)}`;
}

function mapViduStateToLifecycle(state: string | undefined): VideoJobLifecycleStatus {
  const s = (state ?? "").toLowerCase();
  if (s === "created" || s === "queueing" || s === "queued" || s === "submitted" || s === "pending") {
    return "queued";
  }
  if (s === "processing" || s === "running" || s === "generating") {
    return "generating";
  }
  if (s === "success" || s === "completed" || s === "finished") {
    return "completed";
  }
  if (s === "failed" || s === "error" || s === "cancelled" || s === "canceled") {
    return "failed";
  }
  return "generating";
}

function progressForState(lifecycle: VideoJobLifecycleStatus, previous?: number): number {
  if (lifecycle === "queued") {
    return 5;
  }
  if (lifecycle === "generating") {
    if (typeof previous === "number" && previous >= 10 && previous < 95) {
      return previous;
    }
    return 50;
  }
  if (lifecycle === "completed") {
    return 100;
  }
  return 0;
}

function extractVideoUrlFromCreations(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const record = body as Record<string, unknown>;
  const creations = record.creations;
  if (!Array.isArray(creations) || creations.length === 0) {
    return undefined;
  }
  const first = creations[0];
  if (!first || typeof first !== "object") {
    return undefined;
  }
  const url = (first as Record<string, unknown>).url;
  return typeof url === "string" && url.trim() ? url.trim() : undefined;
}

function extractErrMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const record = body as Record<string, unknown>;
  const candidates = [
    record.message,
    record.error,
    record.err_msg,
    record.err_message,
    record.detail,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      return c.trim();
    }
  }
  if (typeof record.err_code === "string" && record.err_code.trim()) {
    return `Vidu error code: ${record.err_code.trim()}`;
  }
  return undefined;
}

async function viduRequestJson(
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  assertViduApiKeyPresent();
  const base = viduBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Authorization: `Token ${process.env.VIDU_API_KEY!.trim()}`,
  };
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }

  viduDebug("request", {
    method,
    endpoint: url,
    apiKeyTail: maskApiKey(),
    hasBody: Boolean(body),
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Network error";
    throw new Error(`Vidu request failed (${method} ${path}): ${message}`);
  }

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  viduDebug("response", {
    endpoint: url,
    httpStatus: response.status,
    taskId:
      json && typeof json === "object" && "task_id" in json
        ? String((json as Record<string, unknown>).task_id)
        : undefined,
    state:
      json && typeof json === "object" && "state" in json
        ? String((json as Record<string, unknown>).state)
        : undefined,
  });

  return { ok: response.ok, status: response.status, json, text };
}

export class ViduVideoProvider implements VideoProvider {
  async createStartEndVideoJob(
    input: CreateStartEndVideoJobInput
  ): Promise<CreateStartEndVideoJobResult> {
    assertViduRealCallsEnabled();
    assertViduApiKeyPresent();

    const startUrl = resolvePublicImageUrlForVidu(input.startImageUrl, "start");
    const endUrl = resolvePublicImageUrlForVidu(input.endImageUrl, "end");

    const model = resolveViduModelForJob(input.providerModel ?? null);
    const resolution = resolveViduResolutionForJob(input.providerResolution ?? null);
    const duration = resolveViduDurationSecondsForJob(
      input.providerDurationSeconds ?? null
    );

    /** Caller (job service) always sends combined preset + optional user prompt. */
    const prompt =
      input.prompt?.trim() ||
      "Smooth cinematic transition between the two frames, natural motion, no harsh cuts.";

    const payload = {
      model,
      images: [startUrl, endUrl],
      prompt,
      duration,
      resolution,
      audio: false,
      off_peak: false,
    };

    const { ok, status, json, text } = await viduRequestJson(
      "POST",
      "/ent/v2/start-end2video",
      payload
    );

    if (!ok) {
      const msg =
        extractErrMessage(json) ??
        (text.length > 0 && text.length < 2000 ? text : `HTTP ${status}`);
      throw new Error(`Vidu start-end2video failed (${status}): ${msg}`);
    }

    const body = json as Record<string, unknown> | null;
    const taskId =
      typeof body?.task_id === "string"
        ? body.task_id
        : typeof body?.id === "string"
          ? body.id
          : undefined;

    if (!taskId?.trim()) {
      throw new Error(
        "Vidu response missing task_id. Check API version / response shape (see Vidu docs: start-end-to-video)."
      );
    }

    const rawState = typeof body?.state === "string" ? body.state : "created";
    const lifecycle = mapViduStateToLifecycle(rawState);

    viduDebug("create mapped", {
      providerJobId: taskId,
      rawState,
      mappedStatus: lifecycle,
    });

    if (lifecycle === "failed") {
      const err =
        extractErrMessage(json) ?? "Vidu task reported failed state immediately after create.";
      throw new Error(err);
    }

    return {
      providerJobId: taskId.trim(),
      status: lifecycle,
      providerKey: "vidu",
    };
  }

  async getVideoJobStatus(providerJobId: string): Promise<VideoJobStatusResult> {
    if (!isViduRealCallsEnabled()) {
      return {
        status: "failed",
        progress: 0,
        errorMessage:
          "VIDU_ENABLE_REAL_CALLS must be true to poll real Vidu jobs. Enable it or switch ANIMATION_PROVIDER=mock.",
      };
    }
    assertViduApiKeyPresent();

    const path = `/ent/v2/tasks/${encodeURIComponent(providerJobId)}/creations`;
    const { ok, status, json, text } = await viduRequestJson("GET", path);

    if (status === 404) {
      return {
        status: "failed",
        progress: 0,
        errorMessage: "Vidu task not found (404). The task id may be invalid or expired.",
      };
    }

    if (status === 401 || status === 403) {
      return {
        status: "failed",
        progress: 0,
        errorMessage: `Vidu API unauthorized (${status}). Check VIDU_API_KEY.`,
      };
    }

    if (!ok) {
      if (status >= 500 || status === 429) {
        throw new Error(`Vidu poll temporary error: HTTP ${status}`);
      }
      const msg =
        extractErrMessage(json) ??
        (text.length > 0 && text.length < 2000 ? text : `HTTP ${status}`);
      throw new Error(`Vidu poll failed (${status}): ${msg}`);
    }

    const body = json as Record<string, unknown> | null;
    const rawState = typeof body?.state === "string" ? body.state : undefined;
    const lifecycle = mapViduStateToLifecycle(rawState);

    const errMsg =
      lifecycle === "failed"
        ? extractErrMessage(json) ??
          (typeof body?.err_code === "string" && body.err_code
            ? `Vidu err_code: ${body.err_code}`
            : "Vidu task failed.")
        : undefined;

    const videoUrl = lifecycle === "completed" ? extractVideoUrlFromCreations(json) : undefined;

    if (lifecycle === "completed" && !videoUrl) {
      return {
        status: "failed",
        progress: 0,
        errorMessage:
          "Vidu reported success but no video URL was found in creations[].url. Response shape may have changed — confirm Get Creation API docs.",
      };
    }

    const mapped: VideoJobStatusResult = {
      status: lifecycle,
      progress: progressForState(lifecycle),
      outputVideoUrl: videoUrl,
      errorMessage: errMsg,
    };

    viduDebug("poll mapped", {
      providerJobId,
      rawState,
      mappedStatus: mapped.status,
      progress: mapped.progress,
      hasVideoUrl: Boolean(mapped.outputVideoUrl),
    });

    return mapped;
  }
}
