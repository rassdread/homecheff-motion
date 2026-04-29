"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_LOCALE,
  getActiveLocale,
  getTranslator,
  setActiveLocale,
  subscribeLocale,
  type Locale,
} from "@/i18n";

export function useLocale(): [Locale, (locale: Locale) => void] {
  const locale = useSyncExternalStore(
    subscribeLocale,
    () => getActiveLocale(),
    () => DEFAULT_LOCALE
  );
  return [locale, setActiveLocale];
}

export function useActiveTranslator() {
  const [locale] = useLocale();
  return getTranslator(locale);
}
