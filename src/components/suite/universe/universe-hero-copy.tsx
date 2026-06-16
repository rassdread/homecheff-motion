"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { resolveUniverseWelcomeName } from "@/lib/universe-home-config";
import {
  UNIVERSE_HERO_PIPELINE_KEYS,
  resolveUniverseHowItWorksHref,
  resolveUniversePrimaryCtaHref,
  resolveUniverseSecondaryCtaHref,
  resolveUniverseStartProjectHref,
} from "@/lib/universe-public-landing";

type Props = {
  isAuthenticated: boolean;
  email?: string;
  reducedMotion?: boolean;
};

export function UniverseHeroCopy({ isAuthenticated, email, reducedMotion = false }: Props) {
  const t = useActiveTranslator();
  const welcomeName = resolveUniverseWelcomeName(email);

  const headline =
    isAuthenticated && welcomeName
      ? t("universe.welcome.back", { name: welcomeName })
      : t("universe.hero.welcomeSignedOut");

  return (
    <header className="universe-hero-copy relative z-20 max-w-lg text-left">
      <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#5eb8e8] sm:text-xs">
        {t("universe.hero.tagline")}
      </p>

      <h1
        className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-[1.85rem] lg:leading-tight"
        style={{
          animation: reducedMotion ? undefined : "universe-welcome-in 0.6s ease-out forwards",
        }}
      >
        {headline}
      </h1>

      {isAuthenticated ? (
        <p className="mt-2 text-sm text-white/75 sm:text-base">
          {t("universe.hero.todayPrompt" as never)}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm font-medium text-white/82 sm:text-base">{t("universe.hero.leadA")}</p>
          <p className="text-sm font-medium text-white/82 sm:text-base">{t("universe.hero.leadB")}</p>
          <p className="mt-1 text-xs font-medium tracking-wide text-white/55">
            {t("marketing.positioning.tagline")} — {t("marketing.positioning.lead")}
          </p>
        </>
      )}

      <div className="mt-4 space-y-0.5">
        {UNIVERSE_HERO_PIPELINE_KEYS.map((key) => (
          <p key={key} className="text-sm font-medium text-white/82 sm:text-[0.95rem]">
            {t(key)}
          </p>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-start gap-2" data-testid="universe-hero-ctas">
        {isAuthenticated ? (
          <>
            <Link
              href={resolveUniversePrimaryCtaHref(true)}
              prefetch={false}
              className="inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-95"
            >
              {t("universe.public.continueCreating" as never)}
            </Link>
            <Link
              href={resolveUniverseSecondaryCtaHref(true)}
              prefetch={false}
              className="inline-flex min-h-11 items-center rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15"
            >
              {t("universe.quick.openLibrary" as never)}
            </Link>
          </>
        ) : (
          <>
            <Link
              href={resolveUniverseStartProjectHref(isAuthenticated)}
              prefetch={false}
              className="inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-95"
            >
              {t("universe.hero.cta.startProject" as never)}
            </Link>
            <Link
              href={resolveUniverseHowItWorksHref()}
              prefetch={false}
              className="inline-flex min-h-11 items-center rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15"
            >
              {t("universe.hero.cta.howItWorks" as never)}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
