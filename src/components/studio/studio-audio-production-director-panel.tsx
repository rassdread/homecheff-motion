"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  AUDIO_PRIORITY_STRATEGIES,
  STUDIO_AUDIO_STYLE_IDS,
} from "@/lib/studio-audio-production-profiles";
import { buildAudioProductionDirectorPlan } from "@/lib/studio-audio-production-director";
import { AUDIO_DUCKING_MODES, AUDIO_FOCUS_TYPES } from "@/types/studio-audio-production-director";
import { updateStudioSceneApi, updateStudioStoryboardApi } from "@/lib/studio-storyboards-client";
import type { SceneAudioProductionCue } from "@/types/studio-audio-production-director";
import type { StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  onUpdated: (storyboard: StudioStoryboardDetail) => void;
};

function SceneAudioSummary({
  cue,
  scene,
  storyboardId,
  saving,
  onSceneUpdated,
  t,
}: {
  cue: SceneAudioProductionCue;
  scene: StudioStoryboardDetail["scenes"][number];
  storyboardId: string;
  saving: boolean;
  onSceneUpdated: (scene: StudioStoryboardDetail["scenes"][number]) => void;
  t: (key: never, params?: never) => string;
}) {
  const persistScene = async (patch: Parameters<typeof updateStudioSceneApi>[2]) => {
    const res = await updateStudioSceneApi(storyboardId, scene.id, patch);
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? "Save failed");
    }
    onSceneUpdated(res.data.scene);
  };

  return (
    <li className="rounded-lg border border-violet-100 bg-white/80 p-2 text-xs text-violet-950">
      <p className="font-medium">
        {cue.order + 1}. {cue.title || t("studio.audio.sceneFallback" as never)}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="text-violet-900">
          <span className="font-medium">{t("studio.audio.focus" as never)}</span>
          <select
            className="mt-0.5 w-full rounded border border-violet-200 px-1.5 py-1 text-xs"
            value={scene.audioFocus || cue.audioFocus}
            disabled={saving}
            onChange={(e) => void persistScene({ audioFocus: e.target.value })}
          >
            <option value="">{t("studio.audio.auto" as never)}</option>
            {AUDIO_FOCUS_TYPES.map((id) => (
              <option key={id} value={id}>
                {t(`studio.audio.focus.${id}` as never)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-violet-900">
          <span className="font-medium">{t("studio.audio.ducking" as never)}</span>
          <select
            className="mt-0.5 w-full rounded border border-violet-200 px-1.5 py-1 text-xs"
            value={scene.duckingMode || cue.duckingMode}
            disabled={saving}
            onChange={(e) => void persistScene({ duckingMode: e.target.value })}
          >
            <option value="">{t("studio.audio.auto" as never)}</option>
            {AUDIO_DUCKING_MODES.map((id) => (
              <option key={id} value={id}>
                {t(`studio.audio.ducking.${id}` as never)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-violet-800">
        {t("studio.audio.mixPlan" as never)}: V {cue.mixRecommendation.voice} · M{" "}
        {cue.mixRecommendation.music} · S {cue.mixRecommendation.sound}
      </p>
      <p className="mt-0.5 text-violet-700">
        {t("studio.audio.priorityBreakdown" as never)}: {cue.voicePriority} / {cue.musicPriority} /{" "}
        {cue.soundPriority}
      </p>
      {cue.duckingRecommendations.music || cue.duckingRecommendations.sound ?
        <p className="mt-0.5 text-violet-700">
          {t("studio.audio.duckingRecommendations" as never)}:{" "}
          {cue.duckingRecommendations.music ? t("studio.audio.duckMusic" as never) : ""}
          {cue.duckingRecommendations.music && cue.duckingRecommendations.sound ? " · " : ""}
          {cue.duckingRecommendations.sound ? t("studio.audio.duckSound" as never) : ""}
        </p>
      : null}
      {cue.speakerPriority ?
        <p className="mt-0.5 text-violet-700">
          {t("studio.audio.speakerPriority" as never)}: {cue.speakerPriority}
        </p>
      : null}
    </li>
  );
}

export function StudioAudioProductionDirectorPanel({ storyboard, onUpdated }: Props) {
  const t = useActiveTranslator();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo(() => buildAudioProductionDirectorPlan(storyboard), [storyboard]);
  const sceneById = useMemo(
    () => new Map(storyboard.scenes.map((s) => [s.id, s])),
    [storyboard.scenes]
  );

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

  const handleSceneUpdated = (scene: StudioStoryboardDetail["scenes"][number]) => {
    onUpdated({
      ...storyboard,
      scenes: storyboard.scenes.map((s) => (s.id === scene.id ? scene : s)),
    });
  };

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
      <h3 className="text-sm font-semibold text-violet-950">{t("studio.audio.title")}</h3>
      <p className="mt-1 text-xs text-violet-800">{t("studio.audio.hint")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-medium text-violet-950 sm:col-span-2">
          <input
            type="checkbox"
            checked={storyboard.audioProductionEnabled ?? true}
            disabled={saving}
            onChange={(e) => void persist({ audioProductionEnabled: e.target.checked })}
          />
          {t("studio.audio.enabled")}
        </label>

        <label className="text-sm">
          <span className="font-medium">{t("studio.audio.style")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-violet-200 px-2 py-1.5 text-sm"
            value={storyboard.audioStyle || plan.style}
            disabled={saving || !storyboard.audioProductionEnabled}
            onChange={(e) => void persist({ audioStyle: e.target.value })}
          >
            {STUDIO_AUDIO_STYLE_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`studio.audio.profile.${id}` as never)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="font-medium">{t("studio.audio.strategy")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-violet-200 px-2 py-1.5 text-sm"
            value={storyboard.audioPriorityStrategy || plan.priorityStrategy}
            disabled={saving || !storyboard.audioProductionEnabled}
            onChange={(e) => void persist({ audioPriorityStrategy: e.target.value })}
          >
            {AUDIO_PRIORITY_STRATEGIES.map((id) => (
              <option key={id} value={id}>
                {t(`studio.audio.strategy.${id}` as never)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm sm:col-span-2">
          <span className="font-medium">{t("studio.audio.notes")}</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-violet-200 px-2 py-1.5 text-sm"
            rows={2}
            defaultValue={storyboard.audioNotes}
            disabled={saving || !storyboard.audioProductionEnabled}
            onBlur={(e) => {
              if (e.target.value !== storyboard.audioNotes) {
                void persist({ audioNotes: e.target.value });
              }
            }}
          />
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-violet-100 bg-white/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
          {t("studio.audio.focusSummary")}
        </p>
        <p className="mt-1 text-sm text-violet-950">{plan.audioFocusSummary || "—"}</p>
        <ul className="mt-3 space-y-2">
          {plan.sceneCues.map((cue) => {
            const scene = sceneById.get(cue.sceneId);
            if (!scene) {
              return null;
            }
            return (
              <SceneAudioSummary
                key={cue.sceneId}
                cue={cue}
                scene={scene}
                storyboardId={storyboard.id}
                saving={saving}
                onSceneUpdated={handleSceneUpdated}
                t={t}
              />
            );
          })}
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
        <ul className="mt-2 space-y-0.5 text-xs text-violet-800">
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
