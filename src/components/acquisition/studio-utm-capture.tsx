"use client";

import { useEffect } from "react";
import {
  captureStudioUtmFirstTouch,
  hasStudioUtmSignal,
} from "@/lib/acquisition/utm-persistence";

/**
 * Captures first-touch UTMs on Studio surfaces (essential attribution cookie).
 * Cookie always persists (no CMP). Emits GA `acquisition_landing` only when gtag/dataLayer exists.
 */
export function StudioUtmCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const capture = captureStudioUtmFirstTouch(params, window.location.pathname);
    if (!hasStudioUtmSignal(capture)) return;

    const w = window as Window & {
      gtag?: (...args: unknown[]) => void;
      dataLayer?: Record<string, unknown>[];
    };
    // Studio has no CMP — treat cookie as essential. Gate only analytics emission.
    const canEmitAnalytics = typeof w.gtag === "function" || Array.isArray(w.dataLayer);
    if (!canEmitAnalytics) return;

    const payload = {
      product: "studio",
      utm_source: capture!.utm_source,
      utm_medium: capture!.utm_medium,
      utm_campaign: capture!.utm_campaign,
      utm_content: capture!.utm_content,
      utm_term: capture!.utm_term,
      landing_path: capture!.landing_path,
    };
    try {
      if (typeof w.gtag === "function") {
        w.gtag("event", "acquisition_landing", payload);
      }
      if (!w.dataLayer) w.dataLayer = [];
      w.dataLayer.push({ event: "acquisition_landing", ...payload });
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}
