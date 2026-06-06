"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { buildSoundDirectorPlan } from "@/lib/studio-sound-director";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

const FEATURED_ENVIRONMENTS = [
  "restaurant",
  "nature",
  "street",
  "market",
  "crowd",
] as const;

type Props = {
  storyboard: StudioStoryboardDetail;
  scene: StudioSceneDetail;
  canModify: boolean;
  onSelectEnvironment: (env: string) => void;
};

export function StudioEnvironmentSoundPanel({
  storyboard,
  scene,
  canModify,
  onSelectEnvironment,
}: Props) {
  const t = useActiveTranslator();
  const plan = useMemo(() => buildSoundDirectorPlan(storyboard), [storyboard]);
  const sceneCue = plan.sceneCues.find((c) => c.sceneId === scene.id);
  const activeEnv = scene.soundEnvironmentOverride?.trim() || sceneCue?.environmentSounds[0] || "";

  const suggestedEffects = sceneCue
    ? [...sceneCue.propSounds, ...sceneCue.characterSounds].slice(0, 4)
    : [];

  return (
    <article className="rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/60 to-white p-4 shadow-sm">
      <h4 className="text-sm font-bold text-teal-950">{t("studio.soundExperience.title")}</h4>
      <p className="mt-1 text-xs text-teal-800">{t("studio.soundExperience.subtitle")}</p>
      <p className="mt-2 text-[10px] font-medium text-teal-900/80">
        {t("studio.soundExperience.appliedDuringRender")}
      </p>

      <div className="mt-4">
        <p className="text-xs font-semibold text-zinc-700">{t("studio.soundExperience.environment")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FEATURED_ENVIRONMENTS.map((env) => (
            <button
              key={env}
              type="button"
              disabled={!canModify}
              onClick={() => onSelectEnvironment(env)}
              className={`min-h-[44px] rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                activeEnv === env
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-teal-200 bg-white text-teal-900 hover:bg-teal-50"
              } disabled:opacity-50`}
            >
              {t(`studio.soundExperience.env.${env}` as never)}
            </button>
          ))}
        </div>
      </div>

      {suggestedEffects.length > 0 ?
        <div className="mt-4 rounded-lg border border-teal-100 bg-white/80 p-3">
          <p className="text-[10px] font-semibold uppercase text-teal-800">
            {t("studio.soundExperience.suggestedEffects")}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-zinc-700">
            {suggestedEffects.map((fx) => (
              <li key={fx}>· {fx.replace(/_/g, " ")}</li>
            ))}
          </ul>
        </div>
      : null}

      {sceneCue && sceneCue.environmentSounds.length > 0 ?
        <p className="mt-3 text-xs text-zinc-600">
          {t("studio.soundExperience.activePlan")}:{" "}
          {sceneCue.environmentSounds.map((e) => e.replace(/_/g, " ")).join(", ")}
        </p>
      : null}
    </article>
  );
}
