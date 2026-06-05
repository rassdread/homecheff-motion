"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { STUDIO_MUSIC_PROFILE_IDS } from "@/lib/studio-music-profiles";
import { buildMusicDirectorPlan } from "@/lib/studio-music-director";
import { updateStudioStoryboardApi } from "@/lib/studio-storyboards-client";
import type { StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  onUpdated: (storyboard: StudioStoryboardDetail) => void;
};

export function StudioMusicDirectorPanel({ storyboard, onUpdated }: Props) {
  const t = useActiveTranslator();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo(() => buildMusicDirectorPlan(storyboard), [storyboard]);

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
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
      <h3 className="text-sm font-semibold text-indigo-950">{t("studio.music.title")}</h3>
      <p className="mt-1 text-xs text-indigo-800">{t("studio.music.hint")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-medium text-indigo-950 sm:col-span-2">
          <input
            type="checkbox"
            checked={storyboard.musicEnabled}
            disabled={saving}
            onChange={(e) => void persist({ musicEnabled: e.target.checked })}
          />
          {t("studio.music.enabled")}
        </label>

        <label className="text-sm">
          <span className="font-medium">{t("studio.music.profile")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-indigo-200 px-2 py-1.5 text-sm"
            value={storyboard.musicStyle || plan.profileId}
            disabled={saving || !storyboard.musicEnabled}
            onChange={(e) => void persist({ musicStyle: e.target.value })}
          >
            {STUDIO_MUSIC_PROFILE_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`studio.music.profile.${id}` as never)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="font-medium">{t("studio.music.intensity")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-indigo-200 px-2 py-1.5 text-sm"
            value={storyboard.musicIntensity || "balanced"}
            disabled={saving || !storyboard.musicEnabled}
            onChange={(e) => void persist({ musicIntensity: e.target.value })}
          >
            {["subtle", "balanced", "bold"].map((v) => (
              <option key={v} value={v}>
                {t(`studio.music.intensity.${v}` as never)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm sm:col-span-2">
          <span className="font-medium">{t("studio.music.narrativeRole")}</span>
          <input
            className="mt-1 w-full rounded-lg border border-indigo-200 px-2 py-1.5 text-sm"
            value={storyboard.musicNarrativeRole || "support_narrative"}
            disabled={saving || !storyboard.musicEnabled}
            onChange={(e) => void persist({ musicNarrativeRole: e.target.value })}
          />
        </label>

        <label className="text-sm sm:col-span-2">
          <span className="font-medium">{t("studio.music.notes")}</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-indigo-200 px-2 py-1.5 text-sm"
            rows={2}
            defaultValue={storyboard.musicNotes}
            disabled={saving || !storyboard.musicEnabled}
            onBlur={(e) => {
              if (e.target.value !== storyboard.musicNotes) {
                void persist({ musicNotes: e.target.value });
              }
            }}
          />
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-indigo-100 bg-white/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">
          {t("studio.music.narrativePreview")}
        </p>
        <p className="mt-1 text-sm text-indigo-950">
          {t(plan.profileLabelKey as never)} · {plan.narrativeSummary || "—"}
        </p>
        <ul className="mt-2 space-y-1 text-xs text-indigo-900">
          {plan.narrativePlan.map((entry) => (
            <li key={entry.sceneId}>
              {entry.order + 1}. {entry.title || t("studio.music.sceneFallback")} —{" "}
              <span className="font-medium capitalize">{entry.narrativeLabel}</span>
              <span className="text-indigo-600"> ({entry.cueType})</span>
            </li>
          ))}
        </ul>
      </div>

      {plan.sceneCues.length > 0 ?
        <div className="mt-3 rounded-lg border border-indigo-100 bg-white/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">
            {t("studio.music.cuePlan")}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-indigo-900">
            {plan.sceneCues.map((cue) => (
              <li key={cue.sceneId}>
                {cue.order + 1}. {cue.title || t("studio.music.sceneFallback")} —{" "}
                <span className="capitalize">{cue.cueType}</span>
                <span className="text-indigo-600">
                  {" "}
                  · {cue.energyTarget} · {cue.transitionType.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      : null}

      {plan.warnings.length > 0 ?
        <ul className="mt-3 space-y-1 text-xs text-amber-900">
          {plan.warnings.map((w) => (
            <li key={w.code}>⚠ {t(w.messageKey as never, w.params as never)}</li>
          ))}
        </ul>
      : null}

      {plan.recommendations.length > 0 && storyboard.voiceEnabled ?
        <ul className="mt-2 space-y-0.5 text-xs text-indigo-800">
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
