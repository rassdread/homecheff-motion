"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useActiveTranslator } from "@/i18n/client";
import {
  audioMixStatusLabelKey,
  resolveStoryboardAudioMixReadiness,
} from "@/lib/studio-audio-mix-readiness";
import {
  fetchUserAudioLibraryApi,
  linkStoryboardAudioAssetsApi,
  uploadUserAudioLibraryAssetApi,
} from "@/lib/studio-audio-library-client";
import { fetchStoryboardVoiceBundle } from "@/lib/studio-voice-client";
import { buildStoryboardAudioMixPlan } from "@/lib/studio-audio-mix-resolve";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";

type Props = {
  storyboard: StudioStoryboardDetail;
  canModify: boolean;
  onStoryboardUpdated?: (storyboard: StudioStoryboardDetail) => void;
};

export function StudioWorkspaceAudioMixPanel({ storyboard, canModify, onStoryboardUpdated }: Props) {
  const t = useActiveTranslator();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [library, setLibrary] = useState<UserAudioLibraryAsset[]>([]);
  const [hasVoiceAudio, setHasVoiceAudio] = useState(false);
  const [narrationAudioUrl, setNarrationAudioUrl] = useState<string | null>(null);
  const [narrationDuration, setNarrationDuration] = useState<number | null>(null);
  const committedMusicId = storyboard.audioAssetLinks.musicAssetId ?? "";
  const committedSoundId = storyboard.audioAssetLinks.soundAssetId ?? "";
  const linksKey = `${committedMusicId}|${committedSoundId}`;
  const [musicAssetId, setMusicAssetId] = useState(committedMusicId);
  const [soundAssetId, setSoundAssetId] = useState(committedSoundId);
  const [prevLinksKey, setPrevLinksKey] = useState(linksKey);
  if (prevLinksKey !== linksKey) {
    setPrevLinksKey(linksKey);
    setMusicAssetId(committedMusicId);
    setSoundAssetId(committedSoundId);
  }
  const [uploadKind, setUploadKind] = useState<"music" | "sfx">("music");
  const [uploading, setUploading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [libRes, voiceRes] = await Promise.all([
      fetchUserAudioLibraryApi(),
      fetchStoryboardVoiceBundle(storyboard.id),
    ]);
    if (libRes.ok) {
      setLibrary(libRes.data.assets ?? []);
    }
    if (voiceRes.ok) {
      const lang = (storyboard.voiceLanguage ?? "en").slice(0, 2);
      const voice =
        voiceRes.data.voices.find((v) => v.language === lang && v.status === "completed")
        ?? voiceRes.data.voice;
      const url = voice?.audioUrl?.trim() || null;
      setNarrationAudioUrl(url);
      setNarrationDuration(voice?.durationSeconds ?? null);
      setHasVoiceAudio(Boolean(url));
    }
  }, [storyboard.id, storyboard.voiceLanguage]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [libRes, voiceRes] = await Promise.all([
        fetchUserAudioLibraryApi(),
        fetchStoryboardVoiceBundle(storyboard.id),
      ]);
      if (cancelled) {
        return;
      }
      if (libRes.ok) {
        setLibrary(libRes.data.assets ?? []);
      }
      if (voiceRes.ok) {
        const lang = (storyboard.voiceLanguage ?? "en").slice(0, 2);
        const voice =
          voiceRes.data.voices.find((v) => v.language === lang && v.status === "completed")
          ?? voiceRes.data.voice;
        const url = voice?.audioUrl?.trim() || null;
        setNarrationAudioUrl(url);
        setNarrationDuration(voice?.durationSeconds ?? null);
        setHasVoiceAudio(Boolean(url));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storyboard.id, storyboard.voiceLanguage]);

  const readiness = resolveStoryboardAudioMixReadiness({
    storyboard,
    hasVoiceAudio,
    library,
  });

  const mixPreview = useMemo(
    () =>
      buildStoryboardAudioMixPlan({
        storyboard,
        userLibrary: library,
        voiceAudioUrl: hasVoiceAudio ? "linked" : null,
        audioAssetMetadataJson: storyboard.audioAssetLinks,
      }),
    [storyboard, library, hasVoiceAudio]
  );

  const musicAssets = library.filter((a) => a.kind === "music");
  const sfxAssets = library.filter((a) => a.kind === "sfx");

  const selectedMusicAsset = useMemo(
    () => musicAssets.find((a) => a.id === musicAssetId) ?? null,
    [musicAssets, musicAssetId]
  );
  const selectedSoundAsset = useMemo(
    () => sfxAssets.find((a) => a.id === soundAssetId) ?? null,
    [sfxAssets, soundAssetId]
  );
  const linkedMusicAsset = useMemo(
    () => musicAssets.find((a) => a.id === committedMusicId) ?? null,
    [musicAssets, committedMusicId]
  );
  const linkedSoundAsset = useMemo(
    () => sfxAssets.find((a) => a.id === committedSoundId) ?? null,
    [sfxAssets, committedSoundId]
  );

  const handleUpload = async (file: File) => {
    if (!canModify) {
      return;
    }
    setUploading(true);
    setError(null);
    setFeedback(null);
    try {
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const res = await uploadUserAudioLibraryAssetApi(file, {
        kind: uploadKind,
        name: baseName,
        category: uploadKind === "music" ? "background" : "ambience",
        mood: "neutral",
        energy: "medium",
      });
      if (!res.ok || !res.data?.asset) {
        setError(
          res.data && "error" in res.data ? String(res.data.error) : t("studio.audioMix.error.upload")
        );
        return;
      }
      setFeedback(t("studio.audioMix.feedback.uploaded"));
      await refresh();
      if (uploadKind === "music") {
        setMusicAssetId(res.data.asset.id);
      } else {
        setSoundAssetId(res.data.asset.id);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleLink = async () => {
    if (!canModify) {
      return;
    }
    setLinking(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await linkStoryboardAudioAssetsApi(storyboard.id, {
        musicAssetId: musicAssetId || null,
        soundAssetId: soundAssetId || null,
      });
      if (!res.ok) {
        setError(
          res.data && "error" in res.data ? String(res.data.error) : t("studio.audioMix.error.link")
        );
        return;
      }
      setFeedback(t("studio.audioMix.feedback.linked"));
      const links = res.data?.links ?? storyboard.audioAssetLinks;
      setMusicAssetId(links.musicAssetId ?? "");
      setSoundAssetId(links.soundAssetId ?? "");
      onStoryboardUpdated?.({
        ...storyboard,
        audioAssetLinks: links,
      });
    } finally {
      setLinking(false);
    }
  };

  const laneRow = (
    labelKey: string,
    linked: boolean,
    ready: boolean,
    detail: string,
    source: string
  ) => (
    <div className="rounded-xl border border-violet-100 bg-white/90 px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-violet-800">
        {t(labelKey as never)}
      </dt>
      <dd className="mt-1 text-sm font-medium text-zinc-900">
        {linked ? "✓" : "⚠"}{" "}
        {t(audioMixStatusLabelKey(ready, linked) as never)}
      </dd>
      <dd className="mt-0.5 text-xs text-zinc-600">{detail}</dd>
      {source ?
        <dd className="mt-0.5 text-xs text-zinc-500">
          {t("studio.audioMix.sourceLabel")}: {source}
        </dd>
      : null}
    </div>
  );

  return (
    <section className="rounded-2xl border border-violet-200/70 bg-gradient-to-b from-violet-50/50 to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-violet-950">{t("studio.audioMix.title")}</h3>
          <p className="mt-1 text-xs text-violet-900/80">{t("studio.audioMix.hint")}</p>
        </div>
        {canModify ?
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleUpload(file);
                }
                event.target.value = "";
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={uploadKind}
                onChange={(e) => setUploadKind(e.target.value === "sfx" ? "sfx" : "music")}
                className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium"
              >
                <option value="music">{t("studio.audioMix.uploadMusic")}</option>
                <option value="sfx">{t("studio.audioMix.uploadSound")}</option>
              </select>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {uploading ? t("studio.audioMix.uploading") : t("studio.audioMix.upload")}
              </button>
            </div>
          </>
        : null}
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {laneRow(
          "studio.audioMix.narration",
          readiness.narrationLinked,
          readiness.narrationLinked,
          hasVoiceAudio
            ? t("studio.audioMix.durationSeconds", {
                seconds: String(mixPreview.totalDurationSeconds.toFixed(0)),
              })
            : t("studio.audioMix.typeNarration"),
          hasVoiceAudio ? t("studio.audioMix.sourceStory") : ""
        )}
        {laneRow(
          "studio.audioMix.music",
          readiness.musicLinked,
          readiness.musicLinked && storyboard.musicEnabled,
          mixPreview.musicAssetName ?? t("studio.audioMix.typeBackgroundMusic"),
          mixPreview.musicAssetName ?? ""
        )}
        {laneRow(
          "studio.audioMix.sound",
          readiness.soundLinked,
          readiness.soundLinked && storyboard.soundEnabled,
          mixPreview.soundAssetName ?? t("studio.audioMix.typeAmbience"),
          mixPreview.soundAssetName ?? ""
        )}
      </dl>

      <div className="mt-4 space-y-3">
        <p className="text-xs font-semibold text-violet-950">{t("studio.audioMix.previewTitle")}</p>
        {narrationAudioUrl ?
          <StudioAudioPreviewPlayer
            title={t("studio.audioMix.narration")}
            audioUrl={narrationAudioUrl}
            durationSeconds={narrationDuration}
            source="mix_narration"
            variant="compact"
          />
        : null}
        {(selectedMusicAsset ?? linkedMusicAsset)?.audioUrl ?
          <StudioAudioPreviewPlayer
            title={(selectedMusicAsset ?? linkedMusicAsset)!.name}
            audioUrl={(selectedMusicAsset ?? linkedMusicAsset)!.audioUrl}
            durationSeconds={(selectedMusicAsset ?? linkedMusicAsset)!.durationSeconds}
            source="mix_music"
            variant="compact"
          />
        : null}
        {(selectedSoundAsset ?? linkedSoundAsset)?.audioUrl ?
          <StudioAudioPreviewPlayer
            title={(selectedSoundAsset ?? linkedSoundAsset)!.name}
            audioUrl={(selectedSoundAsset ?? linkedSoundAsset)!.audioUrl}
            durationSeconds={(selectedSoundAsset ?? linkedSoundAsset)!.durationSeconds}
            source="mix_sfx"
            variant="compact"
          />
        : null}
        {!narrationAudioUrl && !selectedMusicAsset && !linkedMusicAsset && !selectedSoundAsset && !linkedSoundAsset ?
          <p className="text-xs text-violet-800">{t("studio.audioMix.previewEmpty")}</p>
        : null}
      </div>

      {canModify ?
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs">
            <span className="font-semibold text-zinc-800">{t("studio.audioMix.linkMusic")}</span>
            <select
              value={musicAssetId}
              onChange={(e) => setMusicAssetId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="">{t("studio.audioMix.selectMusic")}</option>
              {musicAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="font-semibold text-zinc-800">{t("studio.audioMix.linkSound")}</span>
            <select
              value={soundAssetId}
              onChange={(e) => setSoundAssetId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="">{t("studio.audioMix.selectSound")}</option>
              {sfxAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} · {asset.category}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={linking}
            onClick={() => void handleLink()}
            className="sm:col-span-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-950 disabled:opacity-60"
          >
            {linking ? t("studio.audioMix.linking") : t("studio.audioMix.saveLinks")}
          </button>
        </div>
      : null}

      <p className="mt-3 text-xs text-violet-900">
        {readiness.mixReady
          ? t("studio.audioMix.status.ready")
          : t("studio.audioMix.status.notReady")}
      </p>

      {error ?
        <p className="mt-2 text-xs text-red-700">{error}</p>
      : null}
      {feedback ?
        <p className="mt-2 text-xs text-emerald-800">{feedback}</p>
      : null}
    </section>
  );
}
