const REPLICATE_API_BASE = "https://api.replicate.com/v1";

export const REPLICATE_SAM3_MODEL_OWNER = "yodagg";
export const REPLICATE_SAM3_MODEL_NAME = "sam3-image-seg";
export const REPLICATE_SAM3_MODEL_ID = `${REPLICATE_SAM3_MODEL_OWNER}/${REPLICATE_SAM3_MODEL_NAME}`;

/** Published estimate for yodagg/sam3-image-seg (~$0.01/run). */
export const REPLICATE_SAM3_ESTIMATED_COST_USD = 0.01;

export type ReplicateAccount = {
  type?: string;
  username?: string;
};

export type ReplicateModelInfo = {
  name: string;
  latestVersionId: string | null;
};

export type ReplicatePrediction = {
  id: string;
  status: string;
  error: string | null;
  output: unknown;
  metrics?: { predict_time?: number };
  created_at?: string;
  started_at?: string;
  completed_at?: string;
};

export function isReplicateConfigured(): boolean {
  return Boolean(process.env.REPLICATE_API_TOKEN?.trim());
}

export function getReplicateToken(): string | null {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  return token || null;
}

export function toHumanReplicateError(status: number, body: unknown): string {
  const detail =
    typeof body === "object" && body !== null && "detail" in body
      ? String((body as { detail?: unknown }).detail ?? "")
      : "";

  if (status === 401 || status === 403) {
    return "Replicate is not configured.";
  }
  if (status === 402) {
    return "Billing may not be configured.";
  }
  if (status === 404) {
    return "Model unavailable.";
  }
  if (status === 422) {
    return "Replicate could not process this image.";
  }
  if (status === 429) {
    if (/credit|billing|payment/i.test(detail)) {
      return "Billing may not be configured.";
    }
    return "Replicate is busy. Try again in a moment.";
  }
  if (detail) {
    return detail.length > 200 ? `${detail.slice(0, 200)}…` : detail;
  }
  return "Replicate request failed.";
}

async function replicateFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getReplicateToken();
  if (!token) {
    return new Response(JSON.stringify({ detail: "Missing token" }), { status: 401 });
  }
  return fetch(`${REPLICATE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

export async function fetchReplicateAccount(): Promise<{
  ok: boolean;
  account: ReplicateAccount | null;
  error: string | null;
}> {
  if (!isReplicateConfigured()) {
    return { ok: false, account: null, error: "Replicate is not configured" };
  }
  const res = await replicateFetch("/account");
  const body = (await res.json().catch(() => ({}))) as ReplicateAccount & { detail?: string };
  if (!res.ok) {
    return {
      ok: false,
      account: null,
      error: toHumanReplicateError(res.status, body),
    };
  }
  return { ok: true, account: body, error: null };
}

let cachedModelInfo: { fetchedAt: number; info: ReplicateModelInfo } | null = null;

export async function fetchReplicateSam3Model(): Promise<{
  ok: boolean;
  model: ReplicateModelInfo | null;
  error: string | null;
}> {
  if (!isReplicateConfigured()) {
    return { ok: false, model: null, error: "Replicate is not configured" };
  }

  const now = Date.now();
  if (cachedModelInfo && now - cachedModelInfo.fetchedAt < 5 * 60 * 1000) {
    return { ok: true, model: cachedModelInfo.info, error: null };
  }

  const res = await replicateFetch(`/models/${REPLICATE_SAM3_MODEL_ID}`);
  const body = (await res.json().catch(() => ({}))) as {
    name?: string;
    latest_version?: { id?: string };
    detail?: string;
  };
  if (!res.ok) {
    return {
      ok: false,
      model: null,
      error: toHumanReplicateError(res.status, body),
    };
  }

  const info: ReplicateModelInfo = {
    name: body.name ?? REPLICATE_SAM3_MODEL_NAME,
    latestVersionId: body.latest_version?.id ?? null,
  };
  cachedModelInfo = { fetchedAt: now, info };
  return { ok: true, model: info, error: null };
}

export async function createReplicatePrediction(params: {
  version: string;
  input: Record<string, unknown>;
}): Promise<{ ok: true; prediction: ReplicatePrediction } | { ok: false; error: string; status: number }> {
  if (!isReplicateConfigured()) {
    return { ok: false, error: "Replicate is not configured", status: 401 };
  }

  const res = await replicateFetch("/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version: params.version, input: params.input }),
  });
  const body = (await res.json().catch(() => ({}))) as ReplicatePrediction & { detail?: string };
  if (!res.ok) {
    return {
      ok: false,
      error: toHumanReplicateError(res.status, body),
      status: res.status,
    };
  }
  return { ok: true, prediction: body };
}

export async function getReplicatePrediction(id: string): Promise<ReplicatePrediction | null> {
  const res = await replicateFetch(`/predictions/${id}`);
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as ReplicatePrediction;
}

export type ReplicatePredictionResult =
  | { ok: true; prediction: ReplicatePrediction }
  | { ok: false; error: string };

export async function waitForReplicatePrediction(
  id: string,
  options?: { timeoutMs?: number; pollIntervalMs?: number }
): Promise<ReplicatePredictionResult> {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const pollIntervalMs = options?.pollIntervalMs ?? 2_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const prediction = await getReplicatePrediction(id);
    if (!prediction) {
      return { ok: false, error: "Replicate could not process this image." };
    }
    if (prediction.status === "succeeded") {
      return { ok: true, prediction };
    }
    if (prediction.status === "failed" || prediction.status === "canceled") {
      return {
        ok: false,
        error: prediction.error?.trim() || "Replicate could not process this image.",
      };
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return {
    ok: false,
    error: "Replicate timed out. The model may still be starting — try again.",
  };
}
