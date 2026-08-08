"use client";

import { useCallback, useEffect, useState } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useActiveTranslator } from "@/i18n/client";
import { VOICE_GENERATION_DISPLAY_CREDITS } from "@/lib/studio-credit-constants";
import { trackStudioCreativeEvent } from "@/lib/studio-creative-analytics";
import {
  fetchStoryboardVoiceBundle,
  generateStoryboardVoiceApi,
  type StoryboardVoiceAsset,
} from "@/lib/studio-voice-client";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import type { TranslationKey } from "@/i18n";

type Props = {
  storyboardId: string;
  enabled: boolean;
  language: string;
  voiceProfile: string;
  canModify?: boolean;
  onVoiceGenerated?: () => void;
};

export function StudioVoicePreviewPanel({
  storyboardId,
  enabled,
  language,
  voiceProfile,
  canModify,
  onVoiceGenerated,
}: Props) {
  const t = useActiveTranslator();
  const [voice, setVoice] = useState<StoryboardVoiceAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setVoice(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStoryboardVoiceBundle(storyboardId);
      if (res.ok) {
        const match =
          res.data.voices.find((v) => v.language === language.slice(0, 2)) ??
          res.data.voice;
        setVoice(match ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, storyboardId, language]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!enabled) {
        if (!cancelled) {
          setVoice(null);
        }
        return;
      }
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetchStoryboardVoiceBundle(storyboardId);
        if (cancelled) {
          return;
        }
        if (res.ok) {
          const match =
            res.data.voices.find((v) => v.language === language.slice(0, 2)) ??
            res.data.voice;
          setVoice(match ?? null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, storyboardId, language]);

  const handleGenerate = async () => {
    if (!canModify) {
      return;
    }
    setGenerating(true);
    setError(null);
    trackStudioCreativeEvent("GENERATION_STARTED", {
      storyboardId,
      action: "voice_generation",
      tool: "voice",
    });
    try {
      const res = await generateStoryboardVoiceApi(storyboardId, { language });
      if (!res.ok) {
        trackStudioCreativeEvent("GENERATION_FAILED", {
          storyboardId,
          action: "voice_generation",
          tool: "voice",
        });
        setError(
          ("error" in res && typeof res.error === "string" ? res.error : null) ??
            t("studio.common.generationFailed")
        );
        return;
      }
      trackStudioCreativeEvent("GENERATION_SUCCESS", {
        storyboardId,
        action: "voice_generation",
        tool: "voice",
      });
      await refresh();
      onVoiceGenerated?.();
    } finally {
      setGenerating(false);
    }
  };

  if (!enabled) {
    return null;
  }

  const presetLabel = t(getVoiceProfilePreset(voiceProfile).labelKey as TranslationKey);
  const ready = voice?.status === "completed" && Boolean(voice.audioUrl?.trim());

  return (
    <div className="mt-4 rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-4">
      <p className="text-sm font-semibold text-indigo-950">{t("studio.voice.preview.title")}</p>
      {loading ?
        <p className="mt-2 text-xs text-zinc-600">{t("studio.voice.preview.loading")}</p>
      : null}
      {error ?
        <p className="mt-2 text-xs text-red-800">{error}</p>
      : null}
      <dl className="mt-3 grid gap-1 text-xs text-zinc-700 sm:grid-cols-2">
        <div>
          <dt className="font-medium">{t("studio.voice.preview.profile")}</dt>
          <dd>{presetLabel}</dd>
        </div>
        <div>
          <dt className="font-medium">{t("studio.voice.preview.language")}</dt>
          <dd>{language.toUpperCase()}</dd>
        </div>
        <div>
          <dt className="font-medium">{t("studio.voice.preview.provider")}</dt>
          <dd>{voice?.provider ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium">{t("studio.voice.preview.duration")}</dt>
          <dd>
            {ready ?
              `${Math.round(voice!.durationSeconds)}s`
            : "—"}
          </dd>
        </div>
      </dl>
      {ready ?
        <StudioAudioPreviewPlayer
          title={presetLabel}
          audioUrl={voice!.audioUrl}
          durationSeconds={voice!.durationSeconds}
          source="voice_tts"
          showDownload
          className="mt-3 border-indigo-200/70 bg-white"
        />
      : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {canModify ?
          <>
            <button
              type="button"
              disabled={generating}
              onClick={() => void handleGenerate()}
              className="rounded-full bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              data-testid="studio-voice-preview-generate"
            >
              {generating ?
                t("studio.voice.preview.generating")
              : ready ?
                `${t("studio.voice.preview.regenerate")} · ${t("studio.paidAction.credits", { credits: VOICE_GENERATION_DISPLAY_CREDITS })}`
              : `${t("studio.voice.preview.generate")} · ${t("studio.paidAction.credits", { credits: VOICE_GENERATION_DISPLAY_CREDITS })}`}
            </button>
            <p className="w-full text-xs text-zinc-600" data-testid="studio-voice-credit-hint">
              {t("studio.paidAction.beforeGenerate", {
                action: ready ? t("studio.voice.preview.regenerate") : t("studio.voice.preview.generate"),
                credits: VOICE_GENERATION_DISPLAY_CREDITS,
              })}
            </p>
          </>
        : null}
      </div>
    </div>
  );
}
