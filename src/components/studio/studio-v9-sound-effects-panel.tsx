"use client";

import { useEffect, useMemo, useState } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useActiveTranslator } from "@/i18n/client";
import { useStudioAudioChangePlan } from "@/hooks/use-studio-audio-change-plan";
import { fetchUserAudioLibraryApi } from "@/lib/studio-audio-library-client";
import { generateStudioSfxApi } from "@/lib/studio-audio-generation-client";
import { resolveClientStudioSfxProviderStatus } from "@/lib/studio-audio-provider-status";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";

export const STUDIO_V9_SFX_CATEGORIES = [
  "whoosh",
  "kitchen",
  "crowd",
  "city",
  "footsteps",
  "impact",
  "ambience",
  "nature",
  "wind",
  "transition",
  "custom",
] as const;

type SfxCategory = (typeof STUDIO_V9_SFX_CATEGORIES)[number];

type Props = {
  storyboardId: string;
  activeSceneId?: string;
  activeSceneIndex?: number;
  canModify: boolean;
};

export function StudioV9SoundEffectsPanel({
  storyboardId,
  activeSceneId,
  activeSceneIndex,
  canModify,
}: Props) {
  const t = useActiveTranslator();
  const { enqueueChange } = useStudioAudioChangePlan(storyboardId);
  const providerStatus = resolveClientStudioSfxProviderStatus();
  const [category, setCategory] = useState<SfxCategory>("ambience");
  const [prompt, setPrompt] = useState("");
  const [library, setLibrary] = useState<UserAudioLibraryAsset[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchUserAudioLibraryApi();
      if (!cancelled && res.ok) {
        setLibrary((res.data.assets ?? []).filter((a) => a.kind === "sfx"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const libraryMatch = useMemo(() => {
    return (
      library.find((a) => a.category === category) ??
      library.find((a) => a.category === "ambience") ??
      library[0] ??
      null
    );
  }, [library, category]);

  const handleGenerate = async () => {
    if (!canModify || !activeSceneId) {
      return;
    }
    setGenerating(true);
    setCacheHit(false);
    try {
      const title = `${category} SFX`;
      const res = await generateStudioSfxApi({
        prompt: prompt.trim() || `${category} sound effect`,
        category,
        name: title,
        sceneLabel: `Scene ${(activeSceneIndex ?? 0) + 1}`,
      });
      if (res.ok) {
        setPreviewUrl(res.data.previewUrl);
        setCacheHit(res.data.cacheHit);
        setLibrary((current) => {
          const exists = current.some((a) => a.id === res.data.asset.id);
          return exists ? current : [res.data.asset, ...current];
        });
        enqueueChange({
          kind: "sound_effect",
          title,
          source: res.data.cacheHit ? "user" : "generation",
          applyTarget: "scene",
          sceneId: activeSceneId,
          sceneIndex: activeSceneIndex,
          sfxCategory: category,
          prompt: prompt.trim() || `${category} sound effect`,
          provider: res.data.provider,
          providerAssetId: res.data.providerAssetId,
          audioUrl: res.data.audioUrl,
          previewUrl: res.data.previewUrl,
          durationSeconds: res.data.durationSeconds,
          status: "ready",
          estimatedCostCredits: res.data.cacheHit ? 0 : 1,
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleAddToScene = () => {
    if (!canModify || !activeSceneId) {
      return;
    }
    enqueueChange({
      kind: "sound_effect",
      title: libraryMatch?.name ?? `${category} SFX`,
      source: "user",
      applyTarget: "scene",
      sceneId: activeSceneId,
      sceneIndex: activeSceneIndex,
      sfxCategory: category,
      provider: libraryMatch ? "library" : "elevenlabs_sfx",
      providerAssetId: libraryMatch?.id,
      audioUrl: libraryMatch?.audioUrl,
      previewUrl: libraryMatch?.audioUrl,
      durationSeconds: libraryMatch?.durationSeconds,
      status: "ready",
      estimatedCostCredits: 0,
    });
    setPreviewUrl(libraryMatch?.audioUrl ?? "");
  };

  return (
    <section
      className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4"
      data-testid="studio-v9-sfx-panel"
    >
      <header>
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.v9.sfx.title" as never)}
        </h3>
        <p className="mt-1 text-xs text-zinc-600">{t("studio.v9.sfx.hint" as never)}</p>
        <p className="mt-2 text-xs text-zinc-500">
          {t(providerStatus.messageKey as never)}
        </p>
      </header>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-zinc-700">
          {t("studio.v9.sfx.category" as never)}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SfxCategory)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            data-testid="studio-v9-sfx-category"
          >
            {STUDIO_V9_SFX_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`studio.v9.sfx.categories.${c}` as never)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-700 sm:col-span-2">
          {t("studio.v9.sfx.prompt" as never)}
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canModify || generating || !activeSceneId}
          onClick={handleGenerate}
          className="rounded-lg bg-[#006D52] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          data-testid="studio-v9-sfx-generate"
        >
          {generating
            ? t("studio.v9.sfx.generating" as never)
            : t("studio.v9.sfx.generate" as never)}
        </button>
        <button
          type="button"
          disabled={!canModify || !activeSceneId}
          onClick={handleAddToScene}
          className="rounded-lg border border-[#006D52]/40 px-3 py-1.5 text-xs font-semibold text-[#006D52] disabled:opacity-50"
          data-testid="studio-v9-sfx-add-scene"
        >
          {t("studio.v9.sfx.addScene" as never)}
        </button>
        {libraryMatch ?
          <button
            type="button"
            disabled={!canModify}
            onClick={() => {
              enqueueChange({
                kind: "sound_effect",
                title: libraryMatch.name,
                source: "user",
                applyTarget: "project",
                provider: "library",
                providerAssetId: libraryMatch.id,
                audioUrl: libraryMatch.audioUrl,
                previewUrl: libraryMatch.audioUrl,
                status: "ready",
                estimatedCostCredits: 0,
              });
              setPreviewUrl(libraryMatch.audioUrl);
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
          >
            {t("studio.v9.sfx.saveLibrary" as never)}
          </button>
        : null}
      </div>

      {!activeSceneId ?
        <p className="mt-2 text-xs text-amber-800">{t("studio.v9.sfx.selectScene" as never)}</p>
      : null}

      {previewUrl ?
        <div className="mt-3" data-testid="studio-v9-sfx-preview">
          <StudioAudioPreviewPlayer
            audioUrl={previewUrl}
            title={t("studio.v9.sfx.preview" as never)}
            source="sfx_upload"
          />
          {cacheHit ?
            <p className="mt-1 text-[10px] font-semibold text-emerald-700">
              {t("studio.v10.cacheHit" as never)}
            </p>
          : null}
        </div>
      : null}
    </section>
  );
}
