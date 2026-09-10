"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UniverseBackground } from "@/components/suite/universe/universe-background";
import { UniverseHeroCopy } from "@/components/suite/universe/universe-hero-copy";
import { UniverseOrbitSystem } from "@/components/suite/universe/universe-orbit-system";
import { UniverseTunnelOverlay } from "@/components/suite/universe/universe-tunnel-overlay";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useUniverseParallax } from "@/hooks/use-universe-parallax";
import type { UniversePlanetConfig, UniversePlanetId } from "@/lib/universe-home-config";
import {
  resolveUniversePlanetHrefs,
} from "@/lib/universe-public-landing";
import { UniverseHomeMobileQuickActions } from "@/components/suite/universe/universe-home-mobile-quick-actions";
import { UniverseHomeSections } from "@/components/suite/universe/universe-home-sections";
import { UniverseHomeSpaceShowcase } from "@/components/suite/universe/universe-home-space-showcase";
import { ConversionSurface, GuestConversionStrip } from "@/components/billing/conversion-surface";
import {
  UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS,
  UNIVERSE_PLANET_HOVER_LOCK_MS,
  resolveUniverseOrbitDebug,
  resolveUniversePlanetVisualDebug,
} from "@/lib/universe-planet-ux";
import { resolveUniverseGlobeDebugLayer, type UniverseGlobeDebugLayer } from "@/lib/universe-globe-render";
import { resolveUniverseGlobeProjectionDebug } from "@/lib/universe-globe-projection";
import "./universe-home.css";
import { growthSidebarLayoutClasses } from "@/lib/growth-sidebar-layout";
import { CANONICAL_HOMEPAGE_COMPONENT, resolveHomepageAuthMode } from "@/lib/homepage-render-trace";

const TUNNEL_DURATION_MS = 820;

export function UniverseHomePage() {
  const router = useRouter();
  const [globeDebugLayer] = useState<UniverseGlobeDebugLayer | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return resolveUniverseGlobeDebugLayer(
      new URLSearchParams(window.location.search).get("universeDebug")
    );
  });
  const [planetVisualDebug] = useState<UniversePlanetId | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return resolveUniversePlanetVisualDebug(
      new URLSearchParams(window.location.search).get("universePlanetDebug")
    );
  });
  const [orbitDebug] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return resolveUniverseOrbitDebug(
      new URLSearchParams(window.location.search).get("universeOrbitDebug")
    );
  });
  const [globeProjectionDebug] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return resolveUniverseGlobeProjectionDebug(
      new URLSearchParams(window.location.search).get("globeProjectionDebug")
    );
  });
  const session = useAuthSession();
  const isAuthenticated = Boolean(session.resolved && session.user);
  const reducedMotion = useReducedMotion();
  const parallax = useUniverseParallax(!reducedMotion);
  const hoverCloseTimer = useRef<number | undefined>(undefined);
  const hoverOpenedAt = useRef<number>(0);

  const planetHrefs = useMemo(
    () => resolveUniversePlanetHrefs(isAuthenticated),
    [isAuthenticated]
  );

  const [hoveredPlanet, setHoveredPlanet] = useState<UniversePlanetId | null>(null);
  const [focusedPlanet, setFocusedPlanet] = useState<UniversePlanetId | null>(null);
  const effectiveHoveredPlanet = planetVisualDebug ?? hoveredPlanet;
  const effectiveFocusedPlanet = planetVisualDebug ?? focusedPlanet;
  const [tunnelPlanet, setTunnelPlanet] = useState<UniversePlanetConfig | null>(null);

  const clearHoverCloseTimer = useCallback(() => {
    if (hoverCloseTimer.current !== undefined) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = undefined;
    }
  }, []);

  const handlePlanetHoverStart = useCallback(
    (id: UniversePlanetId) => {
      clearHoverCloseTimer();
      hoverOpenedAt.current = Date.now();
      setHoveredPlanet(id);
    },
    [clearHoverCloseTimer]
  );

  const handlePlanetHoverEnd = useCallback(() => {
    clearHoverCloseTimer();
    const elapsed = Date.now() - hoverOpenedAt.current;
    const lockRemaining = Math.max(0, UNIVERSE_PLANET_HOVER_LOCK_MS - elapsed);
    const waitMs = Math.max(UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS, lockRemaining);
    hoverCloseTimer.current = window.setTimeout(() => {
      setHoveredPlanet(null);
      hoverCloseTimer.current = undefined;
    }, waitMs);
  }, [clearHoverCloseTimer]);

  const navigateWithTunnel = useCallback(
    (href: string, planet?: UniversePlanetConfig) => {
      if (reducedMotion || !planet) {
        router.push(href);
        return;
      }
      setTunnelPlanet(planet);
      window.setTimeout(() => {
        router.push(href);
      }, TUNNEL_DURATION_MS);
    },
    [reducedMotion, router]
  );

  const handlePlanetSelect = useCallback(
    (planet: UniversePlanetConfig) => {
      clearHoverCloseTimer();
      navigateWithTunnel(planetHrefs[planet.id], planet);
    },
    [clearHoverCloseTimer, navigateWithTunnel, planetHrefs]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearHoverCloseTimer();
        setHoveredPlanet(null);
        setFocusedPlanet(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearHoverCloseTimer();
      setTunnelPlanet(null);
    };
  }, [clearHoverCloseTimer]);

  const authMode = resolveHomepageAuthMode({
    resolved: session.resolved,
    hasUser: Boolean(session.user),
  });
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

          <div className="home-universe-zone hidden md:flex" data-testid="home-universe-zone">
            <div className="home-universe-canvas w-full">
              <UniverseOrbitSystem
                hrefs={planetHrefs}
                hoveredPlanet={effectiveHoveredPlanet}
                focusedPlanet={effectiveFocusedPlanet}
                reducedMotion={reducedMotion}
                parallax={parallax}
                globeDebugLayer={globeDebugLayer}
                globeProjectionDebug={globeProjectionDebug}
                orbitDebug={orbitDebug}
                onHoverStart={handlePlanetHoverStart}
                onHoverEnd={handlePlanetHoverEnd}
                onFocus={setFocusedPlanet}
                onSelect={handlePlanetSelect}
              />
            </div>
          </div>
        </section>

        <UniverseHomeMobileQuickActions isAuthenticated={isAuthenticated} />

        <div className="hidden md:block">
          <UniverseHomeSpaceShowcase />
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

      {tunnelPlanet && (
        <UniverseTunnelOverlay planet={tunnelPlanet} reducedMotion={reducedMotion} />
      )}
    </div>
  );
}
