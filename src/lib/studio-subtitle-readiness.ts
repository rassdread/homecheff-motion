/**
 * Transcript / subtitle track readiness — no new scoring engine.
 */

import type { SubtitleTrackEntry } from "@/types/studio-voice-execution";

export type StoryboardTranscriptStatus = {
  ready: boolean;
  lineCount: number;
  durationSeconds: number | null;
  hasAudio: boolean;
  transcriptReady: boolean;
};

export function resolveStoryboardTranscriptStatus(params: {
  voiceEnabled: boolean;
  hasExternalAudio?: boolean;
  audioUrl?: string | null;
  audioDurationSeconds?: number | null;
  subtitleEntries?: SubtitleTrackEntry[] | null;
}): StoryboardTranscriptStatus {
  const hasAudio = Boolean(params.audioUrl?.trim());
  const entries = params.subtitleEntries ?? [];
  const lineCount = entries.filter((e) => e.text.trim()).length;
  const narrationActive = params.voiceEnabled || Boolean(params.hasExternalAudio);
  const transcriptReady = lineCount > 0;
  const ready = narrationActive && transcriptReady;

  return {
    ready,
    lineCount,
    durationSeconds:
      typeof params.audioDurationSeconds === "number" && Number.isFinite(params.audioDurationSeconds)
        ? params.audioDurationSeconds
        : null,
    hasAudio,
    transcriptReady,
  };
}

export function transcriptStatusLabelKey(status: StoryboardTranscriptStatus): string {
  if (status.transcriptReady) {
    return "studio.transcript.status.ready";
  }
  return "studio.transcript.status.missing";
}

export function audioLinkedStatusLabelKey(status: StoryboardTranscriptStatus): string {
  if (status.hasAudio) {
    return "studio.externalAudio.status.linked";
  }
  return "studio.externalAudio.status.missing";
}

export function subtitleStatusLabelKey(status: StoryboardTranscriptStatus): string {
  if (status.transcriptReady) {
    return "studio.externalAudio.subtitles.created";
  }
  return "studio.externalAudio.subtitles.missing";
}
