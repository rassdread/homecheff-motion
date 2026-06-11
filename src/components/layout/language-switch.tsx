"use client";

import { SUPPORTED_LOCALES } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

const LOCALE_STYLES = {
  nl: {
    active:
      "rounded-full bg-gradient-to-r from-[#AE1C28] via-white to-[#21468B] px-2.5 py-1 text-[11px] font-bold text-[#041428] shadow-[0_0_12px_rgba(174,28,40,0.45)] sm:text-xs",
    inactive:
      "rounded-full px-2.5 py-1 text-[11px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:text-xs",
  },
  en: {
    active:
      "rounded-full bg-gradient-to-r from-[#21468B] to-[#AE1C28] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_0_12px_rgba(33,70,139,0.45)] sm:text-xs",
    inactive:
      "rounded-full px-2.5 py-1 text-[11px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:text-xs",
  },
} as const;

export function LanguageSwitch() {
  const [locale, setLocale] = useLocale();

  return (
    <div className={studioVisual.langSwitch} role="group" aria-label="Language">
      {SUPPORTED_LOCALES.map((option) => {
        const styles = LOCALE_STYLES[option];
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            className={locale === option ? styles.active : styles.inactive}
            aria-pressed={locale === option}
            data-lang={option}
          >
            {option.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
