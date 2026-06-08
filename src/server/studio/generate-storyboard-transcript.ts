import { transcribeAudioUrlToSubtitleTrack } from "@/lib/studio-transcript-from-audio";
import type { SessionUser } from "@/server/auth/session";
import { getStudioStoryboardById } from "@/server/studio/studio-storyboard-service";
import { prisma } from "@/lib/prisma";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";
import type { SubtitleTrackEntry } from "@/types/studio-voice-execution";
import { isStudioVoiceExecutionLanguage } from "@/types/studio-voice-execution";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export type GenerateStoryboardTranscriptResult = {
  subtitleTrackId: string;
  language: string;
  lineCount: number;
  durationSeconds: number;
  provider: string;
  entries: SubtitleTrackEntry[];
  srt: string;
};

export async function generateStoryboardTranscript(params: {
  storyboardId: string;
  viewer: Pick<SessionUser, "id" | "role">;
  language?: string;
  forceProvider?: "mock" | "elevenlabs";
}): Promise<{ ok: true; data: GenerateStoryboardTranscriptResult } | { error: ServiceError }> {
  const storyboard = await getStudioStoryboardById(params.storyboardId, params.viewer);
  if (!storyboard) {
    return { error: serviceError("NOT_FOUND", "Storyboard not found.", 404) };
  }
  if (storyboard.ownerId !== params.viewer.id && params.viewer.role !== "admin") {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const languageRaw = (params.language ?? storyboard.voiceLanguage ?? "en").trim().toLowerCase().slice(0, 2);
  const language = isStudioVoiceExecutionLanguage(languageRaw) ? languageRaw : "en";

  const voice = await prisma.studioStoryboardVoice.findUnique({
    where: { storyboardId_language: { storyboardId: params.storyboardId, language } },
  });

  const audioUrl = voice?.audioUrl?.trim();
  if (!voice || voice.status !== "completed" || !audioUrl) {
    return {
      error: serviceError(
        "NO_AUDIO",
        "Upload audio or generate narration first, then create a transcript.",
        400
      ),
    };
  }

  try {
    const result = await transcribeAudioUrlToSubtitleTrack({
      storyboardId: params.storyboardId,
      language,
      audioUrl,
      durationHintSeconds: voice.durationSeconds,
      fallbackScript: storyboard.voiceNarrationScript?.trim() || undefined,
      forceProvider: params.forceProvider,
      ownerId: params.viewer.id,
    });
    return { ok: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcript generation failed.";
    return { error: serviceError("TRANSCRIPT_FAILED", message, 502) };
  }
}
