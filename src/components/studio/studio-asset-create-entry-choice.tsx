"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { AssetCreateEntryPath } from "@/types/studio-asset-creation";

type Props = {
  onSelect: (path: AssetCreateEntryPath) => void;
};

const ENTRY_OPTIONS: Array<{
  path: AssetCreateEntryPath;
  titleKey: string;
  descriptionKey: string;
}> = [
  {
    path: "design",
    titleKey: "studio.assetCreation.entry.designTitle",
    descriptionKey: "studio.assetCreation.entry.designDescription",
  },
  {
    path: "prompt_only",
    titleKey: "studio.assetCreation.entry.promptTitle",
    descriptionKey: "studio.assetCreation.entry.promptDescription",
  },
  {
    path: "image_only",
    titleKey: "studio.assetCreation.entry.imageTitle",
    descriptionKey: "studio.assetCreation.entry.imageDescription",
  },
  {
    path: "image_and_prompt",
    titleKey: "studio.assetCreation.entry.imagePromptTitle",
    descriptionKey: "studio.assetCreation.entry.imagePromptDescription",
  },
  {
    path: "existing_asset",
    titleKey: "studio.assetCreation.entry.existingTitle",
    descriptionKey: "studio.assetCreation.entry.existingDescription",
  },
  {
    path: "derive_from_reference",
    titleKey: "studio.assetCreation.entry.deriveTitle",
    descriptionKey: "studio.assetCreation.entry.deriveDescription",
  },
];

export function StudioAssetCreateEntryChoice({ onSelect }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.assetCreation.entry.question")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.assetCreation.entry.lead")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ENTRY_OPTIONS.map((option) => (
          <button
            key={option.path}
            type="button"
            onClick={() => onSelect(option.path)}
            className="rounded-2xl border border-zinc-200 bg-white p-5 text-left transition hover:border-[#0067B1]/40 hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-zinc-900">{t(option.titleKey as never)}</p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              {t(option.descriptionKey as never)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
