"use client";

import type { WorldIdentityTypeId } from "@/lib/studio-world-identity-presets";
import {
  isAdvancedWorldPreviewType,
  WORLD_IDENTITY_TYPE_PREVIEW_TOKENS,
} from "@/lib/studio-world-identity-presets";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";

type Props = {
  worldTypeId: WorldIdentityTypeId | string;
  selected: boolean;
  onSelect: () => void;
};

export function StudioWorldIdentityTypePreviewCard({
  worldTypeId,
  selected,
  onSelect,
}: Props) {
  const t = useActiveTranslator();
  const tokens = WORLD_IDENTITY_TYPE_PREVIEW_TOKENS[worldTypeId];
  const labelKey = `studio.worldIdentity.types.${worldTypeId}` as TranslationKey;
  const descKey = `studio.worldIdentity.typePreview.${worldTypeId}.description` as TranslationKey;
  const fitKey = `studio.worldIdentity.typePreview.${worldTypeId}.fits` as TranslationKey;
  const moodKey = `studio.worldIdentity.typePreview.${worldTypeId}.mood` as TranslationKey;

  if (!tokens) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full flex-col overflow-hidden rounded-xl border text-left transition ${
        selected ?
          "border-[#0067B1] ring-2 ring-[#0067B1]/20"
        : "border-zinc-200 hover:border-zinc-300"
      } ${isAdvancedWorldPreviewType(worldTypeId) ? "opacity-95" : ""}`}
    >
      <div
        className={`relative flex h-20 flex-col justify-end bg-gradient-to-br p-3 ${tokens.gradient}`}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded-full shadow"
            style={{ backgroundColor: tokens.accent }}
          />
          <div
            className="h-3 w-8 rounded-sm opacity-80"
            style={{ backgroundColor: tokens.accent }}
          />
        </div>
        <p className="mt-2 text-[9px] font-semibold uppercase tracking-wide text-zinc-700/80">
          {t(moodKey)}
        </p>
      </div>
      <div className="space-y-1 bg-white p-3">
        <p className="text-xs font-semibold text-zinc-900">{t(labelKey)}</p>
        <p className="text-[10px] leading-snug text-zinc-600">{t(descKey)}</p>
        <p className="text-[10px] font-medium text-[#006D52]">{t(fitKey)}</p>
      </div>
    </button>
  );
}
