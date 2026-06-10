"use client";

import {
  UNIVERSE_PIPELINE,
  UNIVERSE_PLANETS,
  UNIVERSE_BRAND,
} from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";
import { UniversePlanetIcon } from "@/components/suite/universe/universe-planet-icon";

const ADAPT_KEYS = [
  "universe.differentiation.adapt.languages",
  "universe.differentiation.adapt.voiceovers",
  "universe.differentiation.adapt.music",
  "universe.differentiation.adapt.branding",
  "universe.differentiation.adapt.markets",
] as const;

export function UniverseDifferentiation() {
  const t = useActiveTranslator();
  const pipelinePlanets = UNIVERSE_PIPELINE.map(
    (id) => UNIVERSE_PLANETS.find((p) => p.id === id)!
  );

  return (
    <section
      className="universe-differentiation relative z-10 mx-auto mt-10 w-full max-w-4xl px-2 sm:px-4"
      aria-labelledby="universe-differentiation-title"
    >
      <h2
        id="universe-differentiation-title"
        className="text-left text-lg font-bold text-white sm:text-xl"
      >
        {t("universe.differentiation.title")}
      </h2>

      <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        {pipelinePlanets.map((planet, i) => (
          <div key={planet.id} className="flex flex-1 flex-col items-center text-center">
            <div
              className="universe-glass flex h-10 w-10 items-center justify-center rounded-lg text-white"
              style={{ boxShadow: `0 0 16px ${planet.accent}33` }}
            >
              <UniversePlanetIcon id={planet.id} className="h-5 w-5" />
            </div>
            <p className="mt-1.5 text-xs font-semibold text-white">{t(planet.titleKey)}</p>
            {i < pipelinePlanets.length - 1 && (
              <span
                className="mt-2 hidden text-base sm:inline"
                aria-hidden
                style={{ color: UNIVERSE_BRAND.blue }}
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="mt-6 max-w-3xl text-left text-sm leading-relaxed text-white/68 sm:text-base">
        {t("universe.differentiation.body")}
      </p>

      <p className="mt-4 text-sm font-medium text-white/78">{t("universe.differentiation.adaptIntro")}</p>
      <ul className="mt-2 space-y-1.5">
        {ADAPT_KEYS.map((key) => (
          <li key={key} className="flex items-center gap-2 text-sm text-white/72">
            <span className="text-[#5eb8e8]" aria-hidden>
              ✓
            </span>
            {t(key)}
          </li>
        ))}
      </ul>

      <p className="mt-5 text-sm font-semibold text-white/88">
        {t("universe.differentiation.closingA")}{" "}
        <span className="text-white/55">{t("universe.differentiation.closingB")}</span>
      </p>
    </section>
  );
}
