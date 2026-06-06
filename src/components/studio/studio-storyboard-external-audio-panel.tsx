"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { collectStoryboardCharacters } from "@/lib/studio-character-voice";
import {
  isUploadedStoryboardVoice,
  storyboardVoiceDisplayName,
} from "@/lib/studio-storyboard-audio";
import {
  audioLinkedStatusLabelKey,
  resolveStoryboardTranscriptStatus,
  subtitleStatusLabelKey,
  transcriptStatusLabelKey,
} from "@/lib/studio-subtitle-readiness";
import {
  fetchStoryboardVoiceBundle,
  generateStoryboardTranscriptApi,
  linkCharacterVoiceReferenceApi,
  uploadStoryboardExternalAudioApi,
} from "@/lib/studio-voice-client";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  canModify: boolean;
  onStoryboardUpdated?: (storyboard: StudioStoryboardDetail) => void;
  onCharacterUpdated?: (character: StudioCharacterListItem) => void;
};

export function StudioStoryboardExternalAudioPanel({
  storyboard,
  characters,
  canModify,
  onStoryboardUpdated,
  onCharacterUpdated,
}: Props) {
  const t = useActiveTranslator();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const language = (storyboard.voiceLanguage ?? "en").slice(0, 2);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [subtitleReady, setSubtitleReady] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [loaded, setLoaded] = useState(false);

  const storyCharacters = useMemo(() => {
    return collectStoryboardCharacters(storyboard).map(
      (c) => characters.find((lib) => lib.id === c.id) ?? c
    );
  }, [storyboard, characters]);

  const applyBundle = useCallback(
    (data: Awaited<ReturnType<typeof fetchStoryboardVoiceBundle>>["data"] | null) => {
      if (!data) {
        setAudioUrl(null);
        setDisplayName(null);
        setDurationSeconds(null);
        setSubtitleReady(false);
        return;
      }
      const lang = language.slice(0, 2);
      const voice =
        data.voices.find(
          (v) => v.language === lang && v.status === "completed" && isUploadedStoryboardVoice(v)
        ) ?? null;
      setAudioUrl(voice?.audioUrl?.trim() || null);
      setDisplayName(
        voice
          ? storyboardVoiceDisplayName(voice)
          : null
      );
      setDurationSeconds(voice?.durationSeconds ?? null);
      const entries = data.subtitle?.entries ?? [];
      setSubtitleReady(entries.some((e) => e.text.trim()));
    },
    [language]
  );

  const refresh = useCallback(async () => {
    const res = await fetchStoryboardVoiceBundle(storyboard.id);
    if (res.ok) {
      applyBundle(res.data);
    } else {
      applyBundle(null);
    }
    setLoaded(true);
  }, [applyBundle, storyboard.id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchStoryboardVoiceBundle(storyboard.id);
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
  }, [applyBundle, storyboard.id]);

  const status = resolveStoryboardTranscriptStatus({
    voiceEnabled: Boolean(storyboard.voiceEnabled),
    hasExternalAudio: Boolean(audioUrl),
    audioUrl,
    audioDurationSeconds: durationSeconds,
    subtitleEntries: subtitleReady ? [{ start: 0, end: 1, text: "ready" }] : [],
  });

  const handleUpload = async (file: File) => {
    if (!canModify) {
      return;
    }
    setUploading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await uploadStoryboardExternalAudioApi(storyboard.id, file, { language });
      if (!res.ok || !res.data?.ok) {
        const message =
          res.data && typeof res.data === "object" && "error" in res.data
            ? String((res.data as { error?: string }).error ?? "")
            : "";
        setError(message || t("studio.externalAudio.error.upload"));
        return;
      }
      setFeedback(t("studio.externalAudio.feedback.uploaded"));
      if (!storyboard.voiceEnabled) {
        onStoryboardUpdated?.({ ...storyboard, voiceEnabled: true });
      }
      await refresh();
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateTranscript = async () => {
    if (!canModify || !audioUrl) {
      return;
    }
    setGenerating(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await generateStoryboardTranscriptApi(storyboard.id, { language });
      if (!res.ok || !res.data?.ok) {
        const message =
          res.data && typeof res.data === "object" && "error" in res.data
            ? String((res.data as { error?: string }).error ?? "")
            : "";
        setError(message || t("studio.transcript.error.generic"));
        return;
      }
      setFeedback(t("studio.transcript.feedback.created"));
      await refresh();
    } finally {
      setGenerating(false);
    }
  };

  const handleLinkReference = async () => {
    if (!canModify || !audioUrl || !selectedCharacterId) {
      return;
    }
    setLinking(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await linkCharacterVoiceReferenceApi(selectedCharacterId, {
        audioUrl,
        language,
        label: displayName ?? undefined,
      });
      if (!res.ok || !res.data?.character) {
        const message =
          res.data && typeof res.data === "object" && "error" in res.data
            ? String((res.data as { error?: string }).error ?? "")
            : "";
        setError(message || t("studio.externalAudio.error.reference"));
        return;
      }
      setFeedback(t("studio.externalAudio.feedback.referenceLinked"));
      onCharacterUpdated?.(res.data.character);
    } finally {
      setLinking(false);
    }
  };

  if (!loaded) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-sky-200/70 bg-gradient-to-b from-sky-50/50 to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-sky-950">{t("studio.externalAudio.title")}</h3>
          <p className="mt-1 text-xs text-sky-900/80">{t("studio.externalAudio.hint")}</p>
        </div>
        {canModify ?
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleUpload(file);
                }
                event.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {uploading ? t("studio.externalAudio.uploading") : t("studio.externalAudio.upload")}
            </button>
          </>
        : null}
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-sky-100 bg-white/90 px-3 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
            {t("studio.externalAudio.nameLabel")}
          </dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">{displayName ?? "—"}</dd>
        </div>
        <div className="rounded-xl border border-sky-100 bg-white/90 px-3 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
            {t("studio.externalAudio.durationLabel")}
          </dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">
            {durationSeconds != null ? `${durationSeconds.toFixed(1)}s` : "—"}
          </dd>
        </div>
        <div className="rounded-xl border border-sky-100 bg-white/90 px-3 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
            {t("studio.externalAudio.transcriptStatusLabel")}
          </dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">
            {t(transcriptStatusLabelKey(status) as never)}
          </dd>
        </div>
        <div className="rounded-xl border border-sky-100 bg-white/90 px-3 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
            {t("studio.externalAudio.subtitleStatusLabel")}
          </dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">
            {t(subtitleStatusLabelKey(status) as never)}
          </dd>
        </div>
        <div className="rounded-xl border border-sky-100 bg-white/90 px-3 py-2 sm:col-span-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
            {t("studio.externalAudio.audioStatusLabel")}
          </dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">
            {t(audioLinkedStatusLabelKey(status) as never)}
          </dd>
        </div>
      </dl>

      {audioUrl ?
        <audio controls src={audioUrl} className="mt-4 w-full" preload="metadata" />
      : null}

      {canModify && audioUrl ?
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={generating}
            onClick={() => void handleGenerateTranscript()}
            className="rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-950 disabled:opacity-60"
          >
            {generating ? t("studio.transcript.generating") : t("studio.transcript.generate")}
          </button>
        </div>
      : null}

      {canModify && audioUrl && storyCharacters.length > 0 ?
        <div className="mt-4 rounded-xl border border-sky-100 bg-white p-3">
          <p className="text-xs font-semibold text-zinc-800">
            {t("studio.externalAudio.referenceTitle")}
          </p>
          <p className="mt-1 text-xs text-zinc-600">{t("studio.externalAudio.referenceHint")}</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
              <span className="font-medium text-zinc-700">{t("studio.externalAudio.characterLabel")}</span>
              <select
                value={selectedCharacterId}
                onChange={(event) => setSelectedCharacterId(event.target.value)}
                className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              >
                <option value="">{t("studio.externalAudio.selectCharacter")}</option>
                {storyCharacters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={linking || !selectedCharacterId}
              onClick={() => void handleLinkReference()}
              className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {linking
                ? t("studio.externalAudio.linkingReference")
                : t("studio.externalAudio.useAsVoiceReference")}
            </button>
          </div>
        </div>
      : null}

      {error ?
        <p className="mt-3 text-xs text-red-700">{error}</p>
      : null}
      {feedback ?
        <p className="mt-3 text-xs text-emerald-800">{feedback}</p>
      : null}
    </section>
  );
}
