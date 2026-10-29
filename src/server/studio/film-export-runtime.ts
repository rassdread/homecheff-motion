/**
 * Production video encoding does not run inside the Vercel function.
 * The live project sets VIDEO_RENDER_MODE=worker and delegates FFmpeg
 * to the existing video worker. Local certification keeps the direct
 * FFmpeg path because it does not set VERCEL.
 */
export type FilmExportRuntime = "local_ffmpeg" | "external_worker";

export function resolveFilmExportRuntime(env: NodeJS.ProcessEnv = process.env): FilmExportRuntime {
  const onVercel = Boolean(env.VERCEL?.trim() || env.VERCEL_ENV?.trim());
  const worker = env.VIDEO_RENDER_MODE?.trim().toLowerCase() === "worker";
  if (onVercel && worker) return "external_worker";
  return "local_ffmpeg";
}
