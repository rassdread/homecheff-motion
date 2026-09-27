"use client";

import { createContext, createElement, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  getActiveLocale,
  getTranslator,
  isI18nHydrated,
  setActiveLocale,
  subscribeLocale,
  type Locale,
} from "@/i18n";

const LocaleSeedContext = createContext<Locale>(DEFAULT_LOCALE);

/** Server-resolved locale so the first paint matches html lang, not a hardcoded English snapshot. */
export function LocaleSeedProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return createElement(LocaleSeedContext.Provider, { value: locale }, children);
}

export function useLocale(): [Locale, (locale: Locale) => void] {
  const seeded = useContext(LocaleSeedContext);
  const locale = useSyncExternalStore(
    subscribeLocale,
    () => (isI18nHydrated() ? getActiveLocale() : seeded),
    () => seeded,
  );
  return [locale, setActiveLocale];
}

export function useActiveTranslator() {
  const [locale] = useLocale();
  return useMemo(() => getTranslator(locale), [locale]);
}
