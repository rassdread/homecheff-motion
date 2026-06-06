"use client";

import Link from "next/link";
import { MotionBuildDebugBadge } from "@/components/layout/motion-build-debug-badge";
import { StudioAdvancedFeaturesToggle } from "@/components/studio/studio-advanced-features-toggle";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";

export function StudioProductionSplash() {
  const t = useActiveTranslator();

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto flex w-full max-w-3xl flex-col px-6 py-14 sm:px-10 sm:py-20">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: brand.studioGreen }}
        >
          {t("studio.splash.label")}
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          {t("studio.splash.title")}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
          {t("studio.splash.subtitle")}
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <GradientButton href="/studio/storyboards" className="w-full sm:w-auto">
            {t("studio.splash.openStoryboards")}
          </GradientButton>
          <Link
            href="/studio/storyboards/new"
            prefetch={false}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#0067B1]/30 bg-white px-6 text-sm font-semibold text-[#0067B1] hover:bg-[#0067B1]/5 sm:w-auto"
          >
            {t("studio.splash.newProject")}
          </Link>
          <Link
            href="/animate/instant"
            prefetch={false}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 sm:w-auto"
          >
            {t("studio.splash.openMotion")} →
          </Link>
        </div>

        <ol className="mt-12 space-y-3 rounded-2xl border border-zinc-200/80 bg-white/80 p-5 text-sm text-zinc-700 shadow-sm">
          <li className="flex gap-3">
            <span className="font-bold text-[#006D52]">1</span>
            <span>{t("studio.splash.step1")}</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-[#006D52]">2</span>
            <span>{t("studio.splash.step2")}</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-[#006D52]">3</span>
            <span>{t("studio.splash.step3")}</span>
          </li>
        </ol>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <StudioAdvancedFeaturesToggle />
          <MotionBuildDebugBadge />
        </div>
      </section>
    </main>
  );
}
