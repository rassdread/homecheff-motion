"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { StudioAudioAssetLibrary } from "@/components/studio/studio-audio-asset-library";
import { buildAudioAssetDirectorPlan } from "@/lib/studio-audio-asset-director";
import { listStudioAudioAssets } from "@/lib/studio-audio-asset-library";
import { updateStudioSceneApi, updateStudioStoryboardApi } from "@/lib/studio-storyboards-client";
import type { SceneAudioAssetPackage } from "@/types/studio-audio-asset-director";
import type { StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  onUpdated: (storyboard: StudioStoryboardDetail) => void;
};

function formatAssets(names: string[]): string {
  return names.length > 0 ? names.join(", ") : "—";
}

function AssetOverrideSelect({
  label,
  category,
  value,
  recommendedId,
  disabled,
  onChange,
  t,
}: {
  label: string;
  category: "voice" | "music" | "ambience" | "sfx";
  value: string;
  recommendedId: string;
  disabled: boolean;
  onChange: (value: string) => void;
  t: (key: never) => string;
}) {
  const options = listStudioAudioAssets(category);
  return (
    <label className="text-amber-900">
      <span className="font-medium">{label}</span>
      <select
        className="mt-0.5 w-full rounded border border-amber-200 px-1.5 py-1 text-xs"
        value={value || recommendedId}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === recommendedId ? "" : e.target.value)}
      >
        <option value={recommendedId}>{t("studio.audioAsset.auto" as never)}</option>
        {options.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function SceneAssetSummary({
  pkg,
  scene,
  storyboardId,
  saving,
  onSceneUpdated,
  t,
}: {
  pkg: SceneAudioAssetPackage;
  scene: StudioStoryboardDetail["scenes"][number];
  storyboardId: string;
  saving: boolean;
  onSceneUpdated: (scene: StudioStoryboardDetail["scenes"][number]) => void;
  t: (key: never, params?: never) => string;
}) {
  const persistScene = async (patch: Parameters<typeof updateStudioSceneApi>[2]) => {
    const res = await updateStudioSceneApi(storyboardId, scene.id, patch);
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.common.saveFailed" as never));
    }
    onSceneUpdated(res.data.scene);
  };

  const voiceId = pkg.voiceAssets[0]?.assetId ?? "";
  const musicId = pkg.musicAssets[0]?.assetId ?? "";
  const ambienceId = pkg.ambienceAssets[0]?.assetId ?? "";
  const sfxId = pkg.sfxAssets[0]?.assetId ?? "";

  return (
    <li className="rounded-lg border border-amber-100 bg-white/80 p-2 text-xs text-amber-950">
      <p className="font-medium">
        {pkg.order + 1}. {pkg.title || t("studio.audioAsset.sceneFallback" as never)}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <AssetOverrideSelect
          label={t("studio.audioAsset.assignedVoice" as never)}
          category="voice"
          value={scene.voiceAssetOverride}
          recommendedId={voiceId}
          disabled={saving}
          onChange={(v) => void persistScene({ voiceAssetOverride: v })}
          t={t}
        />
        <AssetOverrideSelect
          label={t("studio.audioAsset.assignedMusic" as never)}
          category="music"
          value={scene.musicAssetOverride}
          recommendedId={musicId}
          disabled={saving}
          onChange={(v) => void persistScene({ musicAssetOverride: v })}
          t={t}
        />
        <AssetOverrideSelect
          label={t("studio.audioAsset.assignedAmbience" as never)}
          category="ambience"
          value={scene.ambienceAssetOverride}
          recommendedId={ambienceId}
          disabled={saving}
          onChange={(v) => void persistScene({ ambienceAssetOverride: v })}
          t={t}
        />
        <AssetOverrideSelect
          label={t("studio.audioAsset.assignedSfx" as never)}
          category="sfx"
          value={scene.sfxAssetOverride}
          recommendedId={sfxId}
          disabled={saving}
          onChange={(v) => void persistScene({ sfxAssetOverride: v })}
          t={t}
        />
      </div>
      <p className="mt-2 text-amber-800">
        {t("studio.audioAsset.summaryLine" as never, {
          voice: formatAssets(pkg.voiceAssets.map((a) => a.assetName)),
          music: formatAssets(pkg.musicAssets.map((a) => a.assetName)),
          ambience: formatAssets(pkg.ambienceAssets.map((a) => a.assetName)),
          sfx: formatAssets(pkg.sfxAssets.map((a) => a.assetName)),
        } as never)}
      </p>
    </li>
  );
}

export function StudioAudioAssetDirectorPanel({ storyboard, onUpdated }: Props) {
  const t = useActiveTranslator();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  const plan = useMemo(() => buildAudioAssetDirectorPlan(storyboard), [storyboard]);
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
        throw new Error((res.data as { error?: string }).error ?? t("studio.common.saveFailed" as never));
      }
      onUpdated(res.data.storyboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("studio.common.saveFailed" as never));
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
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
        <h3 className="text-sm font-semibold text-amber-950">{t("studio.audioAsset.title")}</h3>
        <p className="mt-1 text-xs text-amber-800">{t("studio.audioAsset.hint")}</p>

        <div className="mt-4 grid gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-amber-950">
            <input
              type="checkbox"
              checked={storyboard.audioAssetsEnabled ?? true}
              disabled={saving}
              onChange={(e) => void persist({ audioAssetsEnabled: e.target.checked })}
            />
            {t("studio.audioAsset.enabled")}
          </label>

          <label className="text-sm">
            <span className="font-medium">{t("studio.audioAsset.notes")}</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-amber-200 px-2 py-1.5 text-sm"
              rows={2}
              defaultValue={storyboard.audioAssetNotes}
              disabled={saving || !storyboard.audioAssetsEnabled}
              onBlur={(e) => {
                if (e.target.value !== storyboard.audioAssetNotes) {
                  void persist({ audioAssetNotes: e.target.value });
                }
              }}
            />
          </label>

          <button
            type="button"
            className="w-fit rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-900"
            onClick={() => setShowLibrary((v) => !v)}
          >
            {showLibrary ?
              t("studio.audioAsset.hideLibrary")
            : t("studio.audioAsset.showLibrary")}
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-amber-100 bg-white/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            {t("studio.audioAsset.storyboardSummary")}
          </p>
          <p className="mt-1 text-sm text-amber-950">{plan.assetSummary || "—"}</p>
          <ul className="mt-3 space-y-2">
            {plan.scenePackages.map((pkg) => {
              const scene = sceneById.get(pkg.sceneId);
              if (!scene) {
                return null;
              }
              return (
                <SceneAssetSummary
                  key={pkg.sceneId}
                  pkg={pkg}
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

        {error ?
          <p className="mt-2 text-xs text-red-700">{error}</p>
        : null}
      </div>

      {showLibrary ?
        <StudioAudioAssetLibrary />
      : null}
    </div>
  );
}
