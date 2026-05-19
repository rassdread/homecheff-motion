import { NextResponse } from "next/server";
import {
  checkVideoFfmpegCapability,
  toVideoHealthResponse,
  type VideoHealthResponse,
} from "@/lib/video-ffmpeg-capability";
import { fetchWorkerVideoHealth } from "@/lib/video-worker-client";
import { getVideoRenderMode, isVideoRenderWorkerMode } from "@/lib/video-render-mode";

export const dynamic = "force-dynamic";

/** FFmpeg / worker video pipeline health (no secrets). */
export async function GET() {
  const mode = getVideoRenderMode();

  if (isVideoRenderWorkerMode()) {
    const worker = await fetchWorkerVideoHealth();
    const body: VideoHealthResponse & {
      mode: string;
      worker: VideoHealthResponse | null;
    } = {
      mode,
      ok: worker?.ok === true,
      ffmpegPath: null,
      hasDrawtext: worker?.hasDrawtext ?? false,
      fontPath: null,
      fontReadable: worker?.fontReadable ?? false,
      errors: worker?.ok
        ? []
        : worker?.errors?.length
          ? worker.errors
          : ["worker video health check failed"],
      worker: worker
        ? {
            ok: worker.ok,
            ffmpegPath: worker.ffmpegPath,
            hasDrawtext: worker.hasDrawtext,
            fontPath: worker.fontPath,
            fontReadable: worker.fontReadable,
            errors: worker.errors,
          }
        : null,
    };
    return NextResponse.json(body, { status: body.ok ? 200 : 503 });
  }

  const report = await checkVideoFfmpegCapability();
  const body = { ...toVideoHealthResponse(report), mode };
  return NextResponse.json(body, { status: body.ok ? 200 : 503 });
}
