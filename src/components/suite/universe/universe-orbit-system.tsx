"use client";

import type { UniversePlanetConfig } from "@/lib/universe-home-config";
import { UniverseGlobe } from "@/components/suite/universe/universe-globe";
import { UniversePipeline } from "@/components/suite/universe/universe-pipeline";
import { UniversePlanet } from "@/components/suite/universe/universe-planet";
import {
  UNIVERSE_PLANETS,
  resolveUniverseOrbitPosition,
  type UniversePlanetId,
} from "@/lib/universe-home-config";

type UniverseOrbitSystemProps = {
  hrefs: Record<UniversePlanetId, string>;
  hoveredPlanet: UniversePlanetId | null;
  focusedPlanet: UniversePlanetId | null;
  reducedMotion?: boolean;
  onHover: (id: UniversePlanetId | null) => void;
  onFocus: (id: UniversePlanetId | null) => void;
  onSelect: (planet: UniversePlanetConfig) => void;
};

export function UniverseOrbitSystem({
  hrefs,
  hoveredPlanet,
  focusedPlanet,
  reducedMotion = false,
  onHover,
  onFocus,
  onSelect,
}: UniverseOrbitSystemProps) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(92vw,640px)]">
      <UniversePipeline hoveredPlanet={hoveredPlanet} />

      <div className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2">
        <UniverseGlobe reducedMotion={reducedMotion} />
      </div>

      {UNIVERSE_PLANETS.map((planet) => {
        const pos = resolveUniverseOrbitPosition(planet.orbitAngle, 22);
        return (
          <div
            key={planet.id}
            className="absolute z-[3] -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
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
