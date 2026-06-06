"use client";

import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { fetchStoryboardVoiceBundle } from "@/lib/studio-voice-client";
import {
  resolveStoryboardTranscriptStatus,
  transcriptStatusLabelKey,
} from "@/lib/studio-subtitle-readiness";

type Props = {
  storyboardId: string;
  voiceEnabled: boolean;
  language: string;
  compact?: boolean;
};

export function StudioTranscriptStatusLine({
  storyboardId,
  voiceEnabled,
  language,
  compact = false,
}: Props) {
  const t = useActiveTranslator();
  const [status, setStatus] = useState(() =>
    resolveStoryboardTranscriptStatus({ voiceEnabled, subtitleEntries: [] })
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!voiceEnabled) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetchStoryboardVoiceBundle(storyboardId);
      if (cancelled) {
        return;
      }
      if (res.ok) {
        const lang = language.slice(0, 2);
        const voice =
          res.data.voices.find((v) => v.language === lang && v.status === "completed") ??
          (res.data.voice?.status === "completed" ? res.data.voice : null);
        setStatus(
          resolveStoryboardTranscriptStatus({
            voiceEnabled,
            audioUrl: voice?.audioUrl,
            audioDurationSeconds: voice?.durationSeconds,
            subtitleEntries: res.data.subtitle?.entries,
          })
        );
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [language, storyboardId, voiceEnabled]);

  if (!voiceEnabled) {
    return null;
  }

  if (!loaded) {
    return null;
  }

  const icon = status.ready ? "✓" : "⚠";

  if (compact) {
    return (
      <span className={status.ready ? "text-emerald-700" : "text-amber-700"}>
        {icon} {t(transcriptStatusLabelKey(status) as never)}
      </span>
    );
  }

  return (
    <p className={`text-sm ${status.ready ? "text-emerald-800" : "text-amber-800"}`}>
      {t("studio.transcript.directorLabel")}: {icon}{" "}
      {t(transcriptStatusLabelKey(status) as never)}
    </p>
  );
}
