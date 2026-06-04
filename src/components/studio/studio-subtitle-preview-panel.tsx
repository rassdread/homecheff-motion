"use client";

import { useCallback, useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  fetchStoryboardVoiceBundle,
  updateStoryboardSubtitlesApi,
} from "@/lib/studio-voice-client";
import type { SubtitleTrackEntry } from "@/types/studio-voice-execution";

type Props = {
  storyboardId: string;
  enabled: boolean;
  language: string;
  canModify?: boolean;
};

export function StudioSubtitlePreviewPanel({
  storyboardId,
  enabled,
  language,
  canModify,
}: Props) {
  const t = useActiveTranslator();
  const [entries, setEntries] = useState<SubtitleTrackEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setEntries([]);
      return;
    }
    const res = await fetchStoryboardVoiceBundle(storyboardId);
    if (res.ok && res.data.subtitle?.entries) {
      setEntries(res.data.subtitle.entries);
    } else {
      setEntries([]);
    }
    setLoaded(true);
  }, [enabled, storyboardId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!enabled) {
        if (!cancelled) {
          setEntries([]);
          setLoaded(true);
        }
        return;
      }
      const res = await fetchStoryboardVoiceBundle(storyboardId);
      if (cancelled) {
        return;
      }
      if (res.ok && res.data.subtitle?.entries) {
        setEntries(res.data.subtitle.entries);
      } else {
        setEntries([]);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, storyboardId]);

  const handleSave = async () => {
    if (!canModify) {
      return;
    }
    setSaving(true);
    try {
      await updateStoryboardSubtitlesApi(storyboardId, entries, language);
    } finally {
      setSaving(false);
    }
  };

  if (!enabled || !loaded) {
    return null;
  }
  if (entries.length === 0) {
    return (
      <p className="mt-3 text-xs text-zinc-500">{t("studio.voice.subtitles.empty")}</p>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
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
  );
}
