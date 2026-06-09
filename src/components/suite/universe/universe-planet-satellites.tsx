"use client";

import type { UniversePlanetConfig } from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";
import { UNIVERSE_PLANET_SATELLITE_CLASS, UNIVERSE_Z_SATELLITE } from "@/lib/universe-planet-ux";

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

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={{ zIndex: UNIVERSE_Z_SATELLITE }}
      aria-hidden
    >
      {planet.capabilityKeys.map((key, i) => (
        <div
          key={key}
          className="absolute left-1/2 top-1/2"
          style={{
            ["--satellite-radius" as string]: `${108 + i * 28}px`,
            animation: reducedMotion
              ? undefined
              : `universe-satellite-orbit ${14 + i * 1.5}s linear infinite`,
            animationDelay: `${i * 0.5}s`,
            transformOrigin: "center center",
          }}
        >
          <span
            className={`${UNIVERSE_PLANET_SATELLITE_CLASS} universe-glass whitespace-nowrap rounded-full border border-white/35 bg-white/16 px-5 py-2 text-[clamp(14px,2.2vw,22px)] font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)]`}
            style={{ transform: "translate(-50%, -50%)" }}
          >
            {t(key)}
          </span>
        </div>
      ))}
    </div>
  );
}
