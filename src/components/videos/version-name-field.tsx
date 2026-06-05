"use client";

import { useEffect, useMemo, useRef } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  collectVersionNamesFromCatalog,
  suggestDefaultVersionName,
  validateVersionNameInput,
} from "@/lib/smart-version-naming";
import type { MotionVersionCatalog } from "@/lib/motion-version-catalog";

type Props = {
  value: string;
  onChange: (value: string) => void;
  languageCode?: string;
  bundleCatalog?: MotionVersionCatalog | null;
  /** When true, prefill with bundle-aware default if value is empty. */
  autoSuggest?: boolean;
  disabled?: boolean;
  className?: string;
};

export function VersionNameField({
  value,
  onChange,
  languageCode = "nl",
  bundleCatalog = null,
  autoSuggest = true,
  disabled = false,
  className = "",
}: Props) {
  const t = useActiveTranslator();
  const didAutoSuggest = useRef(false);

  const existingNames = useMemo(
    () => collectVersionNamesFromCatalog(bundleCatalog),
    [bundleCatalog]
  );

  const suggestedDefault = useMemo(
    () =>
      suggestDefaultVersionName({
        languageCode,
        catalog: bundleCatalog,
      }),
    [languageCode, bundleCatalog]
  );

  useEffect(() => {
    if (!autoSuggest || didAutoSuggest.current || value.trim()) {
      return;
    }
    didAutoSuggest.current = true;
    onChange(suggestedDefault);
  }, [autoSuggest, value, suggestedDefault, onChange]);

  const validation = validateVersionNameInput(value, existingNames);

  return (
    <label className={`block text-sm text-zinc-700 ${className}`}>
      <span className="font-medium">{t("projects.versionName.label")}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        placeholder={suggestedDefault}
      />
      <p className="mt-1 text-xs text-zinc-500">{t("projects.versionName.hint")}</p>
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
  );
}
