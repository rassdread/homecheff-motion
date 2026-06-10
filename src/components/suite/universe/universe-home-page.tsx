"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UniverseBackground } from "@/components/suite/universe/universe-background";
import { UniverseDifferentiation } from "@/components/suite/universe/universe-differentiation";
import { UniverseProductionLine } from "@/components/suite/universe/universe-production-line";
import { UniverseHeroCopy } from "@/components/suite/universe/universe-hero-copy";
import { UniverseMobileStack } from "@/components/suite/universe/universe-mobile-stack";
import { UniverseOrbitSystem } from "@/components/suite/universe/universe-orbit-system";
import { UniverseQuickActions } from "@/components/suite/universe/universe-quick-actions";
import { UniverseTunnelOverlay } from "@/components/suite/universe/universe-tunnel-overlay";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useUniverseParallax } from "@/hooks/use-universe-parallax";
import type { UniversePlanetConfig, UniversePlanetId } from "@/lib/universe-home-config";
import {
  resolveUniversePlanetHrefs,
  resolveUniverseQuickActionHref,
} from "@/lib/universe-public-landing";
import {
  UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS,
  UNIVERSE_PLANET_HOVER_LOCK_MS,
  resolveUniverseOrbitDebug,
  resolveUniversePlanetVisualDebug,
} from "@/lib/universe-planet-ux";
import { resolveUniverseGlobeDebugLayer, type UniverseGlobeDebugLayer } from "@/lib/universe-globe-render";
import { resolveUniverseGlobeProjectionDebug } from "@/lib/universe-globe-projection";
import { UNIVERSE_QUICK_ACTIONS } from "@/lib/universe-home-config";
import "./universe-home.css";

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

  const quickHrefs = useMemo(() => {
    const map: Record<string, string> = {};
    for (const action of UNIVERSE_QUICK_ACTIONS) {
      if (action.id === "createCharacter") map[action.id] = resolveUniverseQuickActionHref("/editor", isAuthenticated);
      else if (action.id === "createStory")
        map[action.id] = resolveUniverseQuickActionHref("/studio/storyboards/new", isAuthenticated);
      else if (action.id === "animateImages")
        map[action.id] = resolveUniverseQuickActionHref("/animate/instant", isAuthenticated);
      else if (action.id === "publishVideo")
        map[action.id] = resolveUniverseQuickActionHref("/publish", isAuthenticated);
      else if (action.id === "openLibrary")
        map[action.id] = resolveUniverseQuickActionHref("/library", isAuthenticated);
    }
    return map;
  }, [isAuthenticated]);

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

  const handleQuickNavigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
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

  return (
    <main className="universe-animate relative flex min-h-[calc(100dvh-4rem)] flex-1 flex-col overflow-x-hidden overflow-y-auto text-white">
      <UniverseBackground reducedMotion={reducedMotion} parallax={parallax} />

      <div className="relative z-10 mx-auto w-full max-w-[min(100%,1440px)] px-3 pb-4 pt-3 sm:px-5 sm:pt-4">
        <div className="universe-home-hero-orbit flex flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="universe-hero-column w-full shrink-0 lg:max-w-md xl:max-w-lg">
            <UniverseHeroCopy
              isAuthenticated={isAuthenticated}
              email={session.user?.email}
              reducedMotion={reducedMotion}
            />
          </div>

          <div className="universe-orbit-column hidden min-w-0 flex-1 md:block">
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

        <div className="w-full md:hidden">
          <UniverseMobileStack
            hrefs={planetHrefs}
            expandedPlanet={effectiveHoveredPlanet}
            focusedPlanet={effectiveFocusedPlanet}
            reducedMotion={reducedMotion}
            onExpand={handlePlanetHoverStart}
            onCollapse={handlePlanetHoverEnd}
            onFocus={setFocusedPlanet}
            onSelect={handlePlanetSelect}
          />
        </div>

        <div className="universe-dashboard-section">
          <UniverseProductionLine />
          <UniverseDifferentiation />
          <UniverseQuickActions hrefs={quickHrefs} onNavigate={handleQuickNavigate} />
        </div>
      </div>

      {tunnelPlanet && (
        <UniverseTunnelOverlay planet={tunnelPlanet} reducedMotion={reducedMotion} />
      )}
    </main>
  );
}
