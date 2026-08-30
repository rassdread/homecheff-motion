/**
 * Studio UI locale — client dictionaries + ecosystem IP/cookie preference.
 * Parity with Marketplace/Growth: NL/BE/SR → nl, else en; preference wins.
 */

import { en } from "./locales/en";
import { nl } from "./locales/nl";
import {
  ECOSYSTEM_LOCALE_COOKIE,
  ECOSYSTEM_LOCALE_PREF_COOKIE,
  MARKETPLACE_LEGACY_LOCALE_COOKIE,
  formatEcosystemLocaleDocumentCookies,
  parseEcosystemLanguage,
  shouldUseSharedHomecheffLocaleDomain,
  type EcosystemLanguage,
} from "@/lib/ecosystem-locale";

export const DEFAULT_LOCALE = "en" as const;
export const SUPPORTED_LOCALES = ["nl", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type TranslationKey = keyof typeof nl;

export type TranslationParams = Record<string, string | number> & {
  defaultValue?: string;
};

const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  nl,
  en,
};

const LOCALE_STORAGE_KEY = "hc-locale";
const localeListeners = new Set<() => void>();
let activeLocale: Locale = DEFAULT_LOCALE;
let localeInitialized = false;
let i18nHydrated = false;

function isDevEnvironment(): boolean {
  return process.env.NODE_ENV === "development";
}

function readBrowserLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split("; ");
  let eco: Locale | null = null;
  let legacy: Locale | null = null;
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const name = p.slice(0, idx).trim();
    const raw = decodeURIComponent(p.slice(idx + 1).trim());
    const parsed = parseEcosystemLanguage(raw);
    if (!parsed) continue;
    if (name === ECOSYSTEM_LOCALE_COOKIE) eco = parsed;
    if (name === MARKETPLACE_LEGACY_LOCALE_COOKIE || name === "hc_locale") {
      legacy = parsed;
    }
  }
  return eco ?? legacy;
}

function writeBrowserLocaleCookie(locale: Locale, explicit: boolean): void {
  if (typeof document === "undefined") return;
  const host = window.location.hostname;
  const domain = shouldUseSharedHomecheffLocaleDomain(host)
    ? ".homecheff.eu"
    : undefined;
  const secure = window.location.protocol === "https:";
  for (const line of formatEcosystemLocaleDocumentCookies({
    language: locale as EcosystemLanguage,
    explicit,
    domain,
    secure,
  })) {
    document.cookie = line;
  }
  const maxAge = 60 * 60 * 24 * 400;
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
  const domainPart = domain ? `; Domain=${domain}` : "";
  const securePart = secure ? "; Secure" : "";
  document.cookie = `${MARKETPLACE_LEGACY_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${maxAge}; Expires=${expires}; SameSite=Lax${securePart}${domainPart}`;
}

/** Call once after client mount so SSR and first paint both use DEFAULT_LOCALE / cookie. */
export function markI18nHydrated(): void {
  if (typeof window === "undefined" || i18nHydrated) {
    return;
  }
  i18nHydrated = true;
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  const fromCookie = readBrowserLocaleCookie();
  const prefExplicit = document.cookie
    .split("; ")
    .some((r) => r.startsWith(`${ECOSYSTEM_LOCALE_PREF_COOKIE}=1`));

  if (saved === "nl" || saved === "en") {
    activeLocale = saved;
    writeBrowserLocaleCookie(saved, true);
  } else if (fromCookie) {
    activeLocale = fromCookie;
    writeBrowserLocaleCookie(fromCookie, prefExplicit);
  } else {
    // Fail-safe English (middleware should have seeded cookie from IP already)
    activeLocale = DEFAULT_LOCALE;
    writeBrowserLocaleCookie(DEFAULT_LOCALE, false);
  }
  localeInitialized = true;
  localeListeners.forEach((listener) => listener());
}

export function interpolate(
  template: unknown,
  params?: Record<string, string | number>
): string {
  if (typeof template !== "string") {
    return "";
  }
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = params[token];
    return value === undefined ? `{${token}}` : String(value);
  });
}

function resolveTranslationTemplate(locale: Locale, key: string): string | undefined {
  const value = (dictionaries[locale] as Record<string, string | undefined>)[key];
  return typeof value === "string" ? value : undefined;
}

export function getTranslator(locale: Locale = DEFAULT_LOCALE) {
  return function t(key: TranslationKey, params?: TranslationParams): string {
    const defaultValue = params?.defaultValue;
    const interpolationParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(([paramKey]) => paramKey !== "defaultValue")
        )
      : undefined;

    const template = resolveTranslationTemplate(locale, key);
    if (template === undefined) {
      if (isDevEnvironment()) {
        console.warn("[i18n] Missing key", key);
      }
      const fallback =
        typeof defaultValue === "string" && defaultValue.length > 0 ? defaultValue : key;
      return interpolate(fallback, interpolationParams);
    }

    return interpolate(template, interpolationParams);
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
    writeBrowserLocaleCookie(locale, true);
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
