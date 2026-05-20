"use client";

import { useEffect } from "react";
import { markI18nHydrated } from "@/i18n";

/** Sync locale from localStorage after first paint — avoids SSR/client text mismatch. */
export function I18nHydrationSync() {
  useEffect(() => {
    markI18nHydrated();
  }, []);
  return null;
}
