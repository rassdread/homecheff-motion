/** Resolutions accepted across common Vidu models (see Vidu docs per model). */
const RESOLUTIONS = new Set(["360p", "540p", "720p", "1080p"]);

/** Vidu API model ids use `viduq3-turbo` style naming; common env typos are normalized. */
const MODEL_ALIASES: Record<string, string> = {
  "vidu-q3-turbo": "viduq3-turbo",
  "vidu-q3-pro": "viduq3-pro",
  "vidu-q2-turbo": "viduq2-turbo",
  "vidu-q2-pro": "viduq2-pro",
  "vidu-q2-pro-fast": "viduq2-pro-fast",
  "vidu-q1": "viduq1",
  "vidu-q1-classic": "viduq1-classic",
  "vidu2.0": "vidu2.0",
};

export function resolveViduModel(): string {
  const raw = (process.env.VIDU_MODEL ?? "viduq3-turbo").trim();
  const normalized = MODEL_ALIASES[raw.toLowerCase()] ?? raw;
  if (!normalized) {
    throw new Error("VIDU_MODEL is empty.");
  }
  return normalized;
}

export function resolveViduResolution(): string {
  const raw = (process.env.VIDU_RESOLUTION ?? "720p").trim().toLowerCase();
  if (!RESOLUTIONS.has(raw)) {
    throw new Error(
      `VIDU_RESOLUTION must be one of ${[...RESOLUTIONS].join(", ")} (got "${raw}").`
    );
  }
  return raw;
}

export function resolveViduDurationSeconds(): number {
  const raw = process.env.VIDU_DURATION_SECONDS;
  const parsed = raw === undefined || raw === "" ? 5 : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 16) {
    throw new Error("VIDU_DURATION_SECONDS must be an integer between 1 and 16.");
  }
  return parsed;
}

/** Models allowed when project stores an override (validated at project create for role). */
const JOB_OVERRIDE_MODELS = new Set(["viduq3-turbo", "viduq3-pro"]);

export function resolveViduModelForJob(override?: string | null): string {
  if (override?.trim()) {
    const raw = override.trim();
    const normalized = MODEL_ALIASES[raw.toLowerCase()] ?? raw;
    if (!JOB_OVERRIDE_MODELS.has(normalized)) {
      throw new Error(`Unsupported Vidu model for preset job: ${normalized}`);
    }
    return normalized;
  }
  return resolveViduModel();
}

export function resolveViduResolutionForJob(override?: string | null): string {
  if (override?.trim()) {
    const raw = override.trim().toLowerCase();
    if (!RESOLUTIONS.has(raw)) {
      throw new Error(`Invalid resolution for job: ${override}`);
    }
    return raw;
  }
  return resolveViduResolution();
}

export function resolveViduDurationSecondsForJob(override?: number | null): number {
  if (override !== undefined && override !== null) {
    if (!Number.isFinite(override) || override < 1 || override > 16) {
      throw new Error("providerDurationSeconds must be between 1 and 16.");
    }
    return Math.floor(Number(override));
  }
  return resolveViduDurationSeconds();
}

export function viduBaseUrl(): string {
  const raw = (process.env.VIDU_BASE_URL ?? "https://api.vidu.com").trim().replace(/\/$/, "");
  return raw;
}

export function assertViduApiKeyPresent(): void {
  const key = process.env.VIDU_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "VIDU_API_KEY is required when ANIMATION_PROVIDER=vidu. Never commit API keys."
    );
  }
}

export function isViduRealCallsEnabled(): boolean {
  return process.env.VIDU_ENABLE_REAL_CALLS === "true";
}

export function assertViduRealCallsEnabled(): void {
  if (!isViduRealCallsEnabled()) {
    throw new Error("VIDU_ENABLE_REAL_CALLS must be true to start real Vidu jobs.");
  }
}

export function isViduDebug(): boolean {
  return process.env.VIDU_DEBUG === "true" || process.env.VIDU_DEBUG === "1";
}

/**
 * Vidu requires publicly reachable image URLs. Resolves relative paths using
 * PUBLIC_BASE_URL or https://VERCEL_URL when set.
 */
export function resolvePublicImageUrlForVidu(url: string, role: "start" | "end"): string {
  let s = url.trim();
  if (!s) {
    throw new Error(`${role} image URL is empty.`);
  }

  if (s.startsWith("/")) {
    const base =
      process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, "") ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
        : null);
    if (!base) {
      throw new Error(
        `${role} image uses a relative URL (${s}). Set PUBLIC_BASE_URL (e.g. https://your-domain.com) or deploy on Vercel (VERCEL_URL) so images can be resolved to absolute URLs for Vidu.`
      );
    }
    s = `${base}${s}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(s);
  } catch {
    throw new Error(`${role} image URL is not a valid absolute URL: ${url}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${role} image URL must use http(s): ${parsed.href}`);
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local")
  ) {
    throw new Error(
      `${role} image URL (${parsed.host}) is not reachable by Vidu's servers. Use publicly accessible URLs (e.g. Vercel Blob HTTPS URLs), not localhost.`
    );
  }

  return parsed.toString();
}
