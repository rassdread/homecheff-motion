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
      href: "/maak",
      labelKey: "nav.create",
      match: (pathname) => pathname === "/maak" || pathname.startsWith("/maak/"),
    },
    {
      href: "/studio",
      labelKey: "nav.studio",
      match: (pathname) =>
        (pathname === "/studio" || pathname.startsWith("/studio/")) &&
        !pathname.startsWith("/studio/assets"),
      productId: "studio",
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
      href: "/videos",
      labelKey: "nav.myVideos",
      match: (pathname) => pathname === "/videos" || pathname.startsWith("/videos/"),
      authOnly: true,
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

/** Five-product suite navigation — opt-in via NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV */
export function buildSuitePrimaryNavItems(): PrimaryNavItem[] {
  const motionMatch = (pathname: string) =>
    isStudioProductionModeEnabled()
      ? pathname === "/animate/instant" || pathname.startsWith("/animate/instant/")
      : pathname === "/animate/instant" ||
        pathname.startsWith("/animate/instant/") ||
        pathname === "/animate" ||
        pathname.startsWith("/animate/");

  const libraryMatch = (pathname: string) =>
    isLibraryAliasPath(pathname) ||
    pathname === "/studio/assets" ||
    pathname.startsWith("/studio/assets/");

  const publishMatch = (pathname: string) =>
    pathname === "/publish" ||
    pathname.startsWith("/publish/") ||
    pathname === "/presentation" ||
    pathname.startsWith("/presentation/") ||
    pathname === "/videos" ||
    pathname.startsWith("/videos/");

  return [
    {
      href: "/maak",
      labelKey: "suite.nav.home",
      match: (pathname) => pathname === "/" || pathname === "/maak" || pathname.startsWith("/maak/"),
    },
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
      href: "/animate/instant",
      labelKey: "suite.nav.motion",
      match: motionMatch,
      productId: "motion",
    },
    {
      href: resolveProductHref("presentation"),
      labelKey: "suite.nav.publish",
      match: publishMatch,
      authOnly: true,
      productId: "presentation",
    },
    {
      href: resolveProductHref("assets"),
      labelKey: "suite.nav.library",
      match: libraryMatch,
      authOnly: true,
      productId: "assets",
    },
    {
      href: "/pricing",
      labelKey: "nav.pricing",
      match: (pathname) => pathname === "/pricing" || pathname.startsWith("/pricing/"),
    },
  ];
}

export function resolvePrimaryNavItems(suiteNavEnabled: boolean): PrimaryNavItem[] {
  return suiteNavEnabled ? buildSuitePrimaryNavItems() : buildLegacyPrimaryNavItems();
}
