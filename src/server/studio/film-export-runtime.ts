/**
 * VIDEO_RENDER_MODE=worker is the existing production switch.
 * It sends film export to the video worker, which is where FFmpeg runs.
 * Local certification leaves the mode unset and keeps direct FFmpeg.
 */
export type FilmExportRuntime = "local_ffmpeg" | "external_worker";

export function resolveFilmExportRuntime(env: NodeJS.ProcessEnv = process.env): FilmExportRuntime {
  const worker = env.VIDEO_RENDER_MODE?.trim().toLowerCase() === "worker";
  return worker ? "external_worker" : "local_ffmpeg";
}
