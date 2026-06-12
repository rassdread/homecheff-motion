"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import {
  MARKETING_CREATE_ANYTHING_CARDS,
  MARKETING_CTA_KEYS,
  MARKETING_FREE_TIER_KEYS,
  MARKETING_IDEA_PIPELINE_KEYS,
  MARKETING_POPULAR_CREATION_KEYS,
  MARKETING_POSITIONING_KEYS,
  MARKETING_PREMIUM_TIER_KEYS,
} from "@/lib/marketing-home-config";
import { resolveUniverseHowItWorksHref } from "@/lib/universe-public-landing";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  startCreatingHref: string;
};

export function UniverseMarketingSections({ startCreatingHref }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="universe-marketing-sections space-y-14 pb-8 pt-10">
      <section aria-labelledby="marketing-positioning-title">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#5eb8e8]">
          {t(MARKETING_POSITIONING_KEYS.tagline)}
        </p>
        <h2 id="marketing-positioning-title" className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          {t("marketing.createAnything.title")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-white/72 sm:text-base">{t(MARKETING_POSITIONING_KEYS.lead)}</p>
      </section>

      <section aria-labelledby="create-anything-cards">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MARKETING_CREATE_ANYTHING_CARDS.map((card) => (
            <article key={card.titleKey} className={studioVisual.cardGlass}>
              <h3 className="text-sm font-semibold text-white">{t(card.titleKey)}</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/68">{t(card.descKey)}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={startCreatingHref} className={studioVisual.btnGradientPrimary}>
            {t(MARKETING_CTA_KEYS.startCreating)}
          </Link>
          <Link href="/editor" className={studioVisual.btnOutline}>
            {t(MARKETING_CTA_KEYS.seeExamples)}
          </Link>
          <Link href={resolveUniverseHowItWorksHref()} className={studioVisual.btnOutline}>
            {t(MARKETING_CTA_KEYS.learnMore)}
          </Link>
        </div>
      </section>

      <section aria-labelledby="idea-to-content-title" className={studioVisual.cardGlass}>
        <h2 id="idea-to-content-title" className="text-lg font-bold text-white sm:text-xl">
          {t("marketing.ideaToContent.title")}
        </h2>
        <p className="mt-2 text-sm text-white/72">{t("marketing.ideaToContent.lead")}</p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-white/88">
          {MARKETING_IDEA_PIPELINE_KEYS.map((key, index) => (
            <span key={key} className="flex items-center gap-2">
              {index > 0 ? <span className="text-[#5eb8e8]" aria-hidden>→</span> : null}
              <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1">{t(key)}</span>
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm font-medium text-emerald-200/90">{t("marketing.ideaToContent.closing")}</p>
      </section>

      <section aria-labelledby="popular-creations-title">
        <h2 id="popular-creations-title" className="text-lg font-bold text-white sm:text-xl">
          {t("marketing.popularCreations.title")}
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {MARKETING_POPULAR_CREATION_KEYS.map((key) => (
            <li key={key} className={`${studioVisual.cardGlass} text-sm text-white/85`}>
              {t(key)}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/editor/start" className={studioVisual.btnGradientPrimary}>
            {t(MARKETING_CTA_KEYS.startCreating)}
          </Link>
          <Link href="/studio/storyboards/new" className={studioVisual.btnOutline}>
            {t(MARKETING_CTA_KEYS.seeExamples)}
          </Link>
        </div>
      </section>

      <section aria-labelledby="free-premium-title" className={studioVisual.cardGlass}>
        <h2 id="free-premium-title" className="text-lg font-bold text-white sm:text-xl">
          {t("marketing.freePremium.title")}
        </h2>
        <p className="mt-2 text-sm text-white/72">{t("marketing.freePremium.lead")}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-white">{t("marketing.freePremium.free.title")}</h3>
            <ul className="mt-2 space-y-1 text-sm text-white/70">
              {MARKETING_FREE_TIER_KEYS.map((key) => (
                <li key={key}>• {t(key)}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{t("marketing.freePremium.premium.title")}</h3>
            <ul className="mt-2 space-y-1 text-sm text-white/70">
              {MARKETING_PREMIUM_TIER_KEYS.map((key) => (
                <li key={key}>• {t(key)}</li>
              ))}
            </ul>
          </div>
        </div>
        <Link href="/pricing" className={`mt-5 inline-flex ${studioVisual.btnOutline}`}>
          {t(MARKETING_CTA_KEYS.learnMore)}
        </Link>
      </section>
    </div>
  );
}
