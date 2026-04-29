"use client";

import { SUPPORTED_LOCALES } from "@/i18n";
import { useLocale } from "@/i18n/client";

export function LanguageSwitch() {
  const [locale, setLocale] = useLocale();

  return (
    <div className="flex items-center rounded-full border border-zinc-200 bg-white p-0.5">
      {SUPPORTED_LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs ${
            locale === option
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
          aria-pressed={locale === option}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
