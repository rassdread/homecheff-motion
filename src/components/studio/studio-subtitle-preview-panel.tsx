"use client";

import { useCallback, useEffect, useState } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useActiveTranslator } from "@/i18n/client";
import {
  fetchStoryboardVoiceBundle,
  generateStoryboardTranscriptApi,
  updateStoryboardSubtitlesApi,
} from "@/lib/studio-voice-client";
import {
  resolveStoryboardTranscriptStatus,
  transcriptStatusLabelKey,
} from "@/lib/studio-subtitle-readiness";
import type { SubtitleTrackEntry } from "@/types/studio-voice-execution";

type Props = {
  storyboardId: string;
  enabled: boolean;
  language: string;
  canModify?: boolean;
  onStatusChange?: (ready: boolean) => void;
};

export function StudioSubtitlePreviewPanel({
  storyboardId,
  enabled,
  language,
  canModify,
  onStatusChange,
}: Props) {
  const t = useActiveTranslator();
  const [entries, setEntries] = useState<SubtitleTrackEntry[]>([]);
  const [voiceDuration, setVoiceDuration] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const applyBundle = useCallback(
    (data: Awaited<ReturnType<typeof fetchStoryboardVoiceBundle>>["data"] | null) => {
      if (!data) {
        setEntries([]);
        setHasAudio(false);
        setVoiceDuration(null);
        setAudioUrl(null);
        return;
      }
      const lang = language.slice(0, 2);
      const voice =
        data.voices.find((v) => v.language === lang && v.status === "completed") ??
        (data.voice?.status === "completed" ? data.voice : null);
      const url = voice?.audioUrl?.trim() || null;
      setAudioUrl(url);
      setHasAudio(Boolean(url));
      setVoiceDuration(voice?.durationSeconds ?? null);
      setEntries(data.subtitle?.entries ?? []);
      const status = resolveStoryboardTranscriptStatus({
        voiceEnabled: enabled,
        audioUrl: voice?.audioUrl,
        audioDurationSeconds: voice?.durationSeconds,
        subtitleEntries: data.subtitle?.entries,
      });
      onStatusChange?.(status.ready);
    },
    [enabled, language, onStatusChange]
  );

  const refresh = useCallback(async () => {
    if (!enabled) {
      applyBundle(null);
      setLoaded(true);
      return;
    }
    const res = await fetchStoryboardVoiceBundle(storyboardId);
    if (res.ok) {
      applyBundle(res.data);
    } else {
      applyBundle(null);
    }
    setLoaded(true);
  }, [applyBundle, enabled, storyboardId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!enabled) {
        if (!cancelled) {
          applyBundle(null);
          setLoaded(true);
        }
        return;
      }
      const res = await fetchStoryboardVoiceBundle(storyboardId);
      if (cancelled) {
        return;
      }
      if (res.ok) {
        applyBundle(res.data);
      } else {
        applyBundle(null);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyBundle, enabled, storyboardId]);

  const transcriptStatus = resolveStoryboardTranscriptStatus({
    voiceEnabled: enabled,
    audioUrl: hasAudio ? "ready" : null,
    audioDurationSeconds: voiceDuration,
    subtitleEntries: entries,
  });

  const handleGenerateTranscript = async () => {
    if (!canModify || !hasAudio) {
      return;
    }
    setGenerating(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await generateStoryboardTranscriptApi(storyboardId, {
        language: language.slice(0, 2),
      });
      if (!res.ok || !res.data?.ok) {
        const message =
          res.data && typeof res.data === "object" && "error" in res.data
            ? String((res.data as { error?: string }).error ?? "")
            : "";
        setError(message || t("studio.transcript.error.generic"));
        return;
      }
      if (res.data.entries) {
        setEntries(res.data.entries);
        onStatusChange?.(res.data.entries.length > 0);
      }
      setFeedback(t("studio.transcript.feedback.created"));
      await refresh();
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!canModify) {
      return;
    }
    setSaving(true);
    try {
      await updateStoryboardSubtitlesApi(storyboardId, entries, language);
      setFeedback(t("studio.transcript.feedback.ready"));
    } finally {
      setSaving(false);
    }
  };

  if (!enabled || !loaded) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              {t("studio.transcript.panelTitle")}
            </p>
            <p className="mt-1 text-xs text-zinc-600">{t("studio.transcript.panelHint")}</p>
          </div>
          {canModify && hasAudio ?
            <button
              type="button"
              disabled={generating}
              onClick={() => void handleGenerateTranscript()}
              className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {generating ? t("studio.transcript.generating") : t("studio.transcript.generate")}
            </button>
          : null}
        </div>

        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.transcript.statusLabel")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">
              {t(transcriptStatusLabelKey(transcriptStatus) as never)}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.transcript.durationLabel")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">
              {voiceDuration != null ? `${voiceDuration.toFixed(1)}s` : "—"}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.transcript.linesLabel")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">{transcriptStatus.lineCount}</dd>
          </div>
        </dl>

        {!hasAudio ?
          <p className="mt-3 text-xs text-amber-800">{t("studio.transcript.needAudio")}</p>
        : null}
        {error ?
          <p className="mt-3 text-xs text-red-700">{error}</p>
        : null}
        {feedback ?
          <p className="mt-3 text-xs text-emerald-800">{feedback}</p>
        : null}

        {hasAudio && audioUrl ?
          <StudioAudioPreviewPlayer
            audioUrl={audioUrl}
            durationSeconds={voiceDuration}
            source="subtitle_narration"
            className="mt-4"
          />
        : null}
      </div>

      {entries.length === 0 ?
        <p className="text-xs text-zinc-500">{t("studio.voice.subtitles.empty")}</p>
      : (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm font-semibold text-zinc-900">{t("studio.voice.subtitles.title")}</p>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {entries.map((entry, index) => (
              <li
                key={`${entry.sceneId ?? "row"}-${index}`}
                className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-2 text-xs"
              >
                <p className="font-mono text-[10px] text-zinc-500">
                  {entry.start.toFixed(1)}s → {entry.end.toFixed(1)}s
                </p>
                {canModify ?
                  <textarea
                    value={entry.text}
                    rows={2}
                    className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                    onChange={(e) => {
                      const next = [...entries];
                      next[index] = { ...entry, text: e.target.value };
                      setEntries(next);
                    }}
                  />
                : <p className="mt-1 text-zinc-800">{entry.text}</p>}
              </li>
            ))}
          </ul>
          {canModify ?
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="mt-3 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800"
            >
              {saving ? t("studio.voice.subtitles.saving") : t("studio.voice.subtitles.save")}
            </button>
          : null}
        </div>
      )}
    </div>
  );
}
