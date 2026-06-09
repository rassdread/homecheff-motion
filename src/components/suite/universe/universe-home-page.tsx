"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UniverseBackground } from "@/components/suite/universe/universe-background";
import { UniverseMobileStack } from "@/components/suite/universe/universe-mobile-stack";
import { UniverseOrbitSystem } from "@/components/suite/universe/universe-orbit-system";
import { UniverseQuickActions } from "@/components/suite/universe/universe-quick-actions";
import { UniverseTunnelOverlay } from "@/components/suite/universe/universe-tunnel-overlay";
import { useAuthActionHref } from "@/hooks/use-auth-action-href";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useActiveTranslator } from "@/i18n/client";
import {
  resolveUniverseWelcomeName,
  type UniversePlanetConfig,
  type UniversePlanetId,
} from "@/lib/universe-home-config";
import "./universe-home.css";

const TUNNEL_DURATION_MS = 680;

export function UniverseHomePage() {
  const t = useActiveTranslator();
  const router = useRouter();
  const session = useAuthSession();
  const reducedMotion = useReducedMotion();

  const editorHref = useAuthActionHref("/editor");
  const studioHref = useAuthActionHref("/studio");
  const motionHref = useAuthActionHref("/animate/instant");
  const publishHref = useAuthActionHref("/publish");
  const libraryHref = useAuthActionHref("/library");

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

  const storyHref = useAuthActionHref("/studio/storyboards/new");
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

  const welcomeName = resolveUniverseWelcomeName(session.user?.email);
  const welcomeLine = welcomeName
    ? t("universe.welcome.back", { name: welcomeName })
    : t("universe.welcome.create");

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
    return () => {
      setTunnelPlanet(null);
    };
  }, []);

  return (
    <main className="universe-animate relative flex min-h-[calc(100dvh-4rem)] flex-1 flex-col overflow-hidden text-white">
      <UniverseBackground reducedMotion={reducedMotion} />

      <div className="relative z-10 flex flex-1 flex-col items-center px-4 pb-10 pt-8 sm:px-6 sm:pt-10">
        <header className="mb-6 text-center sm:mb-8">
          <p
            className="text-sm font-medium tracking-wide text-white/70 sm:text-base"
            style={{ animation: reducedMotion ? undefined : "universe-float 8s ease-in-out infinite" }}
          >
            {welcomeLine}
          </p>
          <h1 className="sr-only">{t("universe.title")}</h1>
          <p className="mt-2 text-xs text-white/40 sm:text-sm">{t("universe.subtitle")}</p>
        </header>

        <div className="hidden w-full flex-1 md:block">
          <UniverseOrbitSystem
            hrefs={planetHrefs}
            hoveredPlanet={hoveredPlanet}
            focusedPlanet={focusedPlanet}
            reducedMotion={reducedMotion}
            onHover={setHoveredPlanet}
            onFocus={setFocusedPlanet}
            onSelect={handlePlanetSelect}
          />
        </div>

        <div className="w-full flex-1 md:hidden">
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

        <div className="mt-8 w-full sm:mt-10">
          <UniverseQuickActions hrefs={quickHrefs} onNavigate={handleQuickNavigate} />
        </div>
      </div>

      {tunnelPlanet && (
        <UniverseTunnelOverlay planet={tunnelPlanet} reducedMotion={reducedMotion} />
      )}
    </main>
  );
}
