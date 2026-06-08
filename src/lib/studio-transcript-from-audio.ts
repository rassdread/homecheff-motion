import {
  buildSrtFromSubtitleEntries,
  buildSubtitleEntriesFromTranscriptWords,
} from "@/lib/studio-subtitle-track";
import { selectSttProvider, type SttProviderId } from "@/server/studio/speech/stt-provider";
import { prisma } from "@/lib/prisma";
import { meterElevenLabsStt } from "@/server/provider-cost/studio-cost-metering";
import type { SubtitleTrackEntry } from "@/types/studio-voice-execution";

export type TranscriptFromAudioResult = {
  subtitleTrackId: string;
  language: string;
  lineCount: number;
  durationSeconds: number;
  provider: string;
  entries: SubtitleTrackEntry[];
  srt: string;
};

export async function transcribeAudioUrlToSubtitleTrack(params: {
  storyboardId: string;
  language: string;
  audioUrl: string;
  durationHintSeconds?: number;
  fallbackScript?: string;
  forceProvider?: SttProviderId;
  ownerId?: string;
}): Promise<TranscriptFromAudioResult> {
  const provider = selectSttProvider(params.forceProvider);
  const transcript = await provider.transcribe({
    audioUrl: params.audioUrl,
    languageCode: params.language,
    fallbackScript: params.fallbackScript,
    expectedDurationSeconds: params.durationHintSeconds,
  });

  const entries = buildSubtitleEntriesFromTranscriptWords(transcript.words);
  if (entries.length === 0 && transcript.text.trim()) {
    entries.push({
      start: 0,
      end: Math.max(0.5, transcript.durationSeconds),
      text: transcript.text.trim(),
    });
  }

  if (params.ownerId) {
    meterElevenLabsStt({
      ctx: {
        userId: params.ownerId,
        storyboardId: params.storyboardId,
        feature: "voice_transcribe",
      },
      status: "completed",
      providerId: provider.id,
      durationSeconds: transcript.durationSeconds,
      modelId: transcript.modelId,
    });
  }

  const track = await prisma.studioStoryboardSubtitleTrack.upsert({
    where: {
      storyboardId_language: { storyboardId: params.storyboardId, language: params.language },
    },
    create: {
      storyboardId: params.storyboardId,
      language: params.language,
      status: "ready",
      entriesJson: entries,
    },
    update: {
      entriesJson: entries,
      status: "ready",
    },
  });

  return {
    subtitleTrackId: track.id,
    language: params.language,
    lineCount: entries.length,
    durationSeconds: transcript.durationSeconds,
    provider: provider.id,
    entries,
    srt: buildSrtFromSubtitleEntries(entries),
  };
}
