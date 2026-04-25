import { en } from "./locales/en";
import { nl } from "./locales/nl";

export const DEFAULT_LOCALE = "nl" as const;
export const SUPPORTED_LOCALES = ["nl", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type TranslationKey = keyof typeof nl;

const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  nl,
  en,
};

function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = params[token];
    return value === undefined ? `{${token}}` : String(value);
  });
}

export function getTranslator(locale: Locale = DEFAULT_LOCALE) {
  return function t(
    key: TranslationKey,
    params?: Record<string, string | number>
  ): string {
    return interpolate(dictionaries[locale][key], params);
  };
}

export function getActiveLocale(): Locale {
  return DEFAULT_LOCALE;
}

export function getActiveTranslator() {
  return getTranslator(getActiveLocale());
}

export const t = getActiveTranslator();
