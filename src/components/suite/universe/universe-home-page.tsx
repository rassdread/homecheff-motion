"use client";

import { useMemo } from "react";
import { UniverseBackground } from "@/components/suite/universe/universe-background";
import { UniverseHeroCopy } from "@/components/suite/universe/universe-hero-copy";
import { UniverseDestinationLinks } from "@/components/suite/universe/universe-destination-links";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useUniverseParallax } from "@/hooks/use-universe-parallax";
import { UniverseHomeMobileQuickActions } from "@/components/suite/universe/universe-home-mobile-quick-actions";
import { UniverseHomeSections } from "@/components/suite/universe/universe-home-sections";
import { ConversionSurface, GuestConversionStrip } from "@/components/billing/conversion-surface";
import "./universe-home.css";
import { growthSidebarLayoutClasses } from "@/lib/growth-sidebar-layout";
import { CANONICAL_HOMEPAGE_COMPONENT, resolveHomepageAuthMode } from "@/lib/homepage-render-trace";

/**
 * Canonical "/" homepage — AI-first entry, no decorative orbit/planet navigation.
 * Former planet destinations remain via UniverseDestinationLinks + sections.
 */
export function UniverseHomePage() {
  const session = useAuthSession();
  const isAuthenticated = Boolean(session.resolved && session.user);
  const reducedMotion = useReducedMotion();
  const parallax = useUniverseParallax(!reducedMotion);

  const authMode = useMemo(
    () =>
      resolveHomepageAuthMode({
        resolved: session.resolved,
        hasUser: Boolean(session.user),
      }),
    [session.resolved, session.user]
  );
  const pageMarker = authMode === "logged-in" ? "studio-homepage" : "public-homepage";

  return (
    <div
      className={`universe-animate ${growthSidebarLayoutClasses.pageRoot} flex flex-col overflow-x-hidden text-white`}
      data-testid="universe-home-page"
      data-page={pageMarker}
      data-homepage-component={CANONICAL_HOMEPAGE_COMPONENT}
      data-auth-mode={authMode}
    >
      <UniverseBackground reducedMotion={reducedMotion} parallax={parallax} />

      <div className="relative z-10 w-full">
        <section className="home-hero-grid" data-testid="home-hero-grid">
          <div className="home-hero-copy min-w-0">
            <UniverseHeroCopy
              isAuthenticated={isAuthenticated}
              email={session.user?.email}
              reducedMotion={reducedMotion}
            />
          </div>

          <div className="home-universe-zone hidden md:flex md:items-start md:justify-end" data-testid="home-universe-zone">
            <UniverseDestinationLinks isAuthenticated={isAuthenticated} />
          </div>
        </section>

        <UniverseHomeMobileQuickActions isAuthenticated={isAuthenticated} />

        <div className="mx-auto block w-full max-w-4xl px-4 pb-2 pt-4 md:hidden">
          <UniverseDestinationLinks isAuthenticated={isAuthenticated} />
        </div>

        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6" data-testid="home-conversion-block">
          {isAuthenticated ? (
            <ConversionSurface pageType="homepage" variant="hero" source="homepage_showcase" />
          ) : (
            <GuestConversionStrip source="homepage_showcase" variant="hero" />
          )}
        </div>

        <section className="home-after-hero" data-testid="home-after-hero">
          <UniverseHomeSections />
        </section>
      </div>
    </div>
  );
}
