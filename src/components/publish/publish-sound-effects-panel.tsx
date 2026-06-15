"use client";

import { PublishMediaTabButton } from "@/components/publish/publish-media-tab-button";
import { PublishProductionSectionShell } from "@/components/publish/publish-production-section-shell";
import { useActiveTranslator } from "@/i18n/client";
import { createSoundEffectItem } from "@/lib/publish-media-production";
import {
  soundEffectsPanelVisibility,
  updateSoundEffectsMode,
} from "@/lib/publish-media-panel-state";
import {
  PUBLISH_SOUND_EFFECT_CATEGORIES,
  type PublishSoundEffectCategory,
  type PublishSoundEffectMode,
  type PublishSoundEffectsConfig,
} from "@/types/publish-media-production";

const SFX_MODES: PublishSoundEffectMode[] = ["none", "auto", "manual", "library", "upload"];
const LIBRARY_SFX = [
  { id: "city_traffic", label: "City traffic" },
  { id: "crowd_cheer", label: "Crowd cheer" },
  { id: "kitchen_sizzle", label: "Kitchen sizzle" },
];

type Props = {
  value: PublishSoundEffectsConfig;
  onChange: (next: PublishSoundEffectsConfig) => void;
  sceneLabels?: string[];
};

export function PublishSoundEffectsPanel({ value, onChange, sceneLabels = ["Scene 1", "Scene 2", "Scene 3"] }: Props) {
  const t = useActiveTranslator();
  const visibility = soundEffectsPanelVisibility(value);
  const activeCount = value.mode === "auto" ? 8 : value.items.length;

  const patch = (patchValue: Partial<PublishSoundEffectsConfig>) => {
    onChange({ ...value, ...patchValue });
  };

  const toggleCategory = (category: PublishSoundEffectCategory) => {
    const exists = value.items.some((item) => item.category === category);
    if (exists) {
      patch({ items: value.items.filter((item) => item.category !== category) });
      return;
    }
    patch({ items: [...value.items, createSoundEffectItem(category)], mode: "manual" });
  };

  return (
    <PublishProductionSectionShell
      titleKey="publish.media.soundEffects.title"
      summary={
        value.mode !== "none"
          ? t("publish.media.soundEffects.activeCount" as never, { count: String(activeCount) } as never)
          : undefined
      }
      emptyLabelKey={value.mode === "none" ? "publish.media.soundEffects.noneSelected" : undefined}
      active={value.mode !== "none"}
      testId="publish-sound-effects-panel"
    >
      <div role="tablist" aria-label={t("publish.media.soundEffects.title" as never)} className="flex flex-wrap gap-2">
        {SFX_MODES.map((mode) => (
          <PublishMediaTabButton
            key={mode}
            active={value.mode === mode}
            testId={`publish-sfx-mode-${mode}`}
            onClick={() => onChange(updateSoundEffectsMode(value, mode))}
          >
            {t(`publish.media.soundEffects.mode.${mode}` as never)}
          </PublishMediaTabButton>
        ))}
      </div>

      {visibility.emptyState ?
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600" data-testid="publish-sfx-empty-state">
          {t("publish.media.soundEffects.emptyAdded" as never)}
        </p>
      : null}

      {visibility.autoControls ?
        <div data-testid="publish-sfx-auto-controls" className="space-y-3">
          <p className="text-sm text-zinc-600">{t("publish.media.soundEffects.autoHint" as never)}</p>
          <ul className="space-y-2">
            {sceneLabels.map((scene) => (
              <li key={scene} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                {scene}: {t("publish.media.soundEffects.autoSuggested" as never)}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {visibility.manualControls ?
        <div data-testid="publish-sfx-manual-controls" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PUBLISH_SOUND_EFFECT_CATEGORIES.map((category) => {
              const active = value.items.some((item) => item.category === category);
              return (
                <PublishMediaTabButton key={category} active={active} onClick={() => toggleCategory(category)}>
                  {t(`publish.media.soundEffects.category.${category}` as never)}
                </PublishMediaTabButton>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => patch({ items: [...value.items, createSoundEffectItem("ambience")] })}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700"
          >
            + {t("publish.media.soundEffects.addEffect" as never)}
          </button>
        </div>
      : null}

      {visibility.libraryPicker ?
        <ul className="space-y-2" data-testid="publish-sfx-library-picker">
          {LIBRARY_SFX.map((asset) => (
            <li key={asset.id}>
              <button
                type="button"
                onClick={() =>
                  patch({
                    items: [{ id: asset.id, category: "ambience", label: asset.label, assetId: asset.id }],
                  })
                }
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                  value.items.some((item) => item.assetId === asset.id)
                    ? "border-[#0067B1] bg-[#0067B1]/10 font-semibold text-[#0067B1]"
                    : "border-zinc-200 text-zinc-700"
                }`}
              >
                {asset.label}
              </button>
            </li>
          ))}
        </ul>
      : null}

      {visibility.uploadControls ?
        <div data-testid="publish-sfx-upload-controls">
          <label className="block text-xs font-semibold text-zinc-600">
            {t("publish.media.soundEffects.upload" as never)}
            <input
              type="file"
              accept="audio/*"
              className="mt-1 block w-full text-xs"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                patch({
                  items: [
                    {
                      id: crypto.randomUUID(),
                      category: "ambience",
                      label: file.name,
                      uploadFileName: file.name,
                    },
                  ],
                });
              }}
            />
          </label>
        </div>
      : null}
    </PublishProductionSectionShell>
  );
}
