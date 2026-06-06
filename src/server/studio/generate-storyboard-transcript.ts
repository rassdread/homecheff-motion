import {
  buildSrtFromSubtitleEntries,
  buildSubtitleEntriesFromTranscriptWords,
} from "@/lib/studio-subtitle-track";
import type { SessionUser } from "@/server/auth/session";
import { getStudioStoryboardById } from "@/server/studio/studio-storyboard-service";
import { selectSttProvider } from "@/server/studio/speech/stt-provider";
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
        "Generate narration audio first, then create a transcript.",
        400
      ),
    };
  }

  const provider = selectSttProvider(params.forceProvider);
  let transcript;
  try {
    transcript = await provider.transcribe({
      audioUrl,
      languageCode: language,
      fallbackScript: storyboard.voiceNarrationScript?.trim() || undefined,
      expectedDurationSeconds: voice.durationSeconds,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcript generation failed.";
    return { error: serviceError("TRANSCRIPT_FAILED", message, 502) };
  }

  const entries = buildSubtitleEntriesFromTranscriptWords(transcript.words);
  if (entries.length === 0 && transcript.text.trim()) {
    entries.push({
      start: 0,
      end: Math.max(0.5, transcript.durationSeconds),
      text: transcript.text.trim(),
    });
  }

  const track = await prisma.studioStoryboardSubtitleTrack.upsert({
    where: { storyboardId_language: { storyboardId: params.storyboardId, language } },
    create: {
      storyboardId: params.storyboardId,
      language,
      status: "ready",
      entriesJson: entries,
    },
    update: {
      entriesJson: entries,
      status: "ready",
    },
  });

  const srt = buildSrtFromSubtitleEntries(entries);

  return {
    ok: true,
    data: {
      subtitleTrackId: track.id,
      language,
      lineCount: entries.length,
      durationSeconds: transcript.durationSeconds,
      provider: provider.id,
      entries,
      srt,
    },
  };
}
