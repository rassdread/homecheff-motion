"use client";

import { UniverseGlobe } from "@/components/suite/universe/universe-globe";
import { UniversePlanet } from "@/components/suite/universe/universe-planet";
import { UniversePlanetIdentityRing } from "@/components/suite/universe/universe-planet-identity-ring";
import { UniversePlanetPreview } from "@/components/suite/universe/universe-planet-preview";
import {
  UNIVERSE_PLANETS,
  type UniversePlanetConfig,
  type UniversePlanetId,
} from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";
import { resolveUniversePlanetPreviewContent } from "@/lib/universe-planet-ux";

type UniverseMobileStackProps = {
  hrefs: Record<UniversePlanetId, string>;
  expandedPlanet: UniversePlanetId | null;
  focusedPlanet: UniversePlanetId | null;
  reducedMotion?: boolean;
  onExpand: (id: UniversePlanetId) => void;
  onCollapse: () => void;
  onFocus: (id: UniversePlanetId | null) => void;
  onSelect: (planet: UniversePlanetConfig) => void;
};

export function UniverseMobileStack({
  hrefs,
  expandedPlanet,
  focusedPlanet,
  reducedMotion = false,
  onExpand,
  onCollapse,
  onFocus,
  onSelect,
}: UniverseMobileStackProps) {
  const t = useActiveTranslator();

  const handleCardToggle = (planetId: UniversePlanetId) => {
    if (expandedPlanet === planetId) {
      onCollapse();
      return;
    }
    onExpand(planetId);
  };

  return (
    <div className="flex w-full flex-col items-center gap-5 px-2">
      <div className="universe-glass relative flex w-full flex-col items-center overflow-hidden rounded-3xl px-4 py-6">
        <UniverseGlobe reducedMotion={reducedMotion} size="compact" />
        <p className="mt-3 text-center text-xs text-white/55">{t("universe.mobile.globeHint")}</p>
      </div>

      <div className="flex w-full flex-col gap-4">
        {UNIVERSE_PLANETS.map((planet, index) => {
          const expanded = expandedPlanet === planet.id;
          const preview = resolveUniversePlanetPreviewContent(planet.id);

          return (
            <div
              key={planet.id}
              className="universe-glass relative overflow-visible rounded-2xl p-4"
              style={{
                transform: reducedMotion ? undefined : `translateX(${(index % 2 === 0 ? -1 : 1) * 6}px)`,
              }}
            >
              <UniversePlanetIdentityRing
                planetId={planet.id}
                active={expanded}
                reducedMotion={reducedMotion}
                variant="band"
              />
              <div className="mt-3 flex items-start gap-4">
                <UniversePlanet
                  planet={planet}
                  href={hrefs[planet.id]}
                  hovered={expanded}
                  focused={focusedPlanet === planet.id}
                  reducedMotion={reducedMotion}
                  onHoverStart={() => onExpand(planet.id)}
                  onHoverEnd={onCollapse}
                  onFocus={onFocus}
                  onSelect={onSelect}
                  variant="card"
                  showCardPreview={false}
                />
                <button
                  type="button"
                  className="min-w-0 flex-1 pt-1 text-left"
                  onClick={() => handleCardToggle(planet.id)}
                  aria-expanded={expanded}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    {t(planet.themeKey)}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-white/72">{t(preview.descriptionKey)}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {planet.capabilityKeys.slice(0, 3).map((key) => (
                      <li
                        key={key}
                        className="rounded-full border border-white/18 bg-white/10 px-3.5 py-1.5 text-[clamp(12px,3.5vw,15px)] font-semibold text-white/85"
                      >
                        {t(key)}
                      </li>
                    ))}
                  </ul>
                </button>
              </div>

              {expanded && (
                <UniversePlanetPreview
                  planet={planet}
                  active={expanded}
                  onOpen={() => onSelect(planet)}
                  layout="inline"
                  placement="below"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
