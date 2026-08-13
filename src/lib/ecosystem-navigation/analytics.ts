/**
 * Ecosystem discovery analytics for Studio — no PII.
 * Uses dataLayer when present; otherwise no-op (Studio has no GA shell).
 */

import type { EcosystemNavSurface, EcosystemProductId } from "./contract";

function viewportBucket(): "desktop" | "mobile" {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}

function emit(eventName: string, params: Record<string, string | number>): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  };
  if (typeof w.gtag === "function") {
    try {
      w.gtag("event", eventName, params);
    } catch {
      /* ignore */
    }
  }
  if (!w.dataLayer) w.dataLayer = [];
  w.dataLayer.push({ event: eventName, ...params });
}

export function trackEcosystemMenuOpen(input: {
  sourceProduct: EcosystemProductId;
  authenticated: boolean;
  surface: EcosystemNavSurface;
}): void {
  emit("ecosystem_menu_open", {
    sourceProduct: input.sourceProduct,
    authenticated: input.authenticated ? "1" : "0",
    surface: input.surface,
    viewport: viewportBucket(),
  });
}

export function trackEcosystemProductClick(input: {
  sourceProduct: EcosystemProductId;
  targetProduct: EcosystemProductId;
  authenticated: boolean;
  surface: EcosystemNavSurface;
}): void {
  emit("ecosystem_product_click", {
    sourceProduct: input.sourceProduct,
    targetProduct: input.targetProduct,
    authenticated: input.authenticated ? "1" : "0",
    surface: input.surface,
    viewport: viewportBucket(),
  });
}
