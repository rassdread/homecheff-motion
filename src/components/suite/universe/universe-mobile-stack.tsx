"use client";

import { UniverseGlobe } from "@/components/suite/universe/universe-globe";
import { UniversePlanet } from "@/components/suite/universe/universe-planet";
import { UniversePlanetIdentityRing } from "@/components/suite/universe/universe-planet-identity-ring";
import {
  UNIVERSE_PLANETS,
  type UniversePlanetConfig,
  type UniversePlanetId,
} from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";

type UniverseMobileStackProps = {
  hrefs: Record<UniversePlanetId, string>;
  hoveredPlanet: UniversePlanetId | null;
  focusedPlanet: UniversePlanetId | null;
  reducedMotion?: boolean;
  isAuthenticated?: boolean;
  onHover: (id: UniversePlanetId | null) => void;
  onFocus: (id: UniversePlanetId | null) => void;
  onSelect: (planet: UniversePlanetConfig) => void;
};

export function UniverseMobileStack({
  hrefs,
  hoveredPlanet,
  focusedPlanet,
  reducedMotion = false,
  onHover,
  onFocus,
  onSelect,
}: UniverseMobileStackProps) {
  const t = useActiveTranslator();

  return (
    <div className="flex w-full flex-col items-center gap-5 px-2">
      <div className="universe-glass relative flex w-full flex-col items-center overflow-hidden rounded-3xl px-4 py-6">
        <UniverseGlobe reducedMotion={reducedMotion} size="compact" />
        <p className="mt-3 text-center text-xs text-white/55">{t("universe.mobile.globeHint")}</p>
      </div>

      <div className="flex w-full flex-col gap-4">
        {UNIVERSE_PLANETS.map((planet, index) => (
          <div
            key={planet.id}
            className="universe-glass relative overflow-visible rounded-2xl p-4"
            style={{
              transform: reducedMotion ? undefined : `translateX(${(index % 2 === 0 ? -1 : 1) * 6}px)`,
            }}
          >
            <UniversePlanetIdentityRing
              planetId={planet.id}
              active={hoveredPlanet === planet.id}
              reducedMotion={reducedMotion}
              variant="band"
            />
            <div className="mt-3 flex items-start gap-4">
              <UniversePlanet
                planet={planet}
                href={hrefs[planet.id]}
                hovered={hoveredPlanet === planet.id}
                focused={focusedPlanet === planet.id}
                reducedMotion={reducedMotion}
                onHover={onHover}
                onFocus={onFocus}
                onSelect={onSelect}
                variant="card"
              />
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                  {t(planet.themeKey)}
                </p>
                <p className="text-base font-bold uppercase tracking-wide text-white">
                  {t(planet.titleKey)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/65">
                  {t(planet.descriptionKey)}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {planet.capabilityKeys.slice(0, 3).map((key) => (
                    <li
                      key={key}
                      className="rounded-full border border-white/12 bg-white/8 px-2 py-0.5 text-[10px] text-white/60"
                    >
                      {t(key)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
