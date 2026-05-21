import { NextResponse } from "next/server";
import { getVideoToolsRuntimeStatus } from "@/lib/ffmpeg/resolve-ffmpeg-binaries";
import { requireAdmin } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

/** Admin-only ffmpeg/ffprobe binary resolution health. */
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
