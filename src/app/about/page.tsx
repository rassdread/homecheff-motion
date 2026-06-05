"use client";

import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";

export default function AboutPage() {
  const t = useActiveTranslator();

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-10 sm:py-16">
        <header className="max-w-2xl">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: brand.studioGreen }}
          >
            {t("about.label")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {t("about.title")}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">{t("about.subtitle")}</p>
        </header>

        <AppCard className="mt-10 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-bold text-zinc-900">{t("about.vision.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
            {t("about.vision.body")}
          </p>
        </AppCard>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(
            [
              { key: "homecheff", color: brand.studioGreen },
              { key: "homegarden", color: "#2d6a4f" },
              { key: "homedesigner", color: brand.studioBlue },
              { key: "motion", color: brand.studioGreen, href: "/animate/instant" },
              { key: "studio", color: brand.studioBlue, href: "/studio" },
            ] as const
          ).map((item) => (
            <AppCard key={item.key} className="bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: item.color }}>
                {t(`about.products.${item.key}.name`)}
              </p>
              <p className="mt-2 text-sm text-zinc-600">{t(`about.products.${item.key}.body`)}</p>
              {"href" in item && item.href ? (
                <Link
                  href={item.href}
                  prefetch={false}
                  className="mt-3 inline-block text-sm font-semibold hover:underline"
                  style={{ color: item.color }}
                >
                  {t("about.products.explore")} →
                </Link>
              ) : null}
            </AppCard>
          ))}
        </div>

        <div className="mt-12 text-center">
          <GradientButton href="/create" className="px-8">
            {t("about.cta")}
          </GradientButton>
        </div>
      </section>
    </main>
  );
}
