"use client";

import type { PropIdentityStyleId } from "@/lib/studio-prop-identity-presets";
import { PROP_IDENTITY_STYLE_PREVIEW_TOKENS } from "@/lib/studio-prop-identity-presets";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";

type Props = {
  styleId: PropIdentityStyleId | string;
  selected: boolean;
  onSelect: () => void;
};

export function StudioPropIdentityStylePreviewCard({ styleId, selected, onSelect }: Props) {
  const t = useActiveTranslator();
  const tokens = PROP_IDENTITY_STYLE_PREVIEW_TOKENS[styleId];
  const labelKey = `studio.propIdentity.styles.${styleId}` as TranslationKey;
  const descKey = `studio.propIdentity.stylePreview.${styleId}.description` as TranslationKey;
  const fitKey = `studio.propIdentity.stylePreview.${styleId}.fits` as TranslationKey;

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
      }`}
    >
      <div
        className={`relative flex h-20 items-center justify-center bg-gradient-to-br p-3 ${tokens.gradient}`}
      >
        <div
          className={`h-10 w-10 shadow-md ${tokens.radius}`}
          style={{ backgroundColor: tokens.accent }}
        />
      </div>
      <div className="space-y-1 bg-white p-3">
        <p className="text-xs font-semibold text-zinc-900">{t(labelKey)}</p>
        <p className="text-[10px] leading-snug text-zinc-600">{t(descKey)}</p>
        <p className="text-[10px] font-medium text-[#006D52]">{t(fitKey)}</p>
      </div>
    </button>
  );
}
