/**
 * Transcript / subtitle track readiness — no new scoring engine.
 */

import type { SubtitleTrackEntry } from "@/types/studio-voice-execution";

export type StoryboardTranscriptStatus = {
  ready: boolean;
  lineCount: number;
  durationSeconds: number | null;
  hasAudio: boolean;
};

export function resolveStoryboardTranscriptStatus(params: {
  voiceEnabled: boolean;
  audioUrl?: string | null;
  audioDurationSeconds?: number | null;
  subtitleEntries?: SubtitleTrackEntry[] | null;
}): StoryboardTranscriptStatus {
  const hasAudio = Boolean(params.audioUrl?.trim());
  const entries = params.subtitleEntries ?? [];
  const lineCount = entries.filter((e) => e.text.trim()).length;
  const ready = params.voiceEnabled && lineCount > 0;

  return {
    ready,
    lineCount,
    durationSeconds:
      typeof params.audioDurationSeconds === "number" && Number.isFinite(params.audioDurationSeconds)
        ? params.audioDurationSeconds
        : null,
    hasAudio,
  };
}

export function transcriptStatusLabelKey(status: StoryboardTranscriptStatus): string {
  if (status.ready) {
    return "studio.transcript.status.ready";
  }
  return "studio.transcript.status.missing";
}
