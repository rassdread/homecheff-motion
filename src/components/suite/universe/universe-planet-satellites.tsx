"use client";

import type { UniversePlanetConfig } from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";
import {
  UNIVERSE_PLANET_SATELLITE_CLASS,
  UNIVERSE_Z_CAPABILITY,
  resolveCapabilityRadialSlot,
} from "@/lib/universe-planet-ux";

type UniversePlanetSatellitesProps = {
  planet: UniversePlanetConfig;
  active: boolean;
};

export function UniversePlanetSatellites({ planet, active }: UniversePlanetSatellitesProps) {
  const t = useActiveTranslator();

  if (!active) {
    return null;
  }

  const capabilities = planet.capabilityKeys.slice(0, 5);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={{ zIndex: UNIVERSE_Z_CAPABILITY }}
      aria-hidden
    >
      {capabilities.map((key, i) => {
        const slot = resolveCapabilityRadialSlot(i, capabilities.length);
        return (
          <div
            key={key}
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `translate(calc(-50% + ${slot.x}px), calc(-50% + ${slot.y}px))`,
            }}
          >
            <span
              className={`${UNIVERSE_PLANET_SATELLITE_CLASS} universe-glass inline-block whitespace-nowrap rounded-full border border-white/40 bg-white/18 px-4 py-2 text-[clamp(13px,1.8vw,17px)] font-semibold text-white shadow-[0_8px_28px_rgba(0,0,0,0.5)]`}
            >
              {t(key)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
