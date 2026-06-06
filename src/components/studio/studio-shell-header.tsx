"use client";

import Link from "next/link";
import { MotionBuildDebugBadge } from "@/components/layout/motion-build-debug-badge";
import { StudioNewStoryButton } from "@/components/studio/studio-new-story-button";
import { useActiveTranslator } from "@/i18n/client";

type Props = {
  projectTitle?: string | null;
  storyboardId?: string | null;
  showMakeVideo?: boolean;
};

export function StudioShellHeader({ projectTitle, storyboardId, showMakeVideo = false }: Props) {
  const t = useActiveTranslator();
  const handoffHref =
    storyboardId ?
      `/animate/instant/import?storyboardId=${encodeURIComponent(storyboardId)}`
    : null;

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#006D52]">
            {t("studio.shell.brand")}
          </p>
          <h1 className="truncate text-lg font-bold text-zinc-900">
            {projectTitle?.trim() || t("studio.shell.defaultTitle")}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MotionBuildDebugBadge className="hidden sm:block" />
          <Link
            href="/studio/storyboards"
            prefetch={false}
            className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {t("studio.start.myStories")}
          </Link>
          <StudioNewStoryButton
            variant="secondary"
            labelKey="studio.shell.newStory"
            className="!inline-flex"
          />
          {showMakeVideo && handoffHref ?
            <Link
              href={handoffHref}
              className="min-h-[44px] rounded-full bg-[#006D52] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005a44]"
            >
              {t("studio.workspace.openMotion")}
            </Link>
          : null}
        </div>
      </div>
    </header>
  );
}
