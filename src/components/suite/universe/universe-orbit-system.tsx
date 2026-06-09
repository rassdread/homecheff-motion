"use client";

import type { UniversePlanetConfig } from "@/lib/universe-home-config";
import { UniverseGlobe } from "@/components/suite/universe/universe-globe";
import { UniversePipeline } from "@/components/suite/universe/universe-pipeline";
import { UniversePlanet } from "@/components/suite/universe/universe-planet";
import {
  UNIVERSE_PLANETS,
  resolveUniverseOrbitPosition,
  UNIVERSE_ORBIT_RADIUS_PERCENT,
  type UniversePlanetId,
} from "@/lib/universe-home-config";
import type { UniverseParallaxOffset } from "@/hooks/use-universe-parallax";

type UniverseOrbitSystemProps = {
  hrefs: Record<UniversePlanetId, string>;
  hoveredPlanet: UniversePlanetId | null;
  focusedPlanet: UniversePlanetId | null;
  reducedMotion?: boolean;
  parallax?: UniverseParallaxOffset;
  onHover: (id: UniversePlanetId | null) => void;
  onFocus: (id: UniversePlanetId | null) => void;
  onSelect: (planet: UniversePlanetConfig) => void;
};

export function UniverseOrbitSystem({
  hrefs,
  hoveredPlanet,
  focusedPlanet,
  reducedMotion = false,
  parallax,
  onHover,
  onFocus,
  onSelect,
}: UniverseOrbitSystemProps) {
  const px = parallax?.x ?? 0;
  const py = parallax?.y ?? 0;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(98vw,880px)]">
      <UniversePipeline hoveredPlanet={hoveredPlanet} />

      <div
            className="absolute left-1/2 top-1/2 z-[2]"
            style={{ transform: `translate(calc(-50% + ${px * 6}px), calc(-50% + ${py * 4}px))` }}
      >
        <UniverseGlobe reducedMotion={reducedMotion} size="hero" />
      </div>

      {UNIVERSE_PLANETS.map((planet) => {
        const pos = resolveUniverseOrbitPosition(planet.orbitAngle, UNIVERSE_ORBIT_RADIUS_PERCENT);
        return (
          <div
            key={planet.id}
            className="absolute z-[3]"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(calc(-50% + ${px * 10}px), calc(-50% + ${py * 8}px))`,
            }}
          >
            <UniversePlanet
              planet={planet}
              href={hrefs[planet.id]}
              hovered={hoveredPlanet === planet.id}
              focused={focusedPlanet === planet.id}
              reducedMotion={reducedMotion}
              onHover={onHover}
              onFocus={onFocus}
              onSelect={onSelect}
              variant="orbit"
            />
          </div>
        );
      })}
    </div>
  );
}
