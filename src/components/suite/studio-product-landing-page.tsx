"use client";

import Link from "next/link";
import { UniverseBackground } from "@/components/suite/universe/universe-background";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioProductLandingConfig } from "@/lib/studio-product-landing-config";
import { studioVisual } from "@/lib/studio-visual-tokens";

export type StudioProductLandingContinue = {
  label: string;
  href: string;
};

type Props = {
  config: StudioProductLandingConfig;
  continueCard?: StudioProductLandingContinue | null;
};

export function StudioProductLandingPage({ config, continueCard }: Props) {
  const t = useActiveTranslator();

  return (
    <main className={`relative flex-1 overflow-hidden ${studioVisual.pageBg}`} data-testid={`landing-${config.moduleKey}`}>
      <UniverseBackground />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:px-8 sm:pt-20 lg:pt-24">
        <div className="max-w-3xl">
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: config.accentColor }}
          >
            {t(config.eyebrowKey)}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {t(config.titleKey)}
          </h1>
          <p className="mt-3 text-lg font-medium text-white/90">{t(config.subtitleKey)}</p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75">
            {t(config.descriptionKey)}
          </p>

          {continueCard ?
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
          : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={config.primaryCtaHref} className={studioVisual.btnGradientPrimary}>
              {t(config.primaryCtaKey)}
            </Link>
            <Link href={config.secondaryCtaHref} className={studioVisual.btnOutline}>
              {t(config.secondaryCtaKey)}
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {config.featureCardKeys.map((key) => (
            <article key={key} className={studioVisual.cardGlass}>
              <p className="text-sm font-semibold text-white">{t(key)}</p>
            </article>
          ))}
        </div>

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
      </div>
    </main>
  );
}
