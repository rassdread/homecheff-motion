import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { withStudioCreditGate } from "@/server/studio-account/with-studio-credit-gate";
import { selectVoiceProvider } from "@/server/studio/voice/voice-provider";
import { buildVoiceRequest } from "@/lib/elevenlabs-voice";
import { uploadStoryboardVoiceAudio } from "@/server/studio/studio-voice-blob";
import { listSelectableFreeMusicTracks } from "@/lib/free-music/registry";
import { freeMusicCategoryForMood } from "@/lib/simple-studio/intent-routing";
import type { SimpleStudioMusicMood } from "@/lib/simple-studio/creative-plan";
import { resolvePublicBlobUrlByPathname } from "@/lib/vercel-blob-config";

/**
 * Prepare real voice (+ optional free-music URL) for Simple Studio export mux.
 * Uses existing TTS provider + free music catalog — no fake lipsync.
 */
export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  let body: {
    script?: string;
    language?: string;
    voiceProfile?: string;
    musicMood?: SimpleStudioMusicMood;
    musicRequired?: boolean;
    projectId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_BODY" }, { status: 400 });
  }

  const script = body.script?.trim() ?? "";
  const musicRequired = body.musicRequired === true && body.musicMood && body.musicMood !== "none";

  let voiceAudioUrl: string | null = null;
  let voiceProvider: string | null = null;
  let musicTrackUrl: string | null = null;
  let musicTrackId: string | null = null;
  let musicLabel: string | null = null;
  let musicSource: "free_catalog" | "none" | "unavailable" = "none";

  if (script.length >= 8) {
    const gated = await withStudioCreditGate({
      user,
      actionType: "voice_generation",
      projectId: body.projectId,
      confirmed: true,
      execute: async () => {
        const language = (body.language ?? "nl").slice(0, 2);
        const profile = body.voiceProfile ?? "warm_narrator";
        const voiceRequest = buildVoiceRequest({
          script,
          voiceLanguage: language,
          voiceProfile: profile,
          narrationMode: "narration",
        });
        const provider = selectVoiceProvider();
        const synthesis = await provider.synthesize({
          request: voiceRequest,
          voiceProfile: profile,
          voiceLanguage: language,
        });
        const uploaded = await uploadStoryboardVoiceAudio({
          ownerId: user.id,
          storyboardId: body.projectId?.trim() || "simple-studio",
          language,
          voiceAssetId: `simple-${Date.now()}`,
          audioBuffer: synthesis.audioBuffer,
          contentType: synthesis.provider === "mock" ? "audio/wav" : "audio/mpeg",
          extension: synthesis.provider === "mock" ? "wav" : "mp3",
        });
        return {
          audioUrl: uploaded.audioUrl,
          provider: synthesis.provider,
        };
      },
    });

    if ("blocked" in gated) return gated.blocked;
    voiceAudioUrl = gated.result.audioUrl;
    voiceProvider = gated.result.provider;
  }

  if (musicRequired) {
    const category = freeMusicCategoryForMood(body.musicMood!);
    const tracks = listSelectableFreeMusicTracks(user.id);
    const preferred =
      tracks.find((t) => (t.category ?? "").toUpperCase() === category) ??
      tracks.find((t) => (t.category ?? "").toUpperCase() === "CHILL") ??
      tracks[0];
    if (preferred?.masterStorageKey) {
      const url = await resolvePublicBlobUrlByPathname(preferred.masterStorageKey);
      if (url) {
        musicTrackUrl = url;
        musicTrackId = preferred.trackId;
        musicLabel = preferred.title;
        musicSource = "free_catalog";
      } else {
        musicSource = "unavailable";
      }
    } else {
      musicSource = tracks.length === 0 ? "unavailable" : "unavailable";
    }
  }

  return NextResponse.json({
    ok: true,
    voiceAudioUrl,
    voiceProvider,
    musicTrackUrl,
    musicTrackId,
    musicLabel,
    musicSource,
    /** Explicit: do not claim lipsync execution. */
    lipsyncExecuted: false,
  });
}
