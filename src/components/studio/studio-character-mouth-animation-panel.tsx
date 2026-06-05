"use client";

import { StudioMouthCyclePreview } from "@/components/studio/studio-mouth-cycle-preview";
import { useActiveTranslator } from "@/i18n/client";
import type { CharacterPerformanceFormState } from "@/components/studio/studio-character-performance-profile-panel";

type Props = {
  characterName: string;
  value: CharacterPerformanceFormState;
  onChange: (next: CharacterPerformanceFormState) => void;
};

export function StudioCharacterMouthAnimationPanel({ characterName, value, onChange }: Props) {
  const t = useActiveTranslator();
  const enabled = value.performanceEnabled && value.mouthAnimationEnabled;

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
        <input
          type="checkbox"
          checked={value.mouthAnimationEnabled}
          disabled={!value.performanceEnabled}
          onChange={(e) => onChange({ ...value, mouthAnimationEnabled: e.target.checked })}
        />
        {t("studio.mouthAnimation.enabled")}
      </label>
      <p className="text-xs text-zinc-600">{t("studio.mouthAnimation.hint")}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["mouthClosedAssetUrl", "closed"],
            ["mouthSmallAssetUrl", "small"],
            ["mouthMediumAssetUrl", "medium"],
            ["mouthWideAssetUrl", "wide"],
          ] as const
        ).map(([field, label]) => (
          <label key={field} className="block text-sm">
            <span className="font-medium text-zinc-800">
              {t(`studio.mouthAnimation.asset.${label}` as never)}
            </span>
            <input
              type="url"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              placeholder="https://..."
              value={value[field]}
              disabled={!enabled}
              onChange={(e) => onChange({ ...value, [field]: e.target.value })}
            />
          </label>
        ))}
      </div>

      <StudioMouthCyclePreview
        characterName={characterName}
        mouthAssets={{
          closed: value.mouthClosedAssetUrl,
          small: value.mouthSmallAssetUrl,
          medium: value.mouthMediumAssetUrl,
          wide: value.mouthWideAssetUrl,
        }}
      />
    </div>
  );
}
