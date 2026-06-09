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
import {
  UNIVERSE_Z_GLOBE_WRAPPER,
  UNIVERSE_Z_ORBIT_PLANETS,
  UNIVERSE_Z_PIPELINE,
  type UniverseGlobeDebugLayer,
} from "@/lib/universe-globe-render";

type UniverseOrbitSystemProps = {
  hrefs: Record<UniversePlanetId, string>;
  hoveredPlanet: UniversePlanetId | null;
  focusedPlanet: UniversePlanetId | null;
  reducedMotion?: boolean;
  parallax?: UniverseParallaxOffset;
  globeDebugLayer?: UniverseGlobeDebugLayer | null;
  onHoverStart: (id: UniversePlanetId) => void;
  onHoverEnd: () => void;
  onFocus: (id: UniversePlanetId | null) => void;
  onSelect: (planet: UniversePlanetConfig) => void;
};

export function UniverseOrbitSystem({
  hrefs,
  hoveredPlanet,
  focusedPlanet,
  reducedMotion = false,
  parallax,
  globeDebugLayer = null,
  onHoverStart,
  onHoverEnd,
  onFocus,
  onSelect,
}: UniverseOrbitSystemProps) {
  const px = parallax?.x ?? 0;
  const py = parallax?.y ?? 0;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(98vw,880px)] overflow-visible">
      <div className="absolute inset-0" style={{ zIndex: UNIVERSE_Z_PIPELINE }}>
        <UniversePipeline hoveredPlanet={hoveredPlanet} />
      </div>

      {/* Globe sits BELOW planets — must not cover navigation */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2"
        style={{
          zIndex: UNIVERSE_Z_GLOBE_WRAPPER,
          transform: `translate(calc(-50% + ${px * 6}px), calc(-50% + ${py * 4}px))`,
        }}
      >
        <div className="pointer-events-auto">
          <UniverseGlobe reducedMotion={reducedMotion} size="hero" debugLayer={globeDebugLayer} />
        </div>
      </div>

      {UNIVERSE_PLANETS.map((planet) => {
        const pos = resolveUniverseOrbitPosition(planet.orbitAngle, UNIVERSE_ORBIT_RADIUS_PERCENT);
        return (
          <div
            key={planet.id}
            className="absolute"
            style={{
              zIndex:
                hoveredPlanet === planet.id || focusedPlanet === planet.id
                  ? UNIVERSE_Z_ORBIT_PLANETS + 20
                  : UNIVERSE_Z_ORBIT_PLANETS,
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
              onHoverStart={onHoverStart}
              onHoverEnd={onHoverEnd}
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
