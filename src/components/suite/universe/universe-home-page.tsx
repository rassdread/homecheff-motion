"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UniverseBackground } from "@/components/suite/universe/universe-background";
import { UniverseDynamicWelcome } from "@/components/suite/universe/universe-dynamic-welcome";
import { UniverseEcosystemStory } from "@/components/suite/universe/universe-ecosystem-story";
import { UniverseMobileStack } from "@/components/suite/universe/universe-mobile-stack";
import { UniverseOrbitSystem } from "@/components/suite/universe/universe-orbit-system";
import { UniverseQuickActions } from "@/components/suite/universe/universe-quick-actions";
import { UniverseTunnelOverlay } from "@/components/suite/universe/universe-tunnel-overlay";
import { useAuthActionHref } from "@/hooks/use-auth-action-href";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useUniverseParallax } from "@/hooks/use-universe-parallax";
import { useActiveTranslator } from "@/i18n/client";
import type { UniversePlanetConfig, UniversePlanetId } from "@/lib/universe-home-config";
import "./universe-home.css";

const TUNNEL_DURATION_MS = 820;

export function UniverseHomePage() {
  const t = useActiveTranslator();
  const router = useRouter();
  const session = useAuthSession();
  const reducedMotion = useReducedMotion();
  const parallax = useUniverseParallax(!reducedMotion);

  const editorHref = useAuthActionHref("/editor");
  const studioHref = useAuthActionHref("/studio");
  const motionHref = useAuthActionHref("/animate/instant");
  const publishHref = useAuthActionHref("/publish");
  const libraryHref = useAuthActionHref("/library");
  const storyHref = useAuthActionHref("/studio/storyboards/new");

  const planetHrefs = useMemo<Record<UniversePlanetId, string>>(
    () => ({
      editor: editorHref,
      studio: studioHref,
      motion: motionHref,
      publish: publishHref,
      library: libraryHref,
    }),
    [editorHref, studioHref, motionHref, publishHref, libraryHref]
  );

  const quickHrefs = useMemo(
    () => ({
      createCharacter: editorHref,
      createStory: storyHref,
      animateImages: motionHref,
      publishVideo: publishHref,
      openLibrary: libraryHref,
    }),
    [editorHref, storyHref, motionHref, publishHref, libraryHref]
  );

  const [hoveredPlanet, setHoveredPlanet] = useState<UniversePlanetId | null>(null);
  const [focusedPlanet, setFocusedPlanet] = useState<UniversePlanetId | null>(null);
  const [tunnelPlanet, setTunnelPlanet] = useState<UniversePlanetConfig | null>(null);

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
      navigateWithTunnel(planetHrefs[planet.id], planet);
    },
    [navigateWithTunnel, planetHrefs]
  );

  const handleQuickNavigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
  );

  useEffect(() => {
    return () => setTunnelPlanet(null);
  }, []);

  return (
    <main className="universe-animate relative flex min-h-[calc(100dvh-4rem)] flex-1 flex-col overflow-x-hidden overflow-y-auto text-white">
      <UniverseBackground reducedMotion={reducedMotion} parallax={parallax} />

      <div className="relative z-10 flex flex-col items-center px-2 pb-8 pt-4 sm:px-4 sm:pt-6">
        <UniverseDynamicWelcome email={session.user?.email} reducedMotion={reducedMotion} />
        <p className="mb-2 text-center text-[11px] tracking-wide text-white/35 sm:text-xs">
          {t("universe.subtitle")}
        </p>

        <div className="hidden w-full md:block">
          <UniverseOrbitSystem
            hrefs={planetHrefs}
            hoveredPlanet={hoveredPlanet}
            focusedPlanet={focusedPlanet}
            reducedMotion={reducedMotion}
            parallax={parallax}
            onHover={setHoveredPlanet}
            onFocus={setFocusedPlanet}
            onSelect={handlePlanetSelect}
          />
        </div>

        <div className="w-full md:hidden">
          <UniverseMobileStack
            hrefs={planetHrefs}
            hoveredPlanet={hoveredPlanet}
            focusedPlanet={focusedPlanet}
            reducedMotion={reducedMotion}
            onHover={setHoveredPlanet}
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
