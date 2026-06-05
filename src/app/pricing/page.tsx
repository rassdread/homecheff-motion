"use client";

import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";

export default function PricingPage() {
  const t = useActiveTranslator();
  const session = useAuthSession();

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-10 sm:py-16">
        <header className="max-w-2xl">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: brand.studioGreen }}
          >
            {t("pricing.label")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {t("pricing.title")}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">{t("pricing.subtitle")}</p>
        </header>

        <div className="mt-10 space-y-6">
          <AppCard className="bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-zinc-900">{t("pricing.credits.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{t("pricing.credits.body")}</p>
          </AppCard>

          <AppCard className="bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-zinc-900">{t("pricing.motion.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{t("pricing.motion.body")}</p>
          </AppCard>

          <AppCard className="bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-zinc-900">{t("pricing.studio.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{t("pricing.studio.body")}</p>
          </AppCard>
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {session.resolved && session.user ? (
            <Link
              href="/mijn-verbruik"
              prefetch={false}
              className="inline-flex items-center rounded-full border border-[#006D52]/30 bg-[#006D52]/5 px-6 py-3 text-sm font-semibold text-[#006D52] hover:bg-[#006D52]/10"
            >
              {t("pricing.usageLink")} →
            </Link>
          ) : (
            <GradientButton href="/signup" className="px-8">
              {t("nav.getStarted")}
            </GradientButton>
          )}
          <Link
            href="/create"
            prefetch={false}
            className="text-sm font-semibold text-zinc-600 hover:text-zinc-900 hover:underline"
          >
            {t("pricing.createLink")} →
          </Link>
        </div>
      </section>
    </main>
  );
}
