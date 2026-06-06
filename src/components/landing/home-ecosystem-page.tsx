"use client";

import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { useAuthActionHref } from "@/hooks/use-auth-action-href";
import { brand } from "@/lib/brand";

type EcosystemProduct = {
  id: string;
  nameKey: TranslationKey;
  taglineKey: TranslationKey;
  color: string;
  href?: string;
  comingSoon?: boolean;
};

const ECOSYSTEM_PRODUCTS: EcosystemProduct[] = [
  {
    id: "homecheff",
    nameKey: "landing.ecosystem.homecheff.name",
    taglineKey: "landing.ecosystem.homecheff.tagline",
    color: brand.studioGreen,
    href: "/about",
  },
  {
    id: "homegarden",
    nameKey: "landing.ecosystem.homegarden.name",
    taglineKey: "landing.ecosystem.homegarden.tagline",
    color: brand.studioGreen,
    comingSoon: true,
  },
  {
    id: "homedesigner",
    nameKey: "landing.ecosystem.homedesigner.name",
    taglineKey: "landing.ecosystem.homedesigner.tagline",
    color: brand.studioBlue,
    comingSoon: true,
  },
  {
    id: "motion",
    nameKey: "landing.ecosystem.motion.name",
    taglineKey: "landing.ecosystem.motion.tagline",
    color: brand.studioGreen,
    href: "/animate/instant",
  },
  {
    id: "studio",
    nameKey: "landing.ecosystem.studio.name",
    taglineKey: "landing.ecosystem.studio.tagline",
    color: brand.studioBlue,
    href: "/studio",
  },
];

function EcosystemPill({ product }: { product: EcosystemProduct }) {
  const t = useActiveTranslator();
  const actionHref = useAuthActionHref(product.href ?? "/");
  const inner = (
    <div
      className={`group h-full rounded-3xl border-2 bg-white p-4 text-left shadow-[0_16px_40px_-24px_rgba(16,185,129,0.2)] transition-shadow hover:shadow-md ${
        product.href ? "cursor-pointer" : ""
      }`}
      style={{ borderColor: `${product.color}33` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: product.color }}>
        {t(product.nameKey)}
      </p>
      <p className="mt-1 text-sm text-zinc-600">{t(product.taglineKey)}</p>
      {product.comingSoon ? (
        <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {t("landing.ecosystem.comingSoon")}
        </span>
      ) : product.href ? (
        <span
          className="mt-2 inline-block text-xs font-semibold group-hover:underline"
          style={{ color: product.color }}
        >
          {t("landing.ecosystem.explore")} →
        </span>
      ) : null}
    </div>
  );

  if (product.href) {
    return (
      <Link href={actionHref} prefetch={false} className="block h-full">
        {inner}
      </Link>
    );
  }

  return inner;
}

function ShowcaseCard({
  titleKey,
  bodyKey,
  ctaKey,
  href,
  accent,
}: {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  ctaKey: TranslationKey;
  href: string;
  accent: string;
}) {
  const t = useActiveTranslator();
  const actionHref = useAuthActionHref(href);

  return (
    <AppCard className="flex h-full flex-col bg-white p-6 sm:p-8">
      <div
        className="mb-4 h-1 w-12 rounded-full"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <h3 className="text-xl font-bold text-zinc-900">{t(titleKey)}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-600 sm:text-base">{t(bodyKey)}</p>
      <Link
        href={actionHref}
        prefetch={false}
        className="mt-5 inline-flex text-sm font-semibold hover:underline"
        style={{ color: accent }}
      >
        {t(ctaKey)} →
      </Link>
    </AppCard>
  );
}

