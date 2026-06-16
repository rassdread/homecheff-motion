/** Shared Growth Sidebar layout tokens — used by layout component and tests. */

export const GROWTH_SIDEBAR_HEADER_VAR = "var(--studio-header-height)";

export const growthSidebarLayoutClasses = {
  container:
    "flex w-full min-w-0 flex-col items-start overflow-visible lg:flex-row lg:items-start",
  main: "min-w-0 w-full overflow-visible",
  pageRoot: "relative w-full min-w-0 overflow-visible",
  pageFloor: "min-h-[calc(100dvh-var(--studio-header-height))]",
  pageFloorFlex:
    "flex w-full min-w-0 flex-col overflow-visible min-h-[calc(100dvh-var(--studio-header-height))]",
  sidebarColumn:
    "hidden shrink-0 self-start lg:sticky lg:block lg:overflow-y-auto lg:overflow-x-hidden lg:border-l lg:border-zinc-200 lg:bg-white lg:shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.08)] w-[clamp(320px,22vw,420px)] top-[var(--studio-header-height)] max-h-[calc(100dvh-var(--studio-header-height))]",
  mobileFab: "lg:hidden",
  desktopSidebar: "hidden lg:block",
} as const;

export function isGrowthSidebarDesktopColumnVisible(className: string): boolean {
  return className.includes("lg:block") && className.includes("lg:sticky");
}

export function isGrowthSidebarMainScrollSafe(className: string): boolean {
  return className.includes("overflow-visible") && !className.includes("overflow-hidden");
}

export function growthSidebarColumnHasOwnScroll(className: string): boolean {
  return className.includes("overflow-y-auto");
}
