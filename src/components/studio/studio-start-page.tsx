"use client";

import Link from "next/link";
import { MotionBuildDebugBadge } from "@/components/layout/motion-build-debug-badge";
import { StudioAdvancedFeaturesToggle } from "@/components/studio/studio-advanced-features-toggle";
import { StudioNewStoryButton } from "@/components/studio/studio-new-story-button";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";

/**
 * TODO(Studio V2 P1): embed photo-to-video flow in Studio Workspace instead of /animate/instant.
 * @see docs/studio-v2-architecture-plan.md — P1 "Foto's naar video in workspace"
 */
export function StudioStartPage() {
  const t = useActiveTranslator();

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto flex w-full max-w-3xl flex-col px-6 py-14 sm:px-10 sm:py-20">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: brand.studioGreen }}
        >
          {t("studio.start.label")}
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          {t("studio.start.title")}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
          {t("studio.start.subtitle")}
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <StudioNewStoryButton />
          <Link
            href="/animate/instant"
            prefetch={false}
            className="inline-flex min-h-12 w-full flex-col items-center justify-center rounded-full border border-[#0067B1]/30 bg-white px-6 py-3 text-sm font-semibold text-[#0067B1] hover:bg-[#0067B1]/5 sm:w-auto sm:py-2"
          >
            <span>{t("studio.start.photosToVideo")}</span>
            <span className="mt-0.5 text-xs font-normal text-[#0067B1]/80">
              {t("studio.start.photosToVideoHint")}
            </span>
          </Link>
          <div
            className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4"
            aria-disabled="true"
          >
            <p className="text-sm font-semibold text-zinc-500">
              {t("studio.start.editExistingVideo")}
              <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                {t("studio.start.comingSoon")}
              </span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              {t("studio.start.editExistingVideoHint")}
            </p>
          </div>
          <Link
            href="/studio/storyboards"
            prefetch={false}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 sm:w-auto"
          >
            {t("studio.start.myStories")}
          </Link>
        </div>

        <ol className="mt-12 space-y-3 rounded-2xl border border-zinc-200/80 bg-white/80 p-5 text-sm text-zinc-700 shadow-sm">
          <li className="flex gap-3">
            <span className="font-bold text-[#006D52]">1</span>
            <span>{t("studio.start.step1")}</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-[#006D52]">2</span>
            <span>{t("studio.start.step2")}</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-[#006D52]">3</span>
            <span>{t("studio.start.step3")}</span>
          </li>
        </ol>

        <div className="mt-10 border-t border-zinc-200/80 pt-6">
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <StudioAdvancedFeaturesToggle />
            <MotionBuildDebugBadge />
          </div>
        </div>
      </section>
    </main>
  );
}
