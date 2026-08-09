"use client";

import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthActionHref } from "@/hooks/use-auth-action-href";
import { brand } from "@/lib/brand";

export function MaakChoicePage() {
  const t = useActiveTranslator();
  const newStoryHref = useAuthActionHref(
    "/studio/experience?experience=CREATIVE_STORYBOARD&mode=quick"
  );
  const photosHref = useAuthActionHref(
    "/studio/experience?experience=CREATIVE_ANIMATION&mode=quick&photoIntent=photo_to_video"
  );
  const storiesHref = useAuthActionHref("/studio/storyboards");
  const studioHref = useAuthActionHref("/studio");
  const editorHref = useAuthActionHref("/editor");

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
        <header className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {t("maak.title")}
          </h1>
        </header>

        <div className="mt-10 grid gap-4">
          <AppCard className="border-[#006D52]/20 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-bold text-zinc-900">{t("maak.newStory.title")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{t("maak.newStory.body")}</p>
            <GradientButton href={newStoryHref} className="mt-5 w-full sm:w-auto">
              {t("maak.newStory.title")}
            </GradientButton>
          </AppCard>

          <AppCard className="border-[#0067B1]/20 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-bold text-zinc-900">{t("maak.photos.title")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{t("maak.photos.body")}</p>
            <Link
              href={photosHref}
              prefetch={false}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-[#0067B1]/30 bg-[#0067B1]/5 px-6 py-3 text-sm font-semibold text-[#0067B1] transition-colors hover:bg-[#0067B1]/10 sm:w-auto"
            >
              {t("maak.photos.title")}
            </Link>
          </AppCard>

          <AppCard className="border-[#0067B1]/20 bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-xl font-bold text-zinc-900">{t("maak.edit.title")}</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{t("maak.edit.body")}</p>
            <Link
              href={editorHref}
              prefetch={false}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-[#0067B1]/30 bg-[#0067B1]/5 px-6 py-3 text-sm font-semibold text-[#0067B1] transition-colors hover:bg-[#0067B1]/10 sm:w-auto"
            >
              {t("suite.nav.editor")}
            </Link>
          </AppCard>

          <AppCard className="border-[#0067B1]/20 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-bold text-zinc-900">{t("maak.studio.title")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{t("maak.studio.body")}</p>
            <Link
              href={storiesHref}
              prefetch={false}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 sm:w-auto"
            >
              {t("maak.studio.title")}
            </Link>
          </AppCard>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500">
          <Link href={studioHref} prefetch={false} className="font-medium text-[#006D52] hover:underline">
            {t("maak.openStudioLink")}
          </Link>
        </p>
      </section>
    </main>
  );
}
