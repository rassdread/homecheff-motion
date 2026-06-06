"use client";

import { useMemo } from "react";
import { StudioDirectorCardSelect } from "@/components/studio/director-v2/studio-director-card-select";
import { useActiveTranslator } from "@/i18n/client";
import { buildMusicDirectorPlan } from "@/lib/studio-music-director";
import {
  MUSIC_CUE_TYPES,
  MUSIC_ENERGY_TARGETS,
  type MusicCueType,
  type MusicEnergyTarget,
} from "@/types/studio-music-director";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
  storyboard: StudioStoryboardDetail;
  canModify: boolean;
  onPatch: (patch: Partial<StudioSceneDetail>) => void;
};

export function StudioDirectorSectionMusic({ scene, storyboard, canModify, onPatch }: Props) {
  const t = useActiveTranslator();
  const cue = (scene.musicCueType || "") as MusicCueType | "";
  const energy = (scene.musicEnergyTarget || "") as MusicEnergyTarget | "";

  const plan = useMemo(() => buildMusicDirectorPlan(storyboard), [storyboard]);
  const sceneCue = plan.sceneCues.find((c) => c.sceneId === scene.id);

  return (
    <div className="space-y-4">
      {sceneCue ?
        <div className="rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 px-3 py-2 text-xs">
          <p className="font-semibold text-[#0067B1]">{t("studio.directorV2.music.planState")}</p>
          <p className="mt-1 text-zinc-800">
            {sceneCue.cueType.replace(/_/g, " ")} · {sceneCue.energyTarget} ·{" "}
            {sceneCue.transitionType.replace(/_/g, " ")}
          </p>
          <p className="mt-0.5 text-zinc-600">
            {t("studio.directorV2.music.planStart")}: {sceneCue.startBehavior.replace(/_/g, " ")} ·{" "}
            {t("studio.directorV2.music.planEnd")}: {sceneCue.endBehavior.replace(/_/g, " ")}
          </p>
          <p className="mt-1 text-zinc-500">{plan.narrativeSummary}</p>
        </div>
      : null}
      <div>
        <p className="text-xs font-medium text-zinc-700">{t("studio.directorV2.music.cue")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MUSIC_CUE_TYPES.map((value) => (
            <StudioDirectorCardSelect
              key={value}
              label={value.replace(/_/g, " ")}
              selected={cue === value}
              disabled={!canModify}
              onSelect={() => onPatch({ musicCueType: value })}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-700">{t("studio.directorV2.music.energy")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MUSIC_ENERGY_TARGETS.map((value) => (
            <StudioDirectorCardSelect
              key={value}
              label={value}
              selected={energy === value}
              disabled={!canModify}
              onSelect={() => onPatch({ musicEnergyTarget: value })}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-zinc-500">{t("studio.directorV2.music.previewHint")}</p>
    </div>
  );
}
