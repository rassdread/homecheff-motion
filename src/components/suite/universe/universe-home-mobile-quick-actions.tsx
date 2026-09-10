"use client";

import Link from "next/link";
import { useMemo } from "react";
import { UniversePlanetIcon } from "@/components/suite/universe/universe-planet-icon";
import { useActiveTranslator } from "@/i18n/client";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";
import { UNIVERSE_PLANETS } from "@/lib/universe-home-config";
import {
  resolveUniversePlanetHrefs,
  resolveUniversePrimaryCtaHref,
  resolveUniversePrimaryCtaKey,
  resolveUniverseSecondaryCtaHref,
  resolveUniverseSecondaryCtaKey,
  resolveUniverseStartProjectHref,
} from "@/lib/universe-public-landing";

type Props = {
  isAuthenticated: boolean;
};

/**
 * Mobile / tablet-portrait replacement for the desktop orbital planet nav.
 * Destinations match UNIVERSE_PLANETS (Beelden, Verhalen, Animatie, Afronden, Bibliotheek).
 * Primary/secondary CTAs live here below lg so they stay dominant without orbit clutter.
 */
export function UniverseHomeMobileQuickActions({ isAuthenticated }: Props) {
  const t = useActiveTranslator();
  const hrefs = useMemo(
    () => resolveUniversePlanetHrefs(isAuthenticated),
    [isAuthenticated]
  );

  return (
    <section
      className="border-t border-white/10 px-4 py-6 lg:hidden"
      data-testid="home-mobile-quick-actions"
      aria-label={t("universe.mobile.productNav")}
    >
      <div
        className="mx-auto flex w-full max-w-lg flex-col gap-2"
        data-testid="home-mobile-ctas"
      >
        {isAuthenticated ? (
          <>
            <Link
              href={resolveUniversePrimaryCtaHref(true)}
              prefetch={false}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-5 py-3 text-sm font-semibold text-white shadow-lg"
              onClick={() =>
                trackBillingConversionEvent("conversion_surface_impression", {
                  source: "home_mobile_primary_cta",
                })
              }
            >
              {t(resolveUniversePrimaryCtaKey(true))}
            </Link>
            <Link
              href={resolveUniverseSecondaryCtaHref(true)}
              prefetch={false}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white"
            >
              {t(resolveUniverseSecondaryCtaKey(true))}
            </Link>
          </>
        ) : (
          <>
            <Link
              href={resolveUniverseStartProjectHref(false)}
              prefetch={false}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-5 py-3 text-sm font-semibold text-white shadow-lg"
              onClick={() =>
                trackBillingConversionEvent("conversion_surface_impression", {
                  source: "home_mobile_primary_cta",
                })
              }
            >
              {t(resolveUniversePrimaryCtaKey(false))}
            </Link>
            <Link
              href="/pricing"
              prefetch={false}
              onClick={() =>
                trackBillingConversionEvent("pricing_view", { source: "home_mobile_secondary_cta" })
              }
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white"
            >
              {t("billing.conversion.viewPlans")}
            </Link>
          </>
        )}
      </div>

      <h2 className="mx-auto mt-6 max-w-lg text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
        {t("universe.mobile.productNav")}
      </h2>

      <nav
        className="mx-auto mt-3 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2"
        aria-label={t("universe.mobile.productNav")}
        data-testid="home-mobile-product-nav"
      >
        {UNIVERSE_PLANETS.map((planet) => (
          <Link
            key={planet.id}
            href={hrefs[planet.id]}
            prefetch={false}
            data-testid={`home-mobile-planet-${planet.id}`}
            className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-left transition hover:border-white/25 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white"
              style={{ boxShadow: `0 0 16px ${planet.accent}33` }}
              aria-hidden
            >
              <UniversePlanetIcon id={planet.id} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">
                {t(planet.titleKey)}
              </span>
              <span className="mt-0.5 block truncate text-xs text-white/60">
                {t(planet.themeKey)}
              </span>
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
