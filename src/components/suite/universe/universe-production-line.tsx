"use client";

import {
  UNIVERSE_PIPELINE,
  UNIVERSE_PLANETS,
  UNIVERSE_BRAND,
} from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";
import { UniversePlanetIcon } from "@/components/suite/universe/universe-planet-icon";
const ADAPT_KEYS = [
  "universe.productionLine.adapt.voiceover",
  "universe.productionLine.adapt.music",
  "universe.productionLine.adapt.language",
  "universe.productionLine.adapt.subtitles",
  "universe.productionLine.adapt.branding",
  "universe.productionLine.adapt.platform",
] as const;

const STEP_KEYS = [
  "universe.productionLine.step.editor",
  "universe.productionLine.step.studio",
  "universe.productionLine.step.motion",
  "universe.productionLine.step.publish",
] as const;

export function UniverseProductionLine() {
  const t = useActiveTranslator();
  const pipelinePlanets = UNIVERSE_PIPELINE.map(
    (id) => UNIVERSE_PLANETS.find((p) => p.id === id)!
  );

  return (
    <section
      className="universe-production-line relative z-10 mx-auto w-full max-w-4xl px-2 sm:px-4"
      aria-labelledby="universe-production-line-title"
    >
      <h2
        id="universe-production-line-title"
        className="text-left text-lg font-bold text-white sm:text-xl"
      >
        {t("universe.productionLine.title")}
      </h2>
      <p className="mt-3 max-w-3xl text-left text-sm leading-relaxed text-white/68 sm:text-base">
        {t("universe.productionLine.body")}
      </p>
      <p className="mt-4 text-sm text-white/72">{t("universe.productionLine.adaptIntro")}</p>
      <ul className="mt-2 space-y-1 text-sm text-white/65">
        {ADAPT_KEYS.map((key) => (
          <li key={key} className="flex items-center gap-2">
            <span className="text-[#006D52]" aria-hidden>
              •
            </span>
            {t(key)}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-white/55">{t("universe.productionLine.adapt.footer")}</p>

      <div className="mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        {pipelinePlanets.map((planet, i) => (
          <div key={planet.id} className="flex flex-1 flex-col items-center text-center">
            <div
              className="universe-glass flex h-12 w-12 items-center justify-center rounded-xl text-white"
              style={{ boxShadow: `0 0 20px ${planet.accent}33` }}
            >
              <UniversePlanetIcon id={planet.id} className="h-6 w-6" />
            </div>
            <p className="mt-2 text-sm font-semibold text-white">{t(planet.titleKey)}</p>
            <p className="mt-0.5 text-[11px] text-white/55">{t(STEP_KEYS[i]!)}</p>
            {i < pipelinePlanets.length - 1 && (
              <span
                className="mt-3 hidden text-lg sm:inline"
                aria-hidden
                style={{ color: UNIVERSE_BRAND.blue }}
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
