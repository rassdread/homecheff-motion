"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { ProjectBundleListItemResponse } from "@/types/animation-api";

type CatalogShape = ProjectBundleListItemResponse["catalog"];

type Props = {
  catalog: CatalogShape;
  selectedLanguageCode: string;
  selectedSelectionKey: string | null;
  onLanguageChange: (languageCode: string) => void;
  onVersionChange: (selectionKey: string) => void;
  className?: string;
  languageSelectId?: string;
  versionSelectId?: string;
};

export function MotionVersionSelectors({
  catalog,
  selectedLanguageCode,
  selectedSelectionKey,
  onLanguageChange,
  onVersionChange,
  className = "",
  languageSelectId = "motion-language-select",
  versionSelectId = "motion-version-select",
}: Props) {
  const t = useActiveTranslator();

  const versionOptions = useMemo(
    () => catalog.slotsByLanguage[selectedLanguageCode] ?? [],
    [catalog.slotsByLanguage, selectedLanguageCode]
  );

  if (catalog.languages.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      {catalog.languages.length > 1 ? (
        <>
          <label className="text-xs text-zinc-600" htmlFor={languageSelectId}>
            {t("videos.bundle.language")}
          </label>
          <select
            id={languageSelectId}
            value={selectedLanguageCode}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900"
          >
            {catalog.languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </>
      ) : null}

      {versionOptions.length > 0 ? (
        <>
          <label className="text-xs text-zinc-600" htmlFor={versionSelectId}>
            {t("videos.bundle.version")}
          </label>
          <select
            id={versionSelectId}
            value={selectedSelectionKey ?? versionOptions[versionOptions.length - 1]?.selectionKey ?? ""}
            onChange={(e) => onVersionChange(e.target.value)}
            className="max-w-[12rem] rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900"
          >
            {versionOptions.map((slot) => (
              <option key={slot.selectionKey} value={slot.selectionKey}>
                {slot.displayLabel}
              </option>
            ))}
          </select>
        </>
      ) : null}
    </div>
  );
}
