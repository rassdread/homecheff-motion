"use client";

import Link from "next/link";
import { MotionBuildDebugBadge } from "@/components/layout/motion-build-debug-badge";
import { StudioNewStoryButton } from "@/components/studio/studio-new-story-button";
import { HcProjectStateBadge } from "@/components/projects/hc-project-state-badge";
import { useActiveTranslator } from "@/i18n/client";
import { buildHcHandoffUrl } from "@/lib/homecheff-project-package-core";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  projectTitle?: string | null;
  storyboardId?: string | null;
  showMakeVideo?: boolean;
  hcProjectId?: string | null;
};

export function StudioShellHeader({ projectTitle, storyboardId, showMakeVideo = false, hcProjectId }: Props) {
  const t = useActiveTranslator();
  const hcProject = hcProjectId ? loadHomeCheffProject(hcProjectId) : null;
  const legacyHandoffHref =
    storyboardId ?
      `/animate/instant/import?storyboardId=${encodeURIComponent(storyboardId)}`
    : null;
  const motionHref = hcProjectId
    ? buildHcHandoffUrl(hcProjectId, "motion")
    : legacyHandoffHref;
  const publishHref = hcProjectId ? buildHcHandoffUrl(hcProjectId, "publish") : null;

  const title = projectTitle?.trim() || t("studio.shell.defaultTitle");

  return (
    <header
      className={`sticky top-0 z-20 px-4 py-3 sm:px-6 ${studioVisual.editorSurface}`}
      data-testid="studio-project-context"
    >
      <div className="mx-auto flex w-full flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#006D52]">
            {t("studio.shell.brand")}
            {storyboardId ?
              <span className="ml-2 font-medium normal-case tracking-normal text-zinc-500">
                · {t("studio.workspace.projectContext")}
              </span>
            : null}
          </p>
          <h1 className="truncate text-lg font-bold text-zinc-900" title={title}>
            {title}
          </h1>
          {hcProject ?
            <HcProjectStateBadge project={hcProject} compact />
          : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MotionBuildDebugBadge className="hidden sm:block" />
          {publishHref ?
            <Link
              href={publishHref}
              className={`min-h-[44px] px-3 py-2 text-xs !text-zinc-800 !border-zinc-300 !bg-white/90 ${studioVisual.btnOutline}`}
            >
              {t("hcProject.usePublish")}
            </Link>
          : null}
          <Link
            href="/studio"
            prefetch={false}
            className={`min-h-[44px] px-3 py-2 text-xs !text-zinc-800 !border-zinc-300 !bg-white/90 ${studioVisual.btnOutline}`}
          >
            {t("studio.shell.myStudio")}
          </Link>
          <Link
            href="/studio/storyboards"
            prefetch={false}
            className={`min-h-[44px] px-3 py-2 text-xs !text-zinc-800 !border-zinc-300 !bg-white/90 ${studioVisual.btnOutline}`}
          >
            {t("studio.start.myStories")}
          </Link>
          <StudioNewStoryButton
            variant="secondary"
            labelKey="studio.shell.newStory"
            className="!inline-flex"
          />
          {showMakeVideo && motionHref ?
            <Link
              href={motionHref}
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
