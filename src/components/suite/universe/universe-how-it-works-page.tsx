"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { UNIVERSE_PLANETS } from "@/lib/universe-home-config";
import { useAuthSession } from "@/hooks/use-auth-session";
import { UniversePlanetIcon } from "@/components/suite/universe/universe-planet-icon";
import {
  resolveUniversePlanetHref,
  resolveUniverseStartProjectHref,
} from "@/lib/universe-public-landing";

const EXAMPLE_KEYS = [
  "universe.howItWorks.examples.language",
  "universe.howItWorks.examples.voiceover",
  "universe.howItWorks.examples.music",
  "universe.howItWorks.examples.subtitles",
  "universe.howItWorks.examples.branding",
] as const;

export function UniverseHowItWorksPage() {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const isAuthenticated = Boolean(session.resolved && session.user);

  return (
    <main className="universe-animate relative flex min-h-[calc(100dvh-4rem)] flex-1 flex-col overflow-x-hidden bg-[#041428] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <header>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#5eb8e8]">
            {t("universe.hero.tagline")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {t("universe.howItWorks.title")}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/72">{t("universe.howItWorks.subtitle")}</p>
        </header>

        <section className="universe-glass mt-10 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">{t("universe.howItWorks.q1.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            {t("universe.howItWorks.q1.body")}
          </p>
        </section>

        <section className="universe-glass mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">{t("universe.howItWorks.q2.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            {t("universe.howItWorks.q2.body")}
          </p>
        </section>

        <section className="universe-glass mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">{t("universe.howItWorks.q3.title")}</h2>
          <ul className="mt-5 space-y-4">
            {UNIVERSE_PLANETS.map((planet) => (
              <li key={planet.id} className="flex gap-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10"
                  style={{ boxShadow: `0 0 16px ${planet.accent}33` }}
                >
                  <UniversePlanetIcon id={planet.id} className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-white">{t(planet.titleKey)}</p>
                  <p className="mt-1 text-sm text-white/65">{t(planet.descriptionKey)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="universe-glass mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">{t("universe.howItWorks.q4.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            {t("universe.howItWorks.q4.body")}
          </p>
          <p className="mt-4 text-sm font-medium text-white/80">{t("universe.howItWorks.examples.title")}</p>
          <ul className="mt-2 space-y-1 text-sm text-white/65">
            {EXAMPLE_KEYS.map((key) => (
              <li key={key}>• {t(key)}</li>
            ))}
          </ul>
        </section>

        <section className="universe-glass mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">{t("universe.howItWorks.getStarted.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            {t("universe.howItWorks.getStarted.body")}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={resolveUniverseStartProjectHref(isAuthenticated)}
              className="inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
            >
              {t("universe.howItWorks.cta.startProject")}
            </Link>
            <Link
              href={resolveUniversePlanetHref("/editor", isAuthenticated)}
              className="inline-flex min-h-11 items-center rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
            >
              {t("universe.howItWorks.cta.openEditor")}
            </Link>
            <Link
              href={resolveUniversePlanetHref("/studio", isAuthenticated)}
              className="inline-flex min-h-11 items-center rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
            >
              {t("universe.howItWorks.cta.openStudio")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
