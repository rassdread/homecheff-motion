"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  pickLatestMotionVersionSlot,
  type MotionVersionCatalog,
} from "@/lib/motion-version-catalog";
type Props = {
  catalog: MotionVersionCatalog;
  langFromUrl: string | null;
  verFromUrl: string | null;
  defaultLanguageCode: string;
  versionSelectId?: string;
  onSelectLatest: (languageCode: string, selectionKey: string, versionNumber: number) => void;
};

export function MotionDeepLinkWarning({
  catalog,
  langFromUrl,
  verFromUrl,
  defaultLanguageCode,
  versionSelectId = "detail-motion-version",
  onSelectLatest,
}: Props) {
  const t = useActiveTranslator();
  const languageCode =
    langFromUrl?.trim() && catalog.slotsByLanguage[langFromUrl.trim()]
      ? langFromUrl.trim()
      : defaultLanguageCode;
  const latest = pickLatestMotionVersionSlot(catalog, languageCode);

  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
      role="alert"
    >
      <p className="text-sm font-medium text-amber-950">{t("projects.deepLink.versionNotFound")}</p>
      <p className="mt-1 text-xs text-amber-900/90">
        {langFromUrl || verFromUrl
          ? `?lang=${langFromUrl ?? ""}&ver=${verFromUrl ?? ""}`
          : null}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {latest ? (
          <button
            type="button"
            onClick={() =>
              onSelectLatest(languageCode, latest.selectionKey, latest.versionNumber)
            }
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100"
          >
            {t("projects.deepLink.selectLatest", {
              label: `${latest.languageLabel} ${latest.displayLabel}`,
            })}
          </button>
        ) : null}
        <label
          htmlFor={versionSelectId}
          className="inline-flex cursor-pointer items-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100"
        >
          {t("projects.deepLink.openDropdown")}
        </label>
      </div>
    </div>
  );
}

