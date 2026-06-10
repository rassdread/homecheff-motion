"use client";

import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthActionHref } from "@/hooks/use-auth-action-href";
import { brand } from "@/lib/brand";

const SUITE_HOME_CARDS = [
  {
    id: "editor",
    hrefKey: "/editor",
    titleKey: "suite.home.editor.title",
    subtitleKey: "universe.planet.editor.short",
    exampleKey: "suite.home.editor.example",
    outputKey: "suite.home.editor.output",
    actionKey: "suite.home.editor.action",
    accent: "border-[#0067B1]/25 bg-gradient-to-br from-[#0067B1]/5 to-white",
  },
  {
    id: "studio",
    hrefKey: "/studio",
    titleKey: "suite.home.studio.title",
    subtitleKey: "universe.planet.studio.short",
    exampleKey: "suite.home.studio.example",
    outputKey: "suite.home.studio.output",
    actionKey: "suite.home.studio.action",
    accent: "border-[#006D52]/25 bg-gradient-to-br from-[#006D52]/5 to-white",
  },
  {
    id: "motion",
    hrefKey: "/animate/instant",
    titleKey: "suite.home.motion.title",
    subtitleKey: "universe.planet.motion.short",
    exampleKey: "suite.home.motion.example",
    outputKey: "suite.home.motion.output",
    actionKey: "suite.home.motion.action",
    accent: "border-violet-200 bg-gradient-to-br from-violet-50 to-white",
  },
  {
    id: "publish",
    hrefKey: "/publish",
    titleKey: "suite.home.publish.title",
    subtitleKey: "universe.planet.publish.short",
    exampleKey: "suite.home.publish.example",
    outputKey: "suite.home.publish.output",
    actionKey: "suite.home.publish.action",
    accent: "border-amber-200 bg-gradient-to-br from-amber-50 to-white",
  },
  {
    id: "library",
    hrefKey: "/library",
    titleKey: "suite.home.library.title",
    subtitleKey: "universe.planet.library.short",
    exampleKey: "suite.home.library.example",
    outputKey: "suite.home.library.output",
    actionKey: "suite.home.library.action",
    accent: "border-zinc-200 bg-gradient-to-br from-zinc-50 to-white",
  },
] as const;

export function SuiteHomePage() {
  const t = useActiveTranslator();
  const editorHref = useAuthActionHref("/editor");
  const studioHref = useAuthActionHref("/studio");
  const motionHref = useAuthActionHref("/animate/instant");
  const publishHref = useAuthActionHref("/publish");
  const libraryHref = useAuthActionHref("/library");

  const hrefs: Record<string, string> = {
    editor: editorHref,
    studio: studioHref,
    motion: motionHref,
    publish: publishHref,
    library: libraryHref,
  };

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
        <header className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl">
            {t("suite.home.headline")}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-zinc-600">{t("suite.home.subhead")}</p>
        </header>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SUITE_HOME_CARDS.map((card) => (
            <AppCard key={card.id} className={`flex h-full flex-col p-6 sm:p-7 ${card.accent}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t(card.outputKey as never)}</p>
              <h2 className="mt-2 text-xl font-bold text-zinc-900">{t(card.titleKey as never)}</h2>
              <p className="mt-1 text-sm font-medium text-[#006D52]">{t(card.subtitleKey as never)}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">{t(card.exampleKey as never)}</p>
              <Link
                href={hrefs[card.id]}
                prefetch={false}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#0067B1] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#005a9c]"
              >
                {t(card.actionKey as never)}
              </Link>
            </AppCard>
          ))}
        </div>
      </section>
    </main>
  );
}
