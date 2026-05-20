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

const LOCALE_STORAGE_KEY = "hc-locale";
const localeListeners = new Set<() => void>();
let activeLocale: Locale = DEFAULT_LOCALE;
let localeInitialized = false;
let i18nHydrated = false;

/** Call once after client mount so SSR and first paint both use DEFAULT_LOCALE. */
export function markI18nHydrated(): void {
  if (typeof window === "undefined" || i18nHydrated) {
    return;
  }
  i18nHydrated = true;
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === "nl" || saved === "en") {
    activeLocale = saved;
  } else {
    const navigatorLocale = window.navigator.language.toLowerCase();
    activeLocale = navigatorLocale.startsWith("nl") ? "nl" : DEFAULT_LOCALE;
  }
  localeInitialized = true;
  localeListeners.forEach((listener) => listener());
}

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
  if (typeof window === "undefined" || !i18nHydrated) {
    return DEFAULT_LOCALE;
  }
  if (!localeInitialized) {
    markI18nHydrated();
  }
  return activeLocale;
}

export function setActiveLocale(locale: Locale): void {
  if (activeLocale === locale) {
    return;
  }
  activeLocale = locale;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
  localeListeners.forEach((listener) => listener());
}

export function subscribeLocale(listener: () => void): () => void {
  localeListeners.add(listener);
  return () => {
    localeListeners.delete(listener);
  };
}

export function getActiveTranslator() {
  return getTranslator(getActiveLocale());
}

export const t = getActiveTranslator();
