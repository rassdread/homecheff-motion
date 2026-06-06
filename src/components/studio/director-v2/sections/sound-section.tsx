"use client";

import { useMemo } from "react";
import { StudioDirectorCardSelect } from "@/components/studio/director-v2/studio-director-card-select";
import { useActiveTranslator } from "@/i18n/client";
import { buildSoundDirectorPlan } from "@/lib/studio-sound-director";
import { SOUND_ENVIRONMENT_IDS } from "@/types/studio-sound-director";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

const SUGGESTED_SFX = ["whoosh", "impact_soft", "page_turn", "kitchen_ambience"] as const;

type Props = {
  scene: StudioSceneDetail;
  storyboard: StudioStoryboardDetail;
  canModify: boolean;
  onPatch: (patch: Partial<StudioSceneDetail>) => void;
};

export function StudioDirectorSectionSound({ scene, storyboard, canModify, onPatch }: Props) {
  const t = useActiveTranslator();
  const environment = scene.soundEnvironmentOverride?.trim() || "";

  const plan = useMemo(() => buildSoundDirectorPlan(storyboard), [storyboard]);
  const sceneCue = plan.sceneCues.find((c) => c.sceneId === scene.id);

  return (
    <div className="space-y-4">
      {sceneCue ?
        <div className="rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2 text-xs">
          <p className="font-semibold text-violet-900">{t("studio.directorV2.sound.planState")}</p>
          <p className="mt-1 text-zinc-800">
            {sceneCue.environmentSounds.join(", ").replace(/_/g, " ") || "—"}
          </p>
          {sceneCue.propSounds.length > 0 ?
            <p className="mt-0.5 text-zinc-600">
              SFX: {sceneCue.propSounds.join(", ").replace(/_/g, " ")}
            </p>
          : null}
          <p className="mt-1 text-zinc-500">
            {t("studio.directorV2.sound.density")}: {sceneCue.densityScore}/100
            {sceneCue.duckingRecommended ? ` · ${t("studio.directorV2.sound.ducking")}` : ""}
          </p>
        </div>
      : null}
      <div>
        <p className="text-xs font-medium text-zinc-700">{t("studio.directorV2.sound.environment")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SOUND_ENVIRONMENT_IDS.map((value) => (
            <StudioDirectorCardSelect
              key={value}
              label={value.replace(/_/g, " ")}
              selected={environment === value}
              disabled={!canModify}
              onSelect={() => onPatch({ soundEnvironmentOverride: value })}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-700">{t("studio.directorV2.sound.suggested")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGGESTED_SFX.map((value) => (
            <StudioDirectorCardSelect
              key={value}
              label={value.replace(/_/g, " ")}
              selected={scene.soundPropOverride?.includes(value) ?? false}
              disabled={!canModify}
              onSelect={() => onPatch({ soundPropOverride: value })}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-zinc-500">{t("studio.directorV2.sound.previewHint")}</p>
    </div>
  );
}
