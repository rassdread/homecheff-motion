"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { UNIVERSE_PIPELINE, UNIVERSE_PLANETS } from "@/lib/universe-home-config";
import { useAuthSession } from "@/hooks/use-auth-session";
import { UniversePlanetIcon } from "@/components/suite/universe/universe-planet-icon";
import {
  resolveUniversePlanetHref,
  resolveUniverseStartProjectHref,
} from "@/lib/universe-public-landing";

const VERSION_KEYS = [
  "universe.whyStudio.versions.voice",
  "universe.whyStudio.versions.language",
  "universe.whyStudio.versions.music",
  "universe.whyStudio.versions.branding",
  "universe.whyStudio.versions.cta",
] as const;

const EXAMPLE_KEYS = [
  "universe.whyStudio.examples.marketing",
  "universe.whyStudio.examples.affiliate",
  "universe.whyStudio.examples.training",
  "universe.whyStudio.examples.international",
] as const;

export function UniverseWhyStudioPage() {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const isAuthenticated = Boolean(session.resolved && session.user);
  const pipelinePlanets = UNIVERSE_PIPELINE.map(
    (id) => UNIVERSE_PLANETS.find((p) => p.id === id)!
  );

  return (
    <main className="universe-animate relative flex min-h-[calc(100dvh-4rem)] flex-1 flex-col overflow-x-hidden bg-[#041428] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <header>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#5eb8e8]">
            {t("universe.hero.tagline")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {t("universe.whyStudio.title")}
          </h1>
          <p className="mt-2 text-sm text-white/55">{t("universe.hero.taglineAlt")}</p>
          <p className="mt-4 text-base leading-relaxed text-white/72">{t("universe.whyStudio.subtitle")}</p>
        </header>

        <section className="universe-glass mt-10 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">{t("universe.whyStudio.problem.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            {t("universe.whyStudio.problem.body")}
          </p>
        </section>

        <section className="universe-glass mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">{t("universe.whyStudio.solution.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            {t("universe.whyStudio.solution.body")}
          </p>
        </section>

        <section className="universe-glass mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">{t("universe.whyStudio.workflow.title")}</h2>
          <ul className="mt-5 space-y-4">
            {pipelinePlanets.map((planet) => (
              <li key={planet.id} className="flex gap-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10"
                  style={{ boxShadow: `0 0 16px ${planet.accent}33` }}
                >
                  <UniversePlanetIcon id={planet.id} className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-white">{t(planet.titleKey)}</p>
                  <p className="mt-0.5 text-xs text-white/50">{t(`universe.planet.${planet.id}.short`)}</p>
                  <p className="mt-1 text-sm text-white/65">{t(planet.descriptionKey)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="universe-glass mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">{t("universe.whyStudio.versions.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            {t("universe.whyStudio.versions.body")}
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-white/65">
            {VERSION_KEYS.map((key) => (
              <li key={key} className="flex items-center gap-2">
                <span className="text-[#5eb8e8]" aria-hidden>
                  •
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
        </section>

        <section className="universe-glass mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">{t("universe.whyStudio.examples.title")}</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/65">
            {EXAMPLE_KEYS.map((key) => (
              <li key={key}>• {t(key)}</li>
            ))}
          </ul>
        </section>

        <section className="universe-glass mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">{t("universe.whyStudio.start.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            {t("universe.whyStudio.start.body")}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={resolveUniversePlanetHref("/studio", isAuthenticated)}
              className="inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
            >
              {t("universe.whyStudio.cta.openStudio")}
            </Link>
            <Link
              href={resolveUniverseStartProjectHref(isAuthenticated)}
              className="inline-flex min-h-11 items-center rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
            >
              {t("universe.whyStudio.cta.startProject")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
