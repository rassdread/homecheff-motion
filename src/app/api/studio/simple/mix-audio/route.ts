import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { mixLipsyncSpeechVideoWithMusic } from "@/server/lipsync/mix-lipsync-music";

/**
 * Mix background music onto a true-lipsync MP4 (speech already baked / TTS source).
 * No separate HC charge — optional finishing step after lipsync_talking_avatar.
 *
 * Body: { videoUrl, voiceAudioUrl, musicTrackUrl, projectId, durationSeconds?, musicVolume? }
 */
export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  let body: {
    videoUrl?: string;
    voiceAudioUrl?: string;
    musicTrackUrl?: string;
    projectId?: string;
    durationSeconds?: number;
    musicVolume?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_BODY" }, { status: 400 });
  }

  const videoUrl = body.videoUrl?.trim() ?? "";
  const voiceAudioUrl = body.voiceAudioUrl?.trim() ?? "";
  const musicTrackUrl = body.musicTrackUrl?.trim() ?? "";
  const projectId = body.projectId?.trim() || `simple-${user.id.slice(0, 8)}`;

  if (!videoUrl || !voiceAudioUrl || !musicTrackUrl) {
    return NextResponse.json(
      {
        error: "videoUrl, voiceAudioUrl and musicTrackUrl are required.",
        code: "MEDIA_REQUIRED",
      },
      { status: 400 },
    );
  }

  const result = await mixLipsyncSpeechVideoWithMusic({
    ownerId: user.id,
    projectId,
    videoUrl,
    voiceAudioUrl,
    musicTrackUrl,
    durationSeconds: body.durationSeconds ?? 15,
    musicVolume: body.musicVolume,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code, musicMixFailed: true },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    videoUrl: result.videoUrl,
    musicMixed: true,
  });
}
