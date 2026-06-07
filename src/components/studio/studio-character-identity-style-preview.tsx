"use client";

import type { CharacterIdentityStyleId } from "@/lib/studio-character-identity-presets";
import {
  CHARACTER_IDENTITY_STYLE_PREVIEW_TOKENS,
} from "@/lib/studio-character-identity-presets";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";

type Props = {
  styleId: CharacterIdentityStyleId | string;
  selected: boolean;
  onSelect: () => void;
};

export function StudioCharacterIdentityStylePreviewCard({
  styleId,
  selected,
  onSelect,
}: Props) {
  const t = useActiveTranslator();
  const tokens = CHARACTER_IDENTITY_STYLE_PREVIEW_TOKENS[styleId];
  const labelKey = `studio.characterIdentity.styles.${styleId}` as TranslationKey;
  const descKey = `studio.characterIdentity.stylePreview.${styleId}.description` as TranslationKey;
  const fitKey = `studio.characterIdentity.stylePreview.${styleId}.fits` as TranslationKey;

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
        className={`relative flex h-20 items-end justify-center bg-gradient-to-br p-3 ${tokens.gradient}`}
      >
        <div
          className={`h-10 w-10 ${tokens.radius} shadow-md`}
          style={{ backgroundColor: tokens.accent }}
        />
        <div
          className={`absolute bottom-2 right-2 h-4 w-4 rounded-full opacity-80 ${tokens.radius}`}
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
