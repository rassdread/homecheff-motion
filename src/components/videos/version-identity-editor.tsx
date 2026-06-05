"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { languageCodeToLabel } from "@/lib/draft-lineage";
import type { MotionVersionCatalog } from "@/lib/motion-version-catalog";
import {
  collectVersionNamesFromCatalog,
  validateVersionNameInput,
} from "@/lib/smart-version-naming";
import {
  formatVersionIdentityCurrentLabel,
  formatVersionIdentityResultLabel,
  suggestVersionNameForLanguage,
  VERSION_IDENTITY_LANGUAGE_CODES,
  type VersionIdentityLanguageCode,
} from "@/lib/version-identity";
import type { DraftLineageResponse } from "@/types/animation-api";

type Props = {
  lineage: DraftLineageResponse;
  targetLanguage: VersionIdentityLanguageCode;
  onTargetLanguageChange: (code: VersionIdentityLanguageCode) => void;
  versionName: string;
  onVersionNameChange: (value: string) => void;
  bundleCatalog?: MotionVersionCatalog | null;
  disabled?: boolean;
};

export function VersionIdentityEditor({
  lineage,
  targetLanguage,
  onTargetLanguageChange,
  versionName,
  onVersionNameChange,
  bundleCatalog = null,
  disabled = false,
}: Props) {
  const t = useActiveTranslator();

  const existingNames = useMemo(
    () => collectVersionNamesFromCatalog(bundleCatalog),
    [bundleCatalog]
  );

  const suggestedDefault = useMemo(
    () =>
      suggestVersionNameForLanguage({
        languageCode: targetLanguage,
        catalog: bundleCatalog,
      }),
    [targetLanguage, bundleCatalog]
  );

  const validation = validateVersionNameInput(versionName, existingNames);

  const currentLabel = formatVersionIdentityCurrentLabel({
    languageLabel: lineage.sourceLanguageLabel,
    versionDisplay: lineage.sourceVersionDisplay,
  });

  const resultLabel = formatVersionIdentityResultLabel(
    targetLanguage,
    versionName.trim() || suggestedDefault
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-zinc-700">
          <span className="font-medium">{t("projects.versionIdentity.targetLanguage")}</span>
          <select
            value={targetLanguage}
            disabled={disabled}
            onChange={(e) =>
              onTargetLanguageChange(e.target.value as VersionIdentityLanguageCode)
            }
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          >
            {VERSION_IDENTITY_LANGUAGE_CODES.map((code) => (
              <option key={code} value={code}>
                {languageCodeToLabel(code)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-zinc-700">
          <span className="font-medium">{t("projects.versionName.label")}</span>
          <input
            type="text"
            value={versionName}
            disabled={disabled}
            onChange={(e) => onVersionNameChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder={suggestedDefault}
          />
          <p className="mt-1 text-xs text-zinc-500">{t("projects.versionIdentity.suggestionHint")}</p>
          {validation.duplicate ?
            <p className="mt-1 text-xs text-amber-800" role="alert">
              {t("projects.versionName.duplicateWarning")}
              {validation.suggestion ?
                <>
                  {" "}
                  {t("projects.versionName.duplicateSuggestion", {
                    suggestion: validation.suggestion,
                  })}
                </>
              : null}
            </p>
          : null}
        </label>
      </div>

      <dl className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium">{t("projects.renderPreview.current")}</dt>
          <dd>{currentLabel}</dd>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-2">
          <dt className="font-medium">{t("projects.renderPreview.result")}</dt>
          <dd>{resultLabel}</dd>
        </div>
      </dl>
    </div>
  );
}
