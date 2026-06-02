"use client";

import { useEffect } from "react";
import { useLocale } from "@/i18n/client";

/** Keep document lang in sync with the active locale for accessibility and typography. */
export function I18nHtmlLangSync() {
  const [locale] = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
