"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { buildAudioAssetDirectorPlan } from "@/lib/studio-audio-asset-director";
import { buildMusicDirectorPlan } from "@/lib/studio-music-director";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  scene: StudioSceneDetail;
};

type MusicPreviewState = "preview" | "asset" | "plan";

export function StudioMusicPreviewCard({ storyboard, scene }: Props) {
  const t = useActiveTranslator();
  const [volume, setVolume] = useState(0.7);
  const plan = useMemo(() => buildMusicDirectorPlan(storyboard), [storyboard]);
  const assetPlan = useMemo(() => buildAudioAssetDirectorPlan(storyboard), [storyboard]);
  const sceneCue = plan.sceneCues.find((c) => c.sceneId === scene.id);
  const scenePkg = assetPlan.scenePackages.find((p) => p.sceneId === scene.id);
  const assignedMusic = scenePkg?.musicAssets[0]?.assetName ?? null;

  const state: MusicPreviewState = !storyboard.musicEnabled
    ? "plan"
    : assignedMusic
      ? "preview"
      : sceneCue?.cueType
        ? "asset"
        : "plan";

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
            state === "preview"
              ? "bg-emerald-100 text-emerald-900"
              : state === "asset"
                ? "bg-indigo-100 text-indigo-900"
                : "bg-zinc-100 text-zinc-700"
          }`}
        >
          {t(`studio.musicPreview.state.${state}`)}
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

      {assignedMusic ?
        <p className="mt-3 text-xs font-medium text-indigo-900">
          {t("studio.musicPreview.assignedTrack")}: {assignedMusic}
        </p>
      : sceneCue ?
        <p className="mt-3 text-xs text-zinc-700">
          {sceneCue.cueType.replace(/_/g, " ")} · {plan.narrativeSummary}
        </p>
      : (
        <p className="mt-3 text-xs text-zinc-600">{t("studio.musicPreview.planOnlyHint")}</p>
      )}

      {state !== "plan" ?
        <div className="mt-4 rounded-lg border border-indigo-100 bg-white/90 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-700">{t("studio.musicPreview.volume")}</span>
            <span className="text-xs text-zinc-500">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="mt-2 w-full accent-indigo-600"
            aria-label={t("studio.musicPreview.volume")}
          />
          <p className="mt-2 text-[10px] text-zinc-500">
            {state === "preview"
              ? t("studio.musicPreview.previewReadyHint")
              : t("studio.musicPreview.assetPlanHint")}
          </p>
        </div>
      : null}

      <p className="mt-3 text-[10px] text-indigo-700/90">{t("studio.musicPreview.hearBeforeRender")}</p>
    </article>
  );
}
