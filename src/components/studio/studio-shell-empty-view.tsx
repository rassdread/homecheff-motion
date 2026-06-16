"use client";

import Link from "next/link";
import { StudioNewStoryButton } from "@/components/studio/studio-new-story-button";
import { StudioShellHeader } from "@/components/studio/studio-shell-header";
import { StudioToolPlaceholderPanel } from "@/components/studio/studio-tool-placeholder-panel";
import { StudioToolStrip } from "@/components/studio/studio-tool-strip";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthActionHref } from "@/hooks/use-auth-action-href";
import { brand } from "@/lib/brand";
import { growthSidebarLayoutClasses } from "@/lib/growth-sidebar-layout";
import type { StudioToolId } from "@/lib/studio-tool-id";
import { useState } from "react";

export function StudioShellEmptyView() {
  const t = useActiveTranslator();
  const [activeTool, setActiveTool] = useState<StudioToolId>("story");
  const photosHref = useAuthActionHref("/animate/instant");
  const storiesHref = useAuthActionHref("/studio/storyboards");

  return (
    <main className={`flex ${growthSidebarLayoutClasses.pageFloorFlex} ${brand.softGradientBg}`}>
      <StudioShellHeader />

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-4 lg:px-4 lg:pb-0">
        <aside className="hidden border-r border-zinc-200 bg-white p-4 lg:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.workspace.scenes")}
          </p>
          <p className="mt-4 text-sm text-zinc-600">{t("studio.shell.emptyScenesHint")}</p>
        </aside>

        <section className="flex flex-1 flex-col bg-white px-4 py-8 sm:px-6 lg:rounded-t-xl lg:border lg:border-zinc-200">
          {activeTool === "story" ?
            <div className="mx-auto flex w-full max-w-md flex-col gap-3">
              <p className="text-sm text-zinc-500">{t("studio.shell.emptyActionsHint")}</p>
              <StudioNewStoryButton labelKey="studio.start.newStory" className="w-full" />
              <Link
                href={photosHref}
                prefetch={false}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#0067B1]/30 bg-white px-6 text-sm font-semibold text-[#0067B1] hover:bg-[#0067B1]/5"
              >
                {t("studio.start.photosToVideo")}
              </Link>
              <Link
                href={storiesHref}
                prefetch={false}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                {t("studio.start.myStories")}
              </Link>
            </div>
          : (
            <StudioToolPlaceholderPanel tool={activeTool} />
          )}
        </section>
      </div>

      <StudioToolStrip activeTool={activeTool} onToolChange={setActiveTool} />

      <div className="border-t border-zinc-200/80 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 text-xs text-zinc-500">
          <Link href="/studio" prefetch={false} className="font-semibold text-[#006D52] hover:underline">
            {t("studio.shell.myStudio")}
          </Link>
          <Link href="/studio/advanced" prefetch={false} className="font-semibold text-zinc-500 hover:text-zinc-700">
            {t("studio.shell.advancedLink")}
          </Link>
        </div>
      </div>
    </main>
  );
}
