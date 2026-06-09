"use client";

import {
  UNIVERSE_PLANETS,
  type UniversePlanetConfig,
  type UniversePlanetId,
} from "@/lib/universe-home-config";
import { UniverseGlobe } from "@/components/suite/universe/universe-globe";
import { UniversePlanet } from "@/components/suite/universe/universe-planet";
import { useActiveTranslator } from "@/i18n/client";

type UniverseMobileStackProps = {
  hrefs: Record<UniversePlanetId, string>;
  hoveredPlanet: UniversePlanetId | null;
  focusedPlanet: UniversePlanetId | null;
  reducedMotion?: boolean;
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
    <div className="flex w-full flex-col items-center gap-6 px-4">
      <div className="relative flex w-full flex-col items-center rounded-3xl border border-white/10 bg-white/5 px-4 py-8 backdrop-blur-sm">
        <UniverseGlobe reducedMotion={reducedMotion} />
        <p className="mt-4 text-center text-xs text-white/50">{t("universe.mobile.globeHint")}</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        {UNIVERSE_PLANETS.map((planet, index) => (
          <div
            key={planet.id}
            className="relative flex items-center gap-4 rounded-2xl border border-white/12 bg-[#041428]/60 p-4 shadow-xl backdrop-blur-md"
            style={{
              transform: reducedMotion ? undefined : `translateX(${(index % 2 === 0 ? -1 : 1) * 4}px)`,
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
              variant="card"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                {t(planet.themeKey)}
              </p>
              <p className="text-base font-semibold text-white">{t(planet.titleKey)}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/65">{t(planet.descriptionKey)}</p>
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t("universe.mobile.capabilities")}>
                {planet.capabilityKeys.slice(0, 3).map((key) => (
                  <li
                    key={key}
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/55"
                  >
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
