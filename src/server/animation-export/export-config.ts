export type AnimationExportMode = "local" | "external";

function nodeEnvBucket(): "development" | "production" {
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

/**
 * ANIMATION_EXPORT_MODE: "local" | "external"
 * Default: local in development; in production, external if EXTERNAL_MERGE_API_URL is set, else local.
 */
export function resolveAnimationExportMode(): AnimationExportMode {
  const raw = process.env.ANIMATION_EXPORT_MODE?.trim().toLowerCase();
  if (raw === "local") {
    return "local";
  }
  if (raw === "external") {
    return "external";
  }

  const baseUrl = process.env.EXTERNAL_MERGE_API_URL?.trim();
  if (nodeEnvBucket() === "production" && baseUrl) {
    return "external";
  }
  return "local";
}

export function assertExternalMergeConfigured(): void {
  if (resolveAnimationExportMode() !== "external") {
    return;
  }
  if (!process.env.EXTERNAL_MERGE_API_URL?.trim()) {
    throw new Error(
      "ANIMATION_EXPORT_MODE is external but EXTERNAL_MERGE_API_URL is not set. Configure the merge worker base URL or set ANIMATION_EXPORT_MODE=local."
    );
  }
  if (nodeEnvBucket() === "production" && !process.env.MOTION_WORKER_SECRET?.trim()) {
    throw new Error(
      "External export in production requires MOTION_WORKER_SECRET so the merge worker can call back securely. Set the same value on Vercel and Railway."
    );
  }
}

export function getExternalMergeApiKey(): string | undefined {
  const k = process.env.EXTERNAL_MERGE_API_KEY?.trim();
  return k || undefined;
}
