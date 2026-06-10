import type { Sam2Availability } from "@/lib/editor-sam2-segmentation";

export type Sam2HealthState = "ONLINE" | "OFFLINE" | "DEGRADED";

export type Sam2ProductionConfig = {
  maxImageDimension: number;
  requestTimeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  healthCheckTimeoutMs: number;
};

export const DEFAULT_SAM2_PRODUCTION_CONFIG: Sam2ProductionConfig = {
  maxImageDimension: 2048,
  requestTimeoutMs: 60_000,
  maxRetries: 2,
  retryDelayMs: 750,
  healthCheckTimeoutMs: 5_000,
};

export type Sam2ProductionStatus = Sam2Availability & {
  health: Sam2HealthState;
  lastHealthCheckAt?: string;
  lastError?: string;
  averageLatencyMs?: number;
  recentFailureRate?: number;
};

let lastHealthCheck: {
  at: string;
  health: Sam2HealthState;
  error?: string;
  latencyMs?: number;
} | null = null;

const recentLatencies: number[] = [];
const recentOutcomes: boolean[] = [];

export function recordSam2RequestOutcome(success: boolean, latencyMs: number): void {
  recentOutcomes.push(success);
  if (recentOutcomes.length > 20) {
    recentOutcomes.shift();
  }
  if (success) {
    recentLatencies.push(latencyMs);
    if (recentLatencies.length > 20) {
      recentLatencies.shift();
    }
  }
}

function average(nums: number[]): number | undefined {
  if (nums.length === 0) {
    return undefined;
  }
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function resolveSam2HealthState(
  availability: Sam2Availability,
  options?: { recentFailureRate?: number }
): Sam2HealthState {
  if (!availability.endpointConfigured || !availability.available) {
    return "OFFLINE";
  }
  const failureRate = options?.recentFailureRate ?? 0;
  if (failureRate >= 0.5) {
    return "DEGRADED";
  }
  return "ONLINE";
}

export function buildSam2ProductionStatus(availability: Sam2Availability): Sam2ProductionStatus {
  const recentFailureRate =
    recentOutcomes.length > 0
      ? recentOutcomes.filter((o) => !o).length / recentOutcomes.length
      : 0;
  const health = resolveSam2HealthState(availability, { recentFailureRate });

  return {
    ...availability,
    health,
    lastHealthCheckAt: lastHealthCheck?.at,
    lastError: lastHealthCheck?.error,
    averageLatencyMs: average(recentLatencies),
    recentFailureRate,
  };
}

export async function probeSam2EndpointHealth(
  endpoint: string,
  config: Sam2ProductionConfig = DEFAULT_SAM2_PRODUCTION_CONFIG
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = Date.now();
  try {
    const res = await fetch(endpoint.replace(/\/$/, "") + "/health", {
      method: "GET",
      signal: AbortSignal.timeout(config.healthCheckTimeoutMs),
      cache: "no-store",
    });
    const latencyMs = Date.now() - started;
    if (res.ok) {
      return { ok: true, latencyMs };
    }
    return { ok: false, latencyMs, error: `Health check HTTP ${res.status}` };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Health check failed",
    };
  }
}

export async function runSam2HealthCheck(
  endpoint: string,
  availability: Sam2Availability,
  config: Sam2ProductionConfig = DEFAULT_SAM2_PRODUCTION_CONFIG
): Promise<Sam2ProductionStatus> {
  if (!availability.endpointConfigured) {
    lastHealthCheck = {
      at: new Date().toISOString(),
      health: "OFFLINE",
      error: "SAM2_SEGMENTATION_URL missing",
    };
    return buildSam2ProductionStatus(availability);
  }

  const probe = await probeSam2EndpointHealth(endpoint, config);
  const health: Sam2HealthState = probe.ok ? "ONLINE" : "DEGRADED";
  lastHealthCheck = {
    at: new Date().toISOString(),
    health: probe.ok ? "ONLINE" : "DEGRADED",
    error: probe.error,
    latencyMs: probe.latencyMs,
  };

  return buildSam2ProductionStatus(availability);
}

export async function withSam2Retry<T>(
  fn: () => Promise<T>,
  config: Sam2ProductionConfig = DEFAULT_SAM2_PRODUCTION_CONFIG
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < config.maxRetries) {
        await new Promise((r) => setTimeout(r, config.retryDelayMs * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function resizeImageBufferForSam2(
  buffer: Buffer,
  maxDimension: number = DEFAULT_SAM2_PRODUCTION_CONFIG.maxImageDimension
): Promise<{ buffer: Buffer; width: number; height: number; scaled: boolean }> {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;
  const longest = Math.max(width, height);

  if (longest <= maxDimension) {
    return { buffer, width, height, scaled: false };
  }

  const scale = maxDimension / longest;
  const resized = await sharp(buffer)
    .resize(Math.round(width * scale), Math.round(height * scale), { fit: "inside" })
    .png()
    .toBuffer();
  const resizedMeta = await sharp(resized).metadata();
  return {
    buffer: resized,
    width: resizedMeta.width ?? Math.round(width * scale),
    height: resizedMeta.height ?? Math.round(height * scale),
    scaled: true,
  };
}

/** Queue-safe: serialize concurrent SAM2 calls per process. */
let sam2Queue: Promise<unknown> = Promise.resolve();

export function enqueueSam2Request<T>(fn: () => Promise<T>): Promise<T> {
  const run = sam2Queue.then(fn, fn);
  sam2Queue = run.catch(() => undefined);
  return run;
}
