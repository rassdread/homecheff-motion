"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { STUDIO_SOUND_PROFILE_IDS } from "@/lib/studio-sound-profiles";
import { buildSoundDirectorPlan } from "@/lib/studio-sound-director";
import { updateStudioStoryboardApi } from "@/lib/studio-storyboards-client";
import type { SceneSoundCue } from "@/types/studio-sound-director";
import type { StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  onUpdated: (storyboard: StudioStoryboardDetail) => void;
};

function formatSoundList(
  t: (key: never) => string,
  ids: string[]
): string {
  if (ids.length === 0) {
    return "—";
  }
  return ids
    .map((id) => {
      const key = `studio.sound.id.${id}` as never;
      try {
        return t(key);
      } catch {
        return id.replace(/_/g, " ");
      }
    })
    .join(", ");
}

function SceneSoundSummary({ cue, t }: { cue: SceneSoundCue; t: (key: never) => string }) {
  return (
    <li key={cue.sceneId} className="text-xs text-teal-900">
      <span className="font-medium">
        {cue.order + 1}. {cue.title || t("studio.sound.sceneFallback" as never)}
      </span>
      <ul className="mt-0.5 space-y-0.5 pl-3 text-teal-800">
        <li>
          {t("studio.sound.plan.environment" as never)}:{" "}
          {formatSoundList(t, cue.environmentSounds)}
        </li>
        <li>
          {t("studio.sound.plan.character" as never)}: {formatSoundList(t, cue.characterSounds)}
        </li>
        <li>
          {t("studio.sound.plan.transition" as never)}:{" "}
          {formatSoundList(t, cue.transitionSounds.filter((s) => s !== "none"))}
        </li>
      </ul>
    </li>
  );
}

export function StudioSoundDirectorPanel({ storyboard, onUpdated }: Props) {
  const t = useActiveTranslator();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo(() => buildSoundDirectorPlan(storyboard), [storyboard]);

  const persist = async (patch: Parameters<typeof updateStudioStoryboardApi>[1]) => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateStudioStoryboardApi(storyboard.id, patch);
      if (!res.ok) {
        throw new Error((res.data as { error?: string }).error ?? "Save failed");
      }
      onUpdated(res.data.storyboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
      <h3 className="text-sm font-semibold text-teal-950">{t("studio.sound.title")}</h3>
      <p className="mt-1 text-xs text-teal-800">{t("studio.sound.hint")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-medium text-teal-950 sm:col-span-2">
          <input
            type="checkbox"
            checked={storyboard.soundEnabled}
            disabled={saving}
            onChange={(e) => void persist({ soundEnabled: e.target.checked })}
          />
          {t("studio.sound.enabled")}
        </label>

        <label className="text-sm">
          <span className="font-medium">{t("studio.sound.profile")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-teal-200 px-2 py-1.5 text-sm"
            value={storyboard.soundStyle || plan.profileId}
            disabled={saving || !storyboard.soundEnabled}
            onChange={(e) => void persist({ soundStyle: e.target.value })}
          >
            {STUDIO_SOUND_PROFILE_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`studio.sound.profile.${id}` as never)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="font-medium">{t("studio.sound.density")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-teal-200 px-2 py-1.5 text-sm"
            value={storyboard.soundDensity || "balanced"}
            disabled={saving || !storyboard.soundEnabled}
            onChange={(e) => void persist({ soundDensity: e.target.value })}
          >
            {["minimal", "balanced", "rich"].map((v) => (
              <option key={v} value={v}>
                {t(`studio.sound.density.${v}` as never)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm sm:col-span-2">
          <span className="font-medium">{t("studio.sound.notes")}</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-teal-200 px-2 py-1.5 text-sm"
            rows={2}
            defaultValue={storyboard.soundNotes}
            disabled={saving || !storyboard.soundEnabled}
            onBlur={(e) => {
              if (e.target.value !== storyboard.soundNotes) {
                void persist({ soundNotes: e.target.value });
              }
            }}
          />
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-teal-100 bg-white/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
          {t("studio.sound.scenePlan")}
        </p>
        <p className="mt-1 text-sm text-teal-950">
          {t(plan.profileLabelKey as never)} · {t(`studio.sound.density.${plan.density}` as never)}
        </p>
        <ul className="mt-2 space-y-2">
          {plan.sceneCues.map((cue) => (
            <SceneSoundSummary key={cue.sceneId} cue={cue} t={t} />
          ))}
        </ul>
      </div>

      {plan.warnings.length > 0 ?
        <ul className="mt-3 space-y-1 text-xs text-amber-900">
          {plan.warnings.map((w) => (
            <li key={w.code}>⚠ {t(w.messageKey as never, w.params as never)}</li>
          ))}
        </ul>
      : null}

      {plan.recommendations.length > 0 ?
        <ul className="mt-2 space-y-0.5 text-xs text-teal-800">
          {plan.recommendations.map((key) => (
            <li key={key}>• {t(key as never)}</li>
          ))}
        </ul>
      : null}

      {error ?
        <p className="mt-2 text-xs text-red-700">{error}</p>
      : null}
    </div>
  );
}
