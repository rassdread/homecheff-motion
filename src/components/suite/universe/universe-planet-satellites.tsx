"use client";

import type { UniversePlanetConfig } from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";

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
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {planet.capabilityKeys.map((key, i) => (
        <div
          key={key}
          className="absolute left-1/2 top-1/2"
          style={{
            ["--satellite-radius" as string]: `${58 + i * 14}px`,
            animation: reducedMotion
              ? undefined
              : `universe-satellite-orbit ${12 + i * 1.5}s linear infinite`,
            animationDelay: `${i * 0.5}s`,
            transformOrigin: "center center",
          }}
        >
          <span
            className="universe-glass whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-medium text-white/85"
            style={{ transform: "translate(-50%, -50%)" }}
          >
            {t(key)}
          </span>
        </div>
      ))}
    </div>
  );
}
