"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UniverseOrbitSystem } from "@/components/suite/universe/universe-orbit-system";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useUniverseParallax } from "@/hooks/use-universe-parallax";
import type { UniversePlanetConfig, UniversePlanetId } from "@/lib/universe-home-config";
import { resolveUniversePlanetHrefs } from "@/lib/universe-public-landing";
import { UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS, UNIVERSE_PLANET_HOVER_LOCK_MS } from "@/lib/universe-planet-ux";

/** Full interactive universe widget (globe + planets + orbit) — compact for service landings. */
export function UniverseLandingOrbitWidget() {
  const router = useRouter();
  const session = useAuthSession();
  const isAuthenticated = Boolean(session.resolved && session.user);
  const reducedMotion = useReducedMotion();
  const parallax = useUniverseParallax(!reducedMotion);
  const hoverCloseTimer = useRef<number | undefined>(undefined);
  const hoverOpenedAt = useRef(0);

  const planetHrefs = useMemo(() => resolveUniversePlanetHrefs(isAuthenticated), [isAuthenticated]);
  const [hoveredPlanet, setHoveredPlanet] = useState<UniversePlanetId | null>(null);
  const [focusedPlanet, setFocusedPlanet] = useState<UniversePlanetId | null>(null);

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
    hoverCloseTimer.current = window.setTimeout(() => {
      setHoveredPlanet(null);
    }, UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS);
  }, [clearHoverCloseTimer]);

  const handlePlanetSelect = useCallback(
    (planet: UniversePlanetConfig) => {
      if (Date.now() - hoverOpenedAt.current < UNIVERSE_PLANET_HOVER_LOCK_MS) {
        return;
      }
      const href = planetHrefs[planet.id];
      if (href) router.push(href);
    },
    [planetHrefs, router]
  );

  return (
    <div className="pointer-events-auto w-full" data-testid="universe-landing-orbit-widget">
      <UniverseOrbitSystem
        hrefs={planetHrefs}
        hoveredPlanet={hoveredPlanet}
        focusedPlanet={focusedPlanet}
        reducedMotion={reducedMotion}
        parallax={parallax}
        size="compact"
        onHoverStart={handlePlanetHoverStart}
        onHoverEnd={handlePlanetHoverEnd}
        onFocus={setFocusedPlanet}
        onSelect={handlePlanetSelect}
      />
    </div>
  );
}