export function HomeEcosystemPage() {
  const t = useActiveTranslator();
  const maakHref = useAuthActionHref("/maak");
  const instantHref = useAuthActionHref("/animate/instant");
  const studioStoriesHref = useAuthActionHref("/studio/storyboards");

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto w-full max-w-6xl px-6 pb-8 pt-12 sm:px-10 sm:pb-12 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 flex w-fit items-center gap-3 rounded-full border border-[#006D52]/20 bg-[#006D52]/5 px-4 py-2">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-[#006D52]/20 bg-white">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${brand.accentGradient} opacity-90`}
              />
            </div>
            <p className="text-sm font-semibold tracking-wide text-[#006D52]">{brand.shortName}</p>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
            {t("landing.hero.headline")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            {t("landing.hero.subtext")}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GradientButton href={maakHref} className="px-8">
              {t("landing.hero.ctaPrimary")}
            </GradientButton>
            <Link
              href="#showcase"
              prefetch={false}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#0067B1]/30 bg-[#0067B1]/5 px-6 py-3 text-sm font-semibold text-[#0067B1] transition-colors hover:bg-[#0067B1]/10"
            >
              {t("landing.hero.ctaSecondary")}
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ECOSYSTEM_PRODUCTS.map((product) => (
            <EcosystemPill key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section id="showcase" className="scroll-mt-20 border-y border-[#006D52]/10 bg-white/60 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
          <h2 className="text-center text-2xl font-bold text-zinc-900 sm:text-3xl">
            {t("landing.showcase.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-zinc-600 sm:text-base">
            {t("landing.showcase.subtext")}
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <ShowcaseCard
              titleKey="landing.showcase.motion.title"
              bodyKey="landing.showcase.motion.body"
              ctaKey="landing.showcase.motion.cta"
              href="/animate/instant"
              accent={brand.studioGreen}
            />
            <ShowcaseCard
              titleKey="landing.showcase.studio.title"
              bodyKey="landing.showcase.studio.body"
              ctaKey="landing.showcase.studio.cta"
              href="/studio"
              accent={brand.studioBlue}
            />
            <ShowcaseCard
              titleKey="landing.showcase.creator.title"
              bodyKey="landing.showcase.creator.body"
              ctaKey="landing.showcase.creator.cta"
              href="/videos"
              accent={brand.studioBlue}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14 sm:px-10 sm:py-16">
        <AppCard className="overflow-hidden bg-white p-0">
          <div className="grid md:grid-cols-2">
            <div className="p-8 sm:p-10">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: brand.studioGreen }}
              >
                {t("landing.flow.label")}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl">
                {t("landing.flow.title")}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-zinc-600 sm:text-base">
                {t("landing.flow.body")}
              </p>
              <ol className="mt-6 space-y-3 text-sm text-zinc-700">
                {(["step1", "step2", "step3", "step4"] as const).map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: index % 2 === 0 ? brand.studioGreen : brand.studioBlue }}
                    >
                      {index + 1}
                    </span>
                    <span>{t(`landing.flow.${step}`)}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-8 flex flex-wrap gap-3">
                <GradientButton href={studioStoriesHref} className="px-6 py-2.5 text-sm">
                  {t("landing.flow.ctaStudio")}
                </GradientButton>
                <Link
                  href={instantHref}
                  prefetch={false}
                  className="inline-flex items-center rounded-full border border-[#0067B1]/30 bg-[#0067B1]/5 px-6 py-2.5 text-sm font-semibold text-[#0067B1] hover:bg-[#0067B1]/10"
                >
                  {t("landing.flow.ctaMotion")}
                </Link>
              </div>
            </div>
            <div
              className="flex flex-col justify-center gap-4 p-8 sm:p-10"
              style={{
                background: `linear-gradient(135deg, ${brand.studioGreen}12 0%, ${brand.studioBlue}18 100%)`,
              }}
            >
              <p className="text-sm font-semibold text-zinc-800">{t("landing.flow.highlightTitle")}</p>
              <ul className="space-y-2 text-sm text-zinc-600">
                {(["highlight1", "highlight2", "highlight3"] as const).map((key) => (
                  <li key={key} className="flex items-start gap-2">
                    <span className="mt-1 text-[#006D52]" aria-hidden>
                      ✓
                    </span>
                    {t(`landing.flow.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </AppCard>
      </section>

      <section className="border-t border-[#006D52]/10 bg-white/40 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-6xl px-6 text-center sm:px-10">
          <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">{t("landing.bottomCta.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-600 sm:text-base">
            {t("landing.bottomCta.subtext")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GradientButton href="/signup" className="px-8">
              {t("nav.getStarted")}
            </GradientButton>
            <Link
              href="/pricing"
              prefetch={false}
              className="text-sm font-semibold text-zinc-600 hover:text-zinc-900 hover:underline"
            >
              {t("landing.bottomCta.pricingLink")} →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
