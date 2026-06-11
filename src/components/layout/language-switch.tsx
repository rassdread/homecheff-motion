"use client";

import { SUPPORTED_LOCALES } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

export function LanguageSwitch() {
  const [locale, setLocale] = useLocale();

  return (
    <div className={studioVisual.langSwitch} role="group" aria-label="Language">
      {SUPPORTED_LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          className={
            locale === option ? studioVisual.langOptionActive : studioVisual.langOptionInactive
          }
          aria-pressed={locale === option}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
