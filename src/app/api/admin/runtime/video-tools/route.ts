import { NextResponse } from "next/server";
import { getVideoToolsRuntimeStatus } from "@/lib/ffmpeg/resolve-ffmpeg-binaries";
import { requireAdmin } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

/** Admin-only app ffmpeg/ffprobe paths (env/system). Heavy render runs on worker when VIDEO_RENDER_MODE=worker. */
export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const status = await getVideoToolsRuntimeStatus();
  return NextResponse.json({
    ffmpeg: status.ffmpeg,
    ffprobe: status.ffprobe,
    ffmpegPath: status.ffmpegPath,
    ffprobePath: status.ffprobePath,
    ffmpegExists: status.ffmpegExists,
    ffprobeExists: status.ffprobeExists,
    runtime: status.runtime,
  });
}
