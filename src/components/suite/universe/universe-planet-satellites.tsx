"use client";

import type { UniversePlanetConfig } from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";
import {
  UNIVERSE_CAPABILITY_ORBIT_DURATION_S,
  UNIVERSE_CAPABILITY_ORBIT_RADIUS_PX,
  UNIVERSE_PLANET_HOVER_SCALE,
  UNIVERSE_PLANET_SATELLITE_CLASS,
  UNIVERSE_Z_CAPABILITY,
  resolveCapabilityOrbitAngleDeg,
} from "@/lib/universe-planet-ux";

type UniversePlanetSatellitesProps = {
  planet: UniversePlanetConfig;
  active: boolean;
  reducedMotion?: boolean;
};

export function UniversePlanetSatellites({
  planet,
  active,
  reducedMotion = false,
}: UniversePlanetSatellitesProps) {
  const t = useActiveTranslator();

  if (!active) {
    return null;
  }

  const capabilities = planet.capabilityKeys.slice(0, 4);
  const orbitSize = UNIVERSE_CAPABILITY_ORBIT_RADIUS_PX * 2 * UNIVERSE_PLANET_HOVER_SCALE;

  return (
    <div
      className="universe-capability-orbit pointer-events-none absolute left-1/2 top-1/2 overflow-visible"
      style={{
        zIndex: UNIVERSE_Z_CAPABILITY,
        width: orbitSize,
        height: orbitSize,
        marginLeft: -orbitSize / 2,
        marginTop: -orbitSize / 2,
        transform: `scale(${UNIVERSE_PLANET_HOVER_SCALE})`,
        transformOrigin: "center center",
      }}
      aria-hidden
    >
      <div
        className={`universe-capability-orbit-spinner ${reducedMotion ? "" : "universe-capability-orbit-spin"}`}
        style={
          reducedMotion
            ? undefined
            : { animationDuration: `${UNIVERSE_CAPABILITY_ORBIT_DURATION_S}s` }
        }
      >
        {capabilities.map((key, i) => {
          const angleDeg = resolveCapabilityOrbitAngleDeg(i, capabilities.length);
          return (
            <div
              key={key}
              className="universe-capability-orbit-arm absolute left-1/2 top-1/2"
              style={{
                transform: `rotate(${angleDeg}deg) translateY(-${UNIVERSE_CAPABILITY_ORBIT_RADIUS_PX}px)`,
              }}
            >
              <span
                className={`${UNIVERSE_PLANET_SATELLITE_CLASS} universe-capability-orbit-label universe-glass inline-block max-w-[11rem] whitespace-nowrap rounded-full border px-4 py-2 text-[clamp(13px,1.65vw,16px)] font-semibold text-white shadow-[0_8px_28px_rgba(0,0,0,0.5)] ${
                  reducedMotion ? "" : "universe-capability-orbit-label-upright"
                }`}
                style={{
                  borderColor: `${planet.accent}88`,
                  boxShadow: `0 0 18px ${planet.accent}44, 0 8px 28px rgba(0,0,0,0.45)`,
                  ...(reducedMotion
                    ? { transform: `rotate(${-angleDeg}deg)` }
                    : { animationDuration: `${UNIVERSE_CAPABILITY_ORBIT_DURATION_S}s` }),
                }}
              >
                {t(key)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
