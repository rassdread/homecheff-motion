/** Scroll-safe layout audit helpers for Growth Sidebar + main routes. */

import { growthSidebarLayoutClasses } from "@/lib/growth-sidebar-layout";

export const SCROLL_SAFE_MAIN_MARKERS = ["overflow-visible", "min-w-0"] as const;

export const SCROLL_TRAP_MARKERS = [
  "overflow-hidden",
  "h-screen",
  "min-h-screen",
  "fixed inset-0",
] as const;

export function isMainContentScrollSafe(className: string): boolean {
  return (
    className.includes("overflow-visible") &&
    !className.includes("overflow-hidden") &&
    !className.includes("h-screen") &&
    !className.includes("overflow-y-auto")
  );
}

export function sidebarHasOwnScroll(className: string): boolean {
  return className.includes("overflow-y-auto") && className.includes("sticky");
}

export function layoutContainerIsScrollSafe(className: string): boolean {
  return (
    className.includes("overflow-visible") &&
    !className.includes("overflow-hidden") &&
    !className.includes("h-screen") &&
    !className.includes("flex-1")
  );
}

export function pageRootIsScrollSafe(className: string): boolean {
  return className.includes("overflow-visible") && !className.includes("overflow-hidden");
}

export const SCROLL_AUDIT_FILES: Array<{
  path: string;
  forbidden: string[];
  requiredSafe?: string[];
}> = [
  {
    path: "src/components/growth/growth-sidebar-layout.tsx",
    forbidden: ["overflow-hidden"],
    requiredSafe: ["growthSidebarLayoutClasses.main"],
  },
  {
    path: "src/components/suite/studio-product-landing-page.tsx",
    forbidden: ["overflow-hidden", "flex-1"],
    requiredSafe: ["studioVisual.pageRoot"],
  },
  {
    path: "src/components/suite/universe/universe-home-page.tsx",
    forbidden: ["overflow-y-auto", "overflow-hidden"],
    requiredSafe: ["growthSidebarLayoutClasses.pageRoot"],
  },
  {
    path: "src/components/instant/instant-wizard-shell.tsx",
    forbidden: ["overflow-hidden"],
  },
  {
    path: "src/components/instant/instant-wizard-content.tsx",
    forbidden: ["overflow-y-auto", "overflow-hidden"],
  },
  {
    path: "src/components/projects/homecheff-project-hub.tsx",
    forbidden: ["overflow-hidden", "min-h-screen"],
    requiredSafe: ["studioVisual.pageRoot"],
  },
  {
    path: "src/components/publish/publish-product-page.tsx",
    forbidden: ["overflow-hidden", "min-h-screen"],
    requiredSafe: ["studioVisual.pageRoot"],
  },
  {
    path: "src/components/studio/studio-assets-hub.tsx",
    forbidden: ["overflow-hidden", "h-screen", "min-h-screen", "overflow-y-auto"],
    requiredSafe: ["studioLibraryVisual.pageMain"],
  },
  {
    path: "src/components/studio/studio-library-consistency-browse.tsx",
    forbidden: ["overflow-hidden", "h-screen", "min-h-screen", "overflow-y-auto"],
    requiredSafe: ["studioLibraryVisual.pageMain"],
  },
  {
    path: "src/components/studio/studio-assets-hub-section.tsx",
    forbidden: ["overflow-hidden", "h-screen", "min-h-screen", "overflow-y-auto"],
    requiredSafe: ["studioLibraryVisual.pageMain"],
  },
  {
    path: "src/components/layout/app-shell.tsx",
    forbidden: ["overflow-hidden", "min-h-0"],
    requiredSafe: ["overflow-visible"],
  },
  {
    path: "src/app/layout.tsx",
    forbidden: ["overflow-hidden", "h-screen", "h-full"],
    requiredSafe: ["overflow-y-visible", "min-h-full"],
  },
];

/** Assistant-enabled routes → primary page component files for scroll smoke audit. */
export const ASSISTANT_ROUTE_SCROLL_AUDIT: Array<{ route: string; files: string[] }> = [
  { route: "/", files: ["src/components/suite/universe/universe-home-page.tsx"] },
  { route: "/studio", files: ["src/components/suite/studio-product-landing-page.tsx"] },
  { route: "/editor", files: ["src/components/editor/editor-start-screen.tsx"] },
  { route: "/animate/instant", files: ["src/components/instant/instant-wizard-shell.tsx"] },
  { route: "/motion", files: ["src/components/suite/studio-product-landing-page.tsx"] },
  { route: "/publish", files: ["src/components/publish/publish-product-page.tsx"] },
  { route: "/projects", files: ["src/components/projects/homecheff-project-hub.tsx"] },
  { route: "/library", files: ["src/components/suite/studio-product-landing-page.tsx"] },
  { route: "/studio/assets", files: ["src/components/studio/studio-assets-hub.tsx"] },
  {
    route: "/studio/assets/browse",
    files: ["src/components/studio/studio-library-consistency-browse.tsx"],
  },
  {
    route: "/usage",
    files: ["src/components/suite/studio-product-landing-page.tsx"],
  },
  {
    route: "/mijn-verbruik",
    files: ["src/components/suite/studio-product-landing-page.tsx"],
  },
  {
    route: "/account/usage",
    files: ["src/components/suite/studio-product-landing-page.tsx"],
  },
];

export function assertRouteFileScrollSafe(source: string, filePath: string): void {
  if (/\bh-screen\b/.test(source) || /\bmin-h-screen\b/.test(source)) {
    throw new Error(`${filePath} must not use viewport-height page shell (h-screen / min-h-screen)`);
  }
  const mainRoots = source.match(/<main[^>]*className=\{?`([^`]+)`/g) ?? [];
  for (const match of mainRoots) {
    if (match.includes("overflow-hidden")) {
      throw new Error(`${filePath} main root must not use overflow-hidden`);
    }
  }
}

export const GROWTH_SIDEBAR_SCROLL_CONTRACT = {
  container: growthSidebarLayoutClasses.container,
  main: growthSidebarLayoutClasses.main,
  sidebarColumn: growthSidebarLayoutClasses.sidebarColumn,
  pageRoot: growthSidebarLayoutClasses.pageRoot,
} as const;
