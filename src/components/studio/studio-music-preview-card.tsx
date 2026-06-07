"use client";

import { useEffect, useMemo, useState } from "react";
import {
  StudioAudioPreviewPlanningOnly,
  StudioAudioPreviewPlayer,
} from "@/components/studio/studio-audio-preview-player";
import { useActiveTranslator } from "@/i18n/client";
import { fetchUserAudioLibraryApi } from "@/lib/studio-audio-library-client";
import { buildAudioAssetDirectorPlan } from "@/lib/studio-audio-asset-director";
import { buildMusicDirectorPlan } from "@/lib/studio-music-director";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  scene: StudioSceneDetail;
};

type MusicPreviewState = "playback" | "plan";

export function StudioMusicPreviewCard({ storyboard, scene }: Props) {
  const t = useActiveTranslator();
  const [library, setLibrary] = useState<UserAudioLibraryAsset[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchUserAudioLibraryApi();
      if (!cancelled && res.ok) {
        setLibrary(res.data.assets ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const plan = useMemo(() => buildMusicDirectorPlan(storyboard), [storyboard]);
  const assetPlan = useMemo(() => buildAudioAssetDirectorPlan(storyboard), [storyboard]);
  const sceneCue = plan.sceneCues.find((c) => c.sceneId === scene.id);
  const scenePkg = assetPlan.scenePackages.find((p) => p.sceneId === scene.id);
  const catalogMusicName = scenePkg?.musicAssets[0]?.assetName ?? null;

  const linkedMusicId = storyboard.audioAssetLinks.musicAssetId ?? "";
  const linkedMusicAsset = useMemo(
    () => library.find((a) => a.id === linkedMusicId && a.kind === "music") ?? null,
    [library, linkedMusicId]
  );

  const hasPlayback = Boolean(linkedMusicAsset?.audioUrl?.trim());
  const state: MusicPreviewState = hasPlayback ? "playback" : "plan";

  const mood = storyboard.musicStyle || plan.profileId || "—";
  const energy = scene.musicEnergyTarget || sceneCue?.energyTarget || storyboard.musicIntensity || "—";

  return (
    <article className="rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-indigo-950">{t("studio.musicPreview.title")}</h4>
          <p className="mt-1 text-xs text-indigo-800">{t("studio.musicPreview.subtitle")}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
            state === "playback"
              ? "bg-emerald-100 text-emerald-900"
              : "bg-zinc-100 text-zinc-700"
          }`}
        >
          {state === "playback"
            ? t("studio.musicPreview.state.playback")
            : t("studio.musicPreview.state.plan")}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-indigo-100 bg-white/80 p-3">
          <dt className="font-semibold text-zinc-500">{t("studio.musicPreview.mood")}</dt>
          <dd className="mt-1 font-medium text-zinc-900">{mood.replace(/_/g, " ")}</dd>
        </div>
        <div className="rounded-lg border border-indigo-100 bg-white/80 p-3">
          <dt className="font-semibold text-zinc-500">{t("studio.musicPreview.energy")}</dt>
          <dd className="mt-1 font-medium text-zinc-900">{String(energy).replace(/_/g, " ")}</dd>
        </div>
      </dl>

      {hasPlayback && linkedMusicAsset ?
        <>
          <StudioAudioPreviewPlayer
            title={linkedMusicAsset.name}
            audioUrl={linkedMusicAsset.audioUrl}
            durationSeconds={linkedMusicAsset.durationSeconds}
            source="music_upload"
            variant="compact"
            className="mt-4 border-indigo-100"
          />
          <p className="mt-2 text-[10px] text-indigo-700/90">
            {t("studio.musicPreview.linkedUploadHint")}
          </p>
        </>
      : <>
          {catalogMusicName || sceneCue ?
            <p className="mt-3 text-xs text-zinc-700">
              {catalogMusicName
                ? `${t("studio.musicPreview.catalogPlan")}: ${catalogMusicName}`
                : `${sceneCue!.cueType.replace(/_/g, " ")} · ${plan.narrativeSummary}`}
            </p>
          : null}
          <StudioAudioPreviewPlanningOnly
            messageKey="studio.musicPreview.planOnlyHint"
            className="mt-3"
          />
        </>
      }
    </article>
  );
}
