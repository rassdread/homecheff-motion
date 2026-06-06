"use client";

import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";

export default function CreatePage() {
  const t = useActiveTranslator();

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-10 sm:py-16">
        <header className="max-w-2xl">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: brand.studioGreen }}
          >
            {t("create.label")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {t("create.title")}
          </h1>
          <p className="mt-4 text-base text-zinc-600">{t("create.subtitle")}</p>
        </header>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <AppCard className="flex h-full flex-col border-[#006D52]/25 bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
              {t("create.motion.label")}
            </p>
            <h2 className="mt-2 text-xl font-bold text-zinc-900">{t("create.motion.title")}</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-600">
              {t("create.motion.body")}
            </p>
            <GradientButton href="/animate/instant" className="mt-6 w-full sm:w-auto">
              {t("create.motion.cta")}
            </GradientButton>
          </AppCard>

          <AppCard className="flex h-full flex-col border-[#0067B1]/25 bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
              {t("create.studio.label")}
            </p>
            <h2 className="mt-2 text-xl font-bold text-zinc-900">{t("create.studio.title")}</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-600">
              {t("create.studio.body")}
            </p>
            <Link
              href="/studio/storyboards/new"
              prefetch={false}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-[#0067B1]/30 bg-[#0067B1]/5 px-6 py-3 text-sm font-semibold text-[#0067B1] transition-colors hover:bg-[#0067B1]/10 sm:w-auto"
            >
              {t("create.studio.cta")}
            </Link>
          </AppCard>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500">
          {t("create.handoffHint")}{" "}
          <Link href="/studio/storyboards" prefetch={false} className="font-medium text-[#006D52] hover:underline">
            {t("create.handoffLink")}
          </Link>
        </p>
      </section>
    </main>
  );
}
