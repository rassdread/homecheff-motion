"use client";

import Link from "next/link";
import { StudioAdvancedFeaturesToggle } from "@/components/studio/studio-advanced-features-toggle";
import { StudioNewStoryButton } from "@/components/studio/studio-new-story-button";
import { StudioShellHeader } from "@/components/studio/studio-shell-header";
import { StudioToolPlaceholderPanel } from "@/components/studio/studio-tool-placeholder-panel";
import { StudioToolStrip } from "@/components/studio/studio-tool-strip";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import type { StudioToolId } from "@/lib/studio-tool-id";
import { useState } from "react";

export function StudioShellEmptyView() {
  const t = useActiveTranslator();
  const [activeTool, setActiveTool] = useState<StudioToolId>("story");

  return (
    <main className={`flex min-h-screen flex-1 flex-col ${brand.softGradientBg}`}>
      <StudioShellHeader />

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:grid lg:grid-cols-[220px_minmax(0,1fr)_300px] lg:gap-4 lg:px-4 lg:pb-0">
        <aside className="hidden border-r border-zinc-200 bg-white p-4 lg:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.workspace.scenes")}
          </p>
          <p className="mt-4 text-sm text-zinc-600">{t("studio.shell.emptyScenesHint")}</p>
        </aside>

        <section className="flex flex-1 flex-col bg-white px-4 py-8 sm:px-6 lg:rounded-t-xl lg:border lg:border-zinc-200">
          {activeTool === "story" ?
            <div className="mx-auto flex w-full max-w-lg flex-col">
              <AppCard className="border-[#006D52]/15 bg-[#f7fbf8] p-8 text-center">
                <h2 className="text-2xl font-bold text-zinc-900">{t("studio.start.title")}</h2>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">{t("studio.start.subtitle")}</p>
                <div className="mt-8 flex flex-col gap-3">
                  <StudioNewStoryButton />
                  <Link
                    href="/animate/instant"
                    prefetch={false}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#0067B1]/30 bg-white px-6 text-sm font-semibold text-[#0067B1] hover:bg-[#0067B1]/5"
                  >
                    {t("studio.start.photosToVideo")}
                  </Link>
                  <Link
                    href="/studio/storyboards"
                    prefetch={false}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    {t("studio.start.myStories")}
                  </Link>
                </div>
              </AppCard>
            </div>
          : (
            <StudioToolPlaceholderPanel tool={activeTool} />
          )}
        </section>

        <aside className="hidden bg-zinc-50/50 p-4 lg:block lg:border-l lg:border-zinc-200">
          <AppCard className="bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
              {t("studio.shell.aiDirector")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{t("studio.shell.emptyDirectorHint")}</p>
          </AppCard>
        </aside>
      </div>

      <StudioToolStrip activeTool={activeTool} onToolChange={setActiveTool} />

      <div className="border-t border-zinc-200/80 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 text-xs text-zinc-500">
          <Link href="/studio/advanced" prefetch={false} className="font-semibold text-zinc-500 hover:text-zinc-700">
            {t("studio.shell.advancedLink")}
          </Link>
        </div>
      </div>
    </main>
  );
}
