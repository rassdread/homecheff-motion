import { getExternalMergeApiKey } from "@/server/animation-export/export-config";

export type ExternalMergeTransitionInput = {
  transitionId: string;
  order: number;
  outputVideoUrl: string;
};

export type StartExternalMergeJobInput = {
  projectId: string;
  transitionVideos: ExternalMergeTransitionInput[];
  outputFilename?: string;
  /** Max output width (px); worker scales down only. From project `viduResolution`. */
  exportMaxWidth?: number;
};

export type ExternalMergeRemoteStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | string;

export type ExternalMergeJobSnapshot = {
  jobId: string;
  status: ExternalMergeRemoteStatus;
  progress: number;
  outputVideoUrl: string | null;
  errorMessage: string | null;
};

function externalMergeBaseUrl(): string {
  const raw = process.env.EXTERNAL_MERGE_API_URL?.trim();
  if (!raw) {
    throw new Error("EXTERNAL_MERGE_API_URL is not set.");
  }
  return raw.replace(/\/+$/, "");
}

function mergeRequestHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = getExternalMergeApiKey();
  if (key) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

function coerceProgress(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(n)));
}

function normalizeStatus(value: unknown): ExternalMergeRemoteStatus {
  if (typeof value !== "string" || !value.trim()) {
    return "queued";
  }
  const s = value.trim().toLowerCase();
  if (s === "queued" || s === "processing" || s === "completed" || s === "failed") {
    return s;
  }
  return s;
}

function parseMergeJobPayload(json: unknown, requireJobId: boolean): ExternalMergeJobSnapshot {
  if (!json || typeof json !== "object") {
    throw new Error("Merge API returned a non-object JSON body.");
  }
  const o = json as Record<string, unknown>;
  const jobIdRaw = o.jobId;
  if (typeof jobIdRaw !== "string" || !jobIdRaw.trim()) {
    if (requireJobId) {
      throw new Error('Merge API response missing string "jobId".');
    }
  }
  const jobId = typeof jobIdRaw === "string" ? jobIdRaw.trim() : "";
  const status = normalizeStatus(o.status);
  const progress = coerceProgress(o.progress);
  const outputVideoUrl =
    o.outputVideoUrl === null || o.outputVideoUrl === undefined
      ? null
      : typeof o.outputVideoUrl === "string"
        ? o.outputVideoUrl.trim() || null
        : null;
  const errorMessage =
    o.errorMessage === null || o.errorMessage === undefined
      ? null
      : typeof o.errorMessage === "string"
        ? o.errorMessage.trim() || null
        : null;

  return {
    jobId,
    status,
    progress,
    outputVideoUrl,
    errorMessage,
  };
}

async function readJsonResponse(response: Response, context: string): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`${context}: empty response body (HTTP ${response.status}).`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      `${context}: invalid JSON (HTTP ${response.status}). Body starts with: ${text.slice(0, 200)}`
    );
  }
}

export async function startExternalMergeJob(
  input: StartExternalMergeJobInput
): Promise<ExternalMergeJobSnapshot> {
  const base = externalMergeBaseUrl();
  const url = `${base}/merge`;
  const body: Record<string, unknown> = {
    projectId: input.projectId,
    videos: input.transitionVideos.map((v) => ({
      id: v.transitionId,
      order: v.order,
      url: v.outputVideoUrl.trim(),
    })),
    outputFilename: input.outputFilename ?? "final.mp4",
  };
  if (input.exportMaxWidth !== undefined && Number.isFinite(input.exportMaxWidth)) {
    body.exportMaxWidth = Math.round(input.exportMaxWidth);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: mergeRequestHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : "Network error";
    throw new Error(`External merge start failed: ${msg}`);
  }

  const json = await readJsonResponse(response, "External merge POST /merge");
  if (!response.ok) {
    const snap = parseMergeJobPayload(json, false);
    const detail = snap.errorMessage ?? JSON.stringify(json).slice(0, 500);
    throw new Error(`External merge start HTTP ${response.status}: ${detail}`);
  }

  return parseMergeJobPayload(json, true);
}

export async function pollExternalMergeJob(jobId: string): Promise<ExternalMergeJobSnapshot> {
  const id = jobId.trim();
  if (!id) {
    throw new Error("pollExternalMergeJob: jobId is empty.");
  }
  const base = externalMergeBaseUrl();
  const url = `${base}/merge/${encodeURIComponent(id)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: mergeRequestHeaders(),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : "Network error";
    throw new Error(`External merge poll failed: ${msg}`);
  }

  const json = await readJsonResponse(response, `External merge GET /merge/${id}`);
  if (!response.ok) {
    const snap = parseMergeJobPayload(json, false);
    const detail = snap.errorMessage ?? JSON.stringify(json).slice(0, 500);
    throw new Error(`External merge poll HTTP ${response.status}: ${detail}`);
  }

  return parseMergeJobPayload(json, true);
}
