"use client";

import { useEffect, useRef, useState } from "react";
import {
  UNIVERSE_PIPELINE,
  UNIVERSE_PLANETS,
  UNIVERSE_BRAND,
} from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";
import { UniversePlanetIcon } from "@/components/suite/universe/universe-planet-icon";

type UniverseEcosystemStoryProps = {
  reducedMotion?: boolean;
};

export function UniverseEcosystemStory({ reducedMotion = false }: UniverseEcosystemStoryProps) {
  const t = useActiveTranslator();
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pipelinePlanets = UNIVERSE_PIPELINE.map(
    (id) => UNIVERSE_PLANETS.find((p) => p.id === id)!
  );

  return (
    <section
      ref={ref}
      className="relative z-10 mx-auto w-full max-w-4xl px-4 py-12 sm:py-16"
      aria-label={t("universe.story.title")}
    >
      <h2
        className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-white/45"
        style={{
          animation: visible && !reducedMotion ? "universe-story-reveal 0.8s ease-out forwards" : undefined,
          opacity: visible ? 1 : 0,
        }}
      >
        {t("universe.story.title")}
      </h2>

      <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-between sm:gap-4">
        {pipelinePlanets.map((planet, i) => (
          <div
            key={planet.id}
            className="flex flex-col items-center text-center"
            style={{
              animation:
                visible && !reducedMotion
                  ? `universe-story-reveal 0.7s ease-out ${i * 0.12}s forwards`
                  : undefined,
              opacity: visible ? 1 : 0,
            }}
          >
            <div
              className="universe-glass flex h-14 w-14 items-center justify-center rounded-2xl text-white"
              style={{ boxShadow: `0 0 24px ${planet.accent}44` }}
            >
              <UniversePlanetIcon id={planet.id} className="h-7 w-7" />
            </div>
            <p className="mt-2 text-sm font-semibold text-white">{t(planet.titleKey)}</p>
            <p className="mt-1 max-w-[8rem] text-[11px] leading-relaxed text-white/55">
              {t(planet.descriptionKey)}
            </p>
            {i < pipelinePlanets.length - 1 && (
              <span
                className="mt-3 hidden text-lg text-white/30 sm:inline"
                aria-hidden
                style={{ color: UNIVERSE_BRAND.green }}
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>

      <p
        className="mt-8 text-center text-xs text-white/40"
        style={{
          animation: visible && !reducedMotion ? "universe-story-reveal 1s ease-out 0.5s forwards" : undefined,
          opacity: visible ? 1 : 0,
        }}
      >
        {t("universe.story.subtitle")}
      </p>
    </section>
  );
}
