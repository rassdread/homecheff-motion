"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UniverseBackground } from "@/components/suite/universe/universe-background";
import { UniverseDynamicWelcome } from "@/components/suite/universe/universe-dynamic-welcome";
import { UniverseEcosystemStory } from "@/components/suite/universe/universe-ecosystem-story";
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
import { UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS, resolveUniverseOrbitDebug, resolveUniversePlanetVisualDebug } from "@/lib/universe-planet-ux";
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
      setHoveredPlanet(id);
    },
    [clearHoverCloseTimer]
  );

  const handlePlanetHoverEnd = useCallback(() => {
    clearHoverCloseTimer();
    hoverCloseTimer.current = window.setTimeout(() => {
      setHoveredPlanet(null);
      hoverCloseTimer.current = undefined;
    }, UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS);
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

      <div className="relative z-10 flex flex-col items-center px-2 pb-8 pt-4 sm:px-4 sm:pt-6">
        <UniverseHeroCopy
          isAuthenticated={isAuthenticated}
          email={session.user?.email}
          reducedMotion={reducedMotion}
        />

        <UniverseDynamicWelcome
          email={session.user?.email}
          isAuthenticated={isAuthenticated}
          reducedMotion={reducedMotion}
        />

        <div className="hidden w-full md:block">
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

        <div className="mt-6 w-full sm:mt-8">
          <UniverseQuickActions hrefs={quickHrefs} onNavigate={handleQuickNavigate} />
        </div>

        <UniverseEcosystemStory reducedMotion={reducedMotion} />
      </div>

      {tunnelPlanet && (
        <UniverseTunnelOverlay planet={tunnelPlanet} reducedMotion={reducedMotion} />
      )}
    </main>
  );
}
