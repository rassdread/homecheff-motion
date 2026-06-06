"use client";

import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";

export default function DiscoverPage() {
  const t = useActiveTranslator();

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10 sm:py-16">
        <header className="max-w-2xl">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: brand.studioBlue }}
          >
            {t("discover.label")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {t("discover.title")}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">{t("discover.subtitle")}</p>
        </header>

        <AppCard className="mt-10 border-dashed border-zinc-200 bg-white/90 p-8 text-center sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t("discover.marketplace.badge")}
          </p>
          <h2 className="mt-3 text-xl font-bold text-zinc-900">{t("discover.marketplace.title")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-600">{t("discover.marketplace.body")}</p>
        </AppCard>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <AppCard className="bg-white p-6">
            <h3 className="font-bold text-zinc-900">{t("discover.now.motion.title")}</h3>
            <p className="mt-2 text-sm text-zinc-600">{t("discover.now.motion.body")}</p>
            <Link
              href="/animate/instant"
              prefetch={false}
              className="mt-4 inline-block text-sm font-semibold text-[#006D52] hover:underline"
            >
              {t("discover.now.motion.link")} →
            </Link>
          </AppCard>
          <AppCard className="bg-white p-6">
            <h3 className="font-bold text-zinc-900">{t("discover.now.studio.title")}</h3>
            <p className="mt-2 text-sm text-zinc-600">{t("discover.now.studio.body")}</p>
            <Link
              href="/studio/storyboards"
              prefetch={false}
              className="mt-4 inline-block text-sm font-semibold text-[#0067B1] hover:underline"
            >
              {t("discover.now.studio.link")} →
            </Link>
          </AppCard>
        </div>

        <div className="mt-12 text-center">
          <GradientButton href="/maak" className="px-8">
            {t("discover.cta")}
          </GradientButton>
        </div>
      </section>
    </main>
  );
}
