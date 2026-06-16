"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { UniverseBackground } from "@/components/suite/universe/universe-background";
import { UniverseLandingOrbitWidget } from "@/components/suite/universe/universe-landing-orbit-widget";
import { ServiceLandingNav } from "@/components/suite/service-landing-nav";
import { SpaceGallery } from "@/components/examples/space-gallery";
import { listExamplesForService } from "@/lib/homecheff-examples";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioProductLandingConfig } from "@/lib/studio-product-landing-config";
import { StudioPageIntro } from "@/components/suite/studio-page-intro";
import { studioVisual } from "@/lib/studio-visual-tokens";

export type StudioProductLandingContinue = {
  label: string;
  href: string;
};

type Props = {
  config: StudioProductLandingConfig;
  /** @deprecated Prefer continueSlot — avoids hydration mismatch from localStorage. */
  continueCard?: StudioProductLandingContinue | null;
  /** Client-only slot (e.g. recent edit card after mount). SSR and first client paint stay identical. */
  continueSlot?: ReactNode;
};

function categoryDescKey(categoryKey: string): string {
  return `${categoryKey}.desc`;
}

export function StudioProductLandingPage({ config, continueCard, continueSlot }: Props) {
  const t = useActiveTranslator();
  const examples = listExamplesForService(
    config.moduleKey === "usage" || config.moduleKey === "library" ? "home" : config.moduleKey
  );

  return (
    <div className={`${studioVisual.pageRoot} overflow-x-hidden ${studioVisual.pageBg}`} data-testid={`landing-${config.moduleKey}`}>
      <UniverseBackground />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-8 lg:pt-16">
        <ServiceLandingNav current={config.moduleKey} />

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,500px)] lg:gap-10">
          <div className="min-w-0 max-w-3xl">
          <StudioPageIntro
            eyebrow={config.positioningKey ? t(config.positioningKey) : t(config.eyebrowKey)}
            title={t(config.titleKey)}
            description={t(`suite.pageIntro.${config.moduleKey}.description` as never)}
            actions={
              <>
                <Link href={config.primaryCtaHref} className={studioVisual.btnGradientPrimary}>
                  {t(config.primaryCtaKey)}
                </Link>
                <Link href={config.secondaryCtaHref} className={studioVisual.btnOutline}>
                  {t(config.secondaryCtaKey)}
                </Link>
                {config.tertiaryCtaKey && config.tertiaryCtaHref ?
                  <Link href={config.tertiaryCtaHref} className={studioVisual.btnOutline}>
                    {t(config.tertiaryCtaKey)}
                  </Link>
                : null}
              </>
            }
          />

          {continueSlot ?? (continueCard ?
            <div className={`mt-8 ${studioVisual.cardGlass} max-w-xl`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300/90">
                {t("landing.continue.title" as never)}
              </p>
              <Link
                href={continueCard.href}
                className="mt-2 block text-sm font-semibold text-white hover:underline"
              >
                {continueCard.label}
              </Link>
            </div>
          : null)}
          </div>

          <div className="flex items-center justify-center pt-6 lg:justify-end lg:pt-4">
            <div className="w-full max-w-[min(92vw,500px)] scale-[0.92] sm:scale-100 lg:max-w-none">
              <UniverseLandingOrbitWidget />
            </div>
          </div>
        </div>

        {examples.length > 0 ?
          <section className="relative mt-16" aria-labelledby={`${config.moduleKey}-space-gallery`}>
            <h2 id={`${config.moduleKey}-space-gallery`} className="text-xl font-bold text-white">
              {t("examples.gallery.title" as never)}
            </h2>
            <SpaceGallery examples={examples} />
          </section>
        : null}

        {config.durationKeys && config.durationKeys.length > 0 ?
          <div className="mt-12 flex flex-wrap gap-3">
            {config.durationKeys.map((key) => (
              <span
                key={key}
                className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-semibold text-white"
              >
                {t(key)}
              </span>
            ))}
          </div>
        : null}

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {config.featureCardKeys.map((key) => (
            <article key={key} className={studioVisual.cardGlass}>
              <p className="text-sm font-semibold text-white">{t(key)}</p>
            </article>
          ))}
        </div>

        {config.categoryKeys && config.categoryKeys.length > 0 ?
          <section className="mt-14" aria-labelledby={`${config.moduleKey}-categories`}>
            <h2 id={`${config.moduleKey}-categories`} className="text-xl font-bold text-white">
              {t("landing.shared.whatCanICreate" as never)}
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {config.categoryKeys.map((key) => (
                <article key={key} className={studioVisual.cardGlass}>
                  <p className="text-sm font-semibold text-white">{t(key)}</p>
                  <p className="mt-1 text-xs text-white/65">{t(categoryDescKey(key) as never)}</p>
                </article>
              ))}
            </div>
          </section>
        : null}

        {config.exampleCreationKeys && config.exampleCreationKeys.length > 0 ?
          <section className="mt-14" aria-labelledby={`${config.moduleKey}-examples`}>
            <h2 id={`${config.moduleKey}-examples`} className="text-xl font-bold text-white">
              {t("landing.shared.examples" as never)}
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-white/78">
              {config.exampleCreationKeys.map((key) => (
                <li key={key} className={studioVisual.cardGlass}>
                  {t(key)}
                </li>
              ))}
            </ul>
          </section>
        : null}

        {config.valuePropKeys && config.valuePropKeys.length > 0 ?
          <section className="mt-14" aria-labelledby={`${config.moduleKey}-value-props`}>
            <h2 id={`${config.moduleKey}-value-props`} className="text-xl font-bold text-white">
              {t("landing.shared.workflowValue" as never)}
            </h2>
            <ul className="mt-4 space-y-3">
              {config.valuePropKeys.map((key) => (
                <li key={key} className={`${studioVisual.cardGlass} text-sm text-white/82`}>
                  {t(key)}
                </li>
              ))}
            </ul>
          </section>
        : null}

        {config.workflowStepKeys.length > 0 ?
          <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {config.workflowStepKeys.map((key, index) => (
              <li key={key} className={`${studioVisual.cardGlass} text-sm text-white/85`}>
                <span className="font-bold text-emerald-300">{index + 1}.</span> {t(key)}
              </li>
            ))}
          </ol>
        : null}

        {config.benefitKeys.length > 0 ?
          <ul className="mt-10 space-y-2 text-sm text-white/70">
            {config.benefitKeys.map((key) => (
              <li key={key}>• {t(key)}</li>
            ))}
          </ul>
        : null}

        {config.showPricingEducation ?
          <section className={`mt-12 ${studioVisual.cardGlass}`}>
            <h2 className="text-lg font-bold text-white">{t("marketing.freePremium.title")}</h2>
            <p className="mt-2 text-sm text-white/72">{t("marketing.freePremium.lead")}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm text-white/75">
              <div>
                <p className="font-semibold text-white">{t("marketing.freePremium.free.title")}</p>
                <p className="mt-1">• {t("marketing.freePremium.free.ads")}</p>
              </div>
              <div>
                <p className="font-semibold text-white">{t("marketing.freePremium.premium.title")}</p>
                <p className="mt-1">• {t("marketing.freePremium.premium.generations")}</p>
                <p>• {t("marketing.freePremium.premium.sequences")}</p>
              </div>
            </div>
          </section>
        : null}

        {config.examplePromptKeys.length > 0 ?
          <div className="mt-10 flex flex-wrap gap-2">
            {config.examplePromptKeys.map((key) => (
              <span
                key={key}
                className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs text-white/80"
              >
                {t(key)}
              </span>
            ))}
          </div>
        : null}

        <div className="mt-12 flex flex-wrap gap-3 border-t border-white/10 pt-8">
          <Link href={config.primaryCtaHref} className={studioVisual.btnGradientPrimary}>
            {t(config.primaryCtaKey)}
          </Link>
          <Link href={config.secondaryCtaHref} className={studioVisual.btnOutline}>
            {t(config.secondaryCtaKey)}
          </Link>
          {config.tertiaryCtaKey && config.tertiaryCtaHref ?
            <Link href={config.tertiaryCtaHref} className={studioVisual.btnOutline}>
              {t(config.tertiaryCtaKey)}
            </Link>
          : null}
        </div>
      </div>
    </div>
  );
}
