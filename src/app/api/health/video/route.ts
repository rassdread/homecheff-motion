import { NextResponse } from "next/server";
import {
  checkVideoFfmpegCapability,
  toVideoHealthResponse,
} from "@/lib/video-ffmpeg-capability";

export const dynamic = "force-dynamic";

/** Public health probe for FFmpeg drawtext + font readiness (no secrets). */
export async function GET() {
  const report = await checkVideoFfmpegCapability();
  const body = toVideoHealthResponse(report);
  return NextResponse.json(body, { status: body.ok ? 200 : 503 });
}
