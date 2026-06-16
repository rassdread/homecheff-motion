"use client";

import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import {
  MOTION_ACTION_PRESET_FEATURED_IDS,
  getMotionActionPreset,
} from "@/lib/motion-action-presets";
import { buildMotionActionPresetPrefillPackage } from "@/lib/assistant-prefill-engine";
import {
  buildAssistantPrefillRoute,
  storeAssistantPrefillPackage,
} from "@/lib/assistant-prefill-storage";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import { useRouter } from "next/navigation";

type Props = {
  className?: string;
};

export function MotionActionPresetCards({ className = "" }: Props) {
  const t = useActiveTranslator();
  const router = useRouter();

  const handleSelect = (presetId: MotionActionPresetId) => {
    const pkg = buildMotionActionPresetPrefillPackage({ presetId });
    if (!pkg) {
      return;
    }
    storeAssistantPrefillPackage(pkg);
    router.push(buildAssistantPrefillRoute(pkg.targetRoute, pkg.id));
  };

  return (
    <section
      className={`mb-4 rounded-2xl border border-zinc-200 bg-white p-4 ${className}`}
      data-testid="motion-action-preset-cards"
    >
      <h2 className="text-sm font-semibold text-zinc-900">
        {t("instant.actionPresets.title" as never)}
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        {t("instant.actionPresets.subtitle" as never)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MOTION_ACTION_PRESET_FEATURED_IDS.map((presetId) => {
          const preset = getMotionActionPreset(presetId);
          if (!preset) {
            return null;
          }
          return (
            <button
              key={presetId}
              type="button"
              data-testid={`motion-action-preset-card-${presetId}`}
              className={`${studioVisual.btnOutline} flex flex-col items-start gap-1 px-3 py-2.5 text-left text-xs`}
              onClick={() => handleSelect(presetId)}
            >
              <span className="font-semibold text-zinc-900">{preset.title}</span>
              <span className="line-clamp-2 text-[11px] text-zinc-500">
                {preset.shortDescription}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
