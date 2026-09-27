"use client";

import { useEffect } from "react";
import { markI18nHydrated } from "@/i18n";

/** After paint, keep the client store aligned with the explicit cookie without changing the first paint. */
export function I18nHydrationSync() {
  useEffect(() => {
    markI18nHydrated();
  }, []);
  return null;
}
