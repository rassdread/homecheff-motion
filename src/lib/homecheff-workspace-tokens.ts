import { studioVisual } from "@/lib/studio-visual-tokens";

/** Shared HomeCheff workspace shell visual tokens (Editor V3 benchmark). */
export const workspaceVisual = {
  ...studioVisual,
  shellBg: "studio-page-bg min-h-[calc(100dvh-4rem)] flex flex-col flex-1 text-zinc-100",
  topBar:
    "sticky top-0 z-30 border-b border-white/[0.085] bg-[#041428]/80 backdrop-blur-xl shadow-[0_6px_26px_-12px_rgba(0,103,177,0.28)]",
  topBarInner: "mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-3 px-3 py-2.5 sm:px-6 lg:px-8",
  grid: "mx-auto grid w-full max-w-[1600px] flex-1 gap-3 px-3 py-4 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)_280px] lg:gap-4 lg:px-8 lg:py-5",
  leftPanel:
    "hidden lg:flex lg:flex-col lg:gap-3 lg:overflow-y-auto lg:max-h-[calc(100dvh-12rem)]",
  centerPanel: "min-w-0 flex flex-col gap-3",
  rightPanel:
    "hidden lg:flex lg:flex-col lg:gap-3 lg:overflow-y-auto lg:max-h-[calc(100dvh-12rem)]",
  bottomBar:
    "sticky bottom-0 z-20 border-t border-white/[0.08] bg-[#041428]/90 backdrop-blur-xl px-3 py-3 sm:px-6 lg:static lg:border-t-0 lg:bg-transparent lg:backdrop-blur-none lg:px-0 lg:py-0 lg:col-span-full",
  glassPanel:
    "rounded-xl border border-white/12 bg-white/[0.96] p-4 text-zinc-900 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.35)] backdrop-blur-sm",
  serviceBadge:
    "inline-flex items-center rounded-full border border-[#0067B1]/35 bg-[#0067B1]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0067B1]",
  mobilePaneTrigger:
    "inline-flex min-h-11 items-center rounded-full border border-zinc-300/80 bg-white/90 px-4 text-xs font-semibold text-zinc-800 lg:hidden",
} as const;

export type HomeCheffWorkspaceService = "editor" | "motion" | "publish" | "studio" | "library" | "projects";

export const WORKSPACE_SERVICE_LABEL_KEYS: Record<HomeCheffWorkspaceService, string> = {
  editor: "suite.nav.editor",
  motion: "suite.nav.motion",
  publish: "suite.nav.publish",
  studio: "suite.nav.studio",
  library: "suite.nav.library",
  projects: "suite.nav.projects",
};
