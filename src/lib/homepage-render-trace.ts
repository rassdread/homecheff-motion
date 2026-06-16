/**
 * Homepage "/" render trace — documents the canonical shell and legacy bypasses.
 * Used by tests; keep in sync with src/app/page.tsx and AppShell.
 */

import { isHomeCheffAssistantEnabled, isHomeCheffAssistantRoute } from "@/lib/homecheff-assistant-flag";

export const CANONICAL_HOMEPAGE_COMPONENT = "universe-home-page" as const;

export const HOMEPAGE_ROUTE_FILE = "src/app/page.tsx" as const;

export const HOMEPAGE_SHELL_CHAIN = [
  "src/app/layout.tsx → AppShell",
  "src/components/layout/app-shell.tsx → HomeCheffAssistantMount",
  "src/components/assistant/homecheff-assistant-mount.tsx → HomeCheffAssistantProvider + GrowthSidebarLayout",
  "src/components/growth/growth-sidebar-layout.tsx → main + GrowthSidebar",
  `src/components/suite/universe/universe-home-page.tsx → ${CANONICAL_HOMEPAGE_COMPONENT}`,
] as const;

export type HomepageAuthMode = "logged-in" | "logged-out" | "unknown";

export type HomepageRenderFlags = {
  suiteNavEnabled: boolean;
  assistantEnabled: boolean;
  assistantRoute: boolean;
};

export type HomepageRenderResolution = {
  routeFile: typeof HOMEPAGE_ROUTE_FILE;
  pageComponent: typeof CANONICAL_HOMEPAGE_COMPONENT;
  homepageImport: "UniverseHomePage";
  usesAppShell: true;
  usesGrowthSidebarLayout: boolean;
  usesAssistantProvider: boolean;
  legacyHomeEcosystemBypass: false;
  legacyStudioRedirect: false;
};

/** Resolves which shell wraps "/" for the given feature flags. Auth does not change the page component. */
export function resolveHomepageRender(
  flags: HomepageRenderFlags
): HomepageRenderResolution {
  const assistantOn =
    flags.assistantEnabled && flags.assistantRoute && isHomeCheffAssistantRoute("/");

  return {
    routeFile: HOMEPAGE_ROUTE_FILE,
    pageComponent: CANONICAL_HOMEPAGE_COMPONENT,
    homepageImport: "UniverseHomePage",
    usesAppShell: true,
    usesGrowthSidebarLayout: assistantOn,
    usesAssistantProvider: assistantOn,
    legacyHomeEcosystemBypass: false,
    legacyStudioRedirect: false,
  };
}

export function resolveHomepageAuthMode(input: {
  resolved: boolean;
  hasUser: boolean;
}): HomepageAuthMode {
  if (!input.resolved) {
    return "unknown";
  }
  return input.hasUser ? "logged-in" : "logged-out";
}

export function isAssistantShellActive(pathname: string = "/"): boolean {
  return isHomeCheffAssistantEnabled() && isHomeCheffAssistantRoute(pathname);
}

/** Matrix for documentation and tests — auth never swaps the homepage component. */
export const HOMEPAGE_RENDER_MATRIX: Array<{
  label: string;
  flags: HomepageRenderFlags;
  auth: HomepageAuthMode;
  resolution: HomepageRenderResolution;
}> = [
  {
    label: "logged-out, assistant on, suite on (canonical)",
    flags: { suiteNavEnabled: true, assistantEnabled: true, assistantRoute: true },
    auth: "logged-out",
    resolution: resolveHomepageRender({
      suiteNavEnabled: true,
      assistantEnabled: true,
      assistantRoute: true,
    }),
  },
  {
    label: "logged-in, assistant on",
    flags: { suiteNavEnabled: true, assistantEnabled: true, assistantRoute: true },
    auth: "logged-in",
    resolution: resolveHomepageRender({
      suiteNavEnabled: true,
      assistantEnabled: true,
      assistantRoute: true,
    }),
  },
  {
    label: "logged-out, assistant disabled — same page, no sidebar shell",
    flags: { suiteNavEnabled: true, assistantEnabled: false, assistantRoute: true },
    auth: "logged-out",
    resolution: resolveHomepageRender({
      suiteNavEnabled: true,
      assistantEnabled: false,
      assistantRoute: true,
    }),
  },
  {
    label: "logged-in, assistant disabled",
    flags: { suiteNavEnabled: true, assistantEnabled: false, assistantRoute: true },
    auth: "logged-in",
    resolution: resolveHomepageRender({
      suiteNavEnabled: true,
      assistantEnabled: false,
      assistantRoute: true,
    }),
  },
];
