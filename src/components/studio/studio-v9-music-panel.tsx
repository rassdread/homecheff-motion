"use client";

import { useEffect, useMemo, useState } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useActiveTranslator } from "@/i18n/client";
import { useStudioAudioChangePlan } from "@/hooks/use-studio-audio-change-plan";
import { generateStudioMusicApi } from "@/lib/studio-audio-generation-client";
import { fetchUserAudioLibraryApi } from "@/lib/studio-audio-library-client";
import { resolveClientStudioMusicProviderStatus } from "@/lib/studio-audio-provider-status";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";

const MUSIC_GENRES = ["corporate", "cinematic", "pop", "ambient", "electronic"] as const;
const MUSIC_MOODS = ["warm", "energetic", "calm", "cinematic", "uplifting"] as const;

type Props = {
  storyboardId: string;
  activeSceneId?: string;
  activeSceneIndex?: number;
  canModify: boolean;
};

export function StudioV9MusicPanel({
  storyboardId,
  activeSceneId,
  activeSceneIndex,
  canModify,
}: Props) {
  const t = useActiveTranslator();
  const { enqueueChange } = useStudioAudioChangePlan(storyboardId);
  const providerStatus = resolveClientStudioMusicProviderStatus();
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState<(typeof MUSIC_GENRES)[number]>("cinematic");
  const [mood, setMood] = useState<(typeof MUSIC_MOODS)[number]>("warm");
  const [duration, setDuration] = useState(30);
  const [instrumental, setInstrumental] = useState(true);
  const [library, setLibrary] = useState<UserAudioLibraryAsset[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchUserAudioLibraryApi();
      if (!cancelled && res.ok) {
        setLibrary((res.data.assets ?? []).filter((a) => a.kind === "music"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const libraryPreview = useMemo(
    () => library.find((a) => a.mood === mood) ?? library[0] ?? null,
    [library, mood]
  );

  const handleGenerate = async () => {
    if (!canModify) {
      return;
    }
    setGenerating(true);
    setCacheHit(false);
    try {
      const title = prompt.trim() || `${mood} ${genre} track`;
      const res = await generateStudioMusicApi({
        prompt: prompt.trim() || `${mood} ${genre} instrumental background`,
        genre,
        mood,
        durationSeconds: duration,
        instrumental,
        name: title,
      });
      if (res.ok) {
        setPreviewUrl(res.data.previewUrl);
        setCacheHit(res.data.cacheHit);
        setLibrary((current) => {
          const exists = current.some((a) => a.id === res.data.asset.id);
          return exists ? current : [res.data.asset, ...current];
        });
        enqueueChange({
          kind: "music",
          title,
          source: res.data.cacheHit ? "user" : "generation",
          applyTarget: activeSceneId ? "scene" : "project",
          sceneId: activeSceneId,
          sceneIndex: activeSceneIndex,
          prompt: prompt.trim() || `${mood} ${genre} instrumental background`,
          genre,
          mood,
          durationSeconds: res.data.durationSeconds,
          instrumental,
          provider: res.data.provider,
          providerAssetId: res.data.providerAssetId,
          audioUrl: res.data.audioUrl,
          previewUrl: res.data.previewUrl,
          status: "ready",
          estimatedCostCredits: res.data.cacheHit ? 0 : 3,
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToLibrary = () => {
    if (!libraryPreview) {
      return;
    }
    enqueueChange({
      kind: "music",
      title: libraryPreview.name,
      source: "user",
      applyTarget: "project",
      provider: "library",
      providerAssetId: libraryPreview.id,
      audioUrl: libraryPreview.audioUrl,
      previewUrl: libraryPreview.audioUrl,
      durationSeconds: libraryPreview.durationSeconds,
      status: "ready",
      estimatedCostCredits: 0,
    });
    setPreviewUrl(libraryPreview.audioUrl);
  };

  return (
    <section
      className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4"
      data-testid="studio-v9-music-panel"
    >
      <header>
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.v9.music.title" as never)}
        </h3>
        <p className="mt-1 text-xs text-zinc-600">{t("studio.v9.music.hint" as never)}</p>
        <p className="mt-2 text-xs text-zinc-500">
          {t(providerStatus.messageKey as never)}
        </p>
      </header>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-zinc-700">
          {t("studio.v9.music.prompt" as never)}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-zinc-700">
          {t("studio.v9.music.genre" as never)}
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value as (typeof MUSIC_GENRES)[number])}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          >
            {MUSIC_GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-700">
          {t("studio.v9.music.mood" as never)}
          <select
            value={mood}
            onChange={(e) => setMood(e.target.value as (typeof MUSIC_MOODS)[number])}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          >
            {MUSIC_MOODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-700">
          {t("studio.v9.music.duration" as never)}
          <input
            type="number"
            min={10}
            max={180}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs text-zinc-700">
        <input
          type="checkbox"
          checked={instrumental}
          onChange={(e) => setInstrumental(e.target.checked)}
        />
        {t("studio.v9.music.instrumental" as never)}
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canModify || generating}
          onClick={() => void handleGenerate()}
          className="rounded-lg bg-[#0067B1] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          data-testid="studio-v9-music-generate"
        >
          {generating
            ? t("studio.v9.music.generating" as never)
            : t("studio.v9.music.generate" as never)}
        </button>
        {libraryPreview ?
          <button
            type="button"
            disabled={!canModify}
            onClick={handleSaveToLibrary}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
          >
            {t("studio.v9.music.saveLibrary" as never)}
          </button>
        : null}
      </div>

      {previewUrl ?
        <div className="mt-3" data-testid="studio-v9-music-preview">
          <StudioAudioPreviewPlayer
            audioUrl={previewUrl}
            title={t("studio.v9.music.preview" as never)}
            source="music_upload"
          />
          {cacheHit ?
            <p className="mt-1 text-[10px] font-semibold text-emerald-700">
              {t("studio.v10.cacheHit" as never)}
            </p>
          : null}
        </div>
      : null}

      <p className="mt-2 text-[11px] text-zinc-500">
        {t("studio.v9.music.costPlaceholder" as never)}
      </p>
    </section>
  );
}
