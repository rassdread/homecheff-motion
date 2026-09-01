import type { TranslationKey } from "@/i18n";
import { isStudioProductionModeEnabled } from "@/lib/studio-production-mode-flag";
import { resolveProductHref } from "@/lib/homecheff-product-suite";
import {
  isLibraryAliasPath,
} from "@/lib/homecheff-suite-route-aliases";
import type { HomeCheffProductId } from "@/types/homecheff-product-suite";

export type PrimaryNavItem = {
  href: string;
  labelKey: TranslationKey;
  match: (pathname: string) => boolean;
  authOnly?: boolean;
  productId?: HomeCheffProductId;
};

/** Legacy navigation — current production default */
export function buildLegacyPrimaryNavItems(): PrimaryNavItem[] {
  return [
    {
      href: "/studio",
      labelKey: "nav.studio",
      match: (pathname) =>
        (pathname === "/studio" || pathname.startsWith("/studio/")) &&
        !pathname.startsWith("/studio/assets"),
      productId: "studio",
    },
    {
      href: "/projects",
      labelKey: "suite.nav.projects",
      match: (pathname) => pathname === "/projects" || pathname.startsWith("/projects/"),
      authOnly: true,
    },
    {
      href: "/studio/assets",
      labelKey: "nav.library",
      match: (pathname) =>
        pathname === "/studio/assets" ||
        pathname.startsWith("/studio/assets/") ||
        isLibraryAliasPath(pathname),
      authOnly: true,
      productId: "assets",
    },
    {
      href: "/animate/instant",
      labelKey: "nav.motion",
      match: (pathname) =>
        isStudioProductionModeEnabled()
          ? pathname === "/animate/instant" || pathname.startsWith("/animate/instant/")
          : pathname === "/animate/instant" ||
            pathname.startsWith("/animate/instant/") ||
            pathname === "/animate" ||
            pathname.startsWith("/animate/"),
      productId: "motion",
    },
    {
      href: "/pricing",
      labelKey: "nav.pricing",
      match: (pathname) => pathname === "/pricing" || pathname.startsWith("/pricing/"),
    },
    {
      href: "/about",
      labelKey: "nav.about",
      match: (pathname) => pathname === "/about" || pathname.startsWith("/about/"),
    },
  ];
}

function libraryMatch(pathname: string): boolean {
  return (
    isLibraryAliasPath(pathname) ||
    pathname === "/studio/assets" ||
    pathname.startsWith("/studio/assets/")
  );
}

function motionMatch(pathname: string): boolean {
  return (
    pathname === "/motion" ||
    pathname.startsWith("/motion/") ||
    (isStudioProductionModeEnabled()
      ? pathname === "/animate/instant" || pathname.startsWith("/animate/instant/")
      : pathname === "/animate/instant" ||
        pathname.startsWith("/animate/instant/") ||
        pathname === "/animate" ||
        pathname.startsWith("/animate/"))
  );
}

function publishMatch(pathname: string): boolean {
  return (
    pathname === "/publish" ||
    pathname.startsWith("/publish/") ||
    pathname === "/presentation" ||
    pathname.startsWith("/presentation/") ||
    pathname === "/videos" ||
    pathname.startsWith("/videos/")
  );
}

/** Slice 1A global chrome — Studio front door, projects, account. */
export function buildSuiteGlobalNavItems(): PrimaryNavItem[] {
  return [
    {
      href: "/studio",
      labelKey: "suite.slice1a.nav.studio",
      match: (pathname) =>
        (pathname === "/studio" || pathname.startsWith("/studio/")) &&
        !pathname.startsWith("/studio/assets"),
      productId: "studio",
    },
    {
      href: "/projects",
      labelKey: "suite.slice1a.nav.projects",
      match: (pathname) => pathname === "/projects" || pathname.startsWith("/projects/"),
      authOnly: true,
    },
    {
      href: "/account",
      labelKey: "suite.slice1a.nav.account",
      match: (pathname) => pathname === "/account" || pathname.startsWith("/account/"),
    },
  ];
}

/** PX.3 expert access — same hrefs as PX.2, not shown as equal Home tabs. */
export function buildSuiteToolNavItems(): PrimaryNavItem[] {
  return [
    {
      href: resolveProductHref("editor"),
      labelKey: "suite.nav.editor",
      match: (pathname) => pathname === "/editor" || pathname.startsWith("/editor/"),
      productId: "editor",
    },
    {
      href: "/studio",
      labelKey: "suite.nav.studio",
      match: (pathname) =>
        (pathname === "/studio" || pathname.startsWith("/studio/")) &&
        !pathname.startsWith("/studio/assets"),
      productId: "studio",
    },
    {
      href: "/motion",
      labelKey: "suite.nav.motion",
      match: motionMatch,
      productId: "motion",
    },
    {
      href: resolveProductHref("presentation"),
      labelKey: "suite.nav.publish",
      match: publishMatch,
      productId: "presentation",
    },
    {
      href: "/pricing",
      labelKey: "nav.pricing",
      match: (pathname) => pathname === "/pricing" || pathname.startsWith("/pricing/"),
    },
  ];
}

/** @deprecated PX.3 chrome uses buildSuiteGlobalNavItems. Kept as alias for existing tests. */
export function buildSuitePrimaryNavItems(): PrimaryNavItem[] {
  return buildSuiteGlobalNavItems();
}

export function resolvePrimaryNavItems(suiteNavEnabled: boolean): PrimaryNavItem[] {
  return suiteNavEnabled ? buildSuiteGlobalNavItems() : buildLegacyPrimaryNavItems();
}
