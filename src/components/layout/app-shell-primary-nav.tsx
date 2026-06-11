"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { isHomeCheffProductSuiteNavEnabled } from "@/lib/homecheff-product-suite-flag";
import { resolvePrimaryNavItems, type PrimaryNavItem } from "@/lib/homecheff-primary-nav-config";
import { isStudioProductionModeEnabled } from "@/lib/studio-production-mode-flag";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { resolveSuiteNavHref } from "@/lib/universe-public-landing";

function navLinkClass(active: boolean): string {
  return active ? studioVisual.navActive : studioVisual.navInactive;
}

const MOBILE_PRIMARY_HREFS = new Set(["/maak", "/editor", "/studio"]);
const MOBILE_SECONDARY_HREFS = new Set([
  "/animate/instant",
  "/animate",
  "/publish",
  "/presentation",
  "/videos",
  "/studio/assets",
  "/library",
  "/mijn-verbruik",
  "/pricing",
]);

function splitMobileItems(items: PrimaryNavItem[]) {
  const primary: PrimaryNavItem[] = [];
  const secondary: PrimaryNavItem[] = [];
  for (const item of items) {
    const root = item.href.split("?")[0]!;
    if (
      MOBILE_PRIMARY_HREFS.has(root) ||
      item.productId === "editor" ||
      item.productId === "studio"
    ) {
      primary.push(item);
      continue;
    }
    if (
      MOBILE_SECONDARY_HREFS.has(root) ||
      item.productId === "motion" ||
      item.productId === "presentation" ||
      item.productId === "assets"
    ) {
      secondary.push(item);
    } else {
      secondary.push(item);
    }
  }
  return { primary, secondary };
}

type Props = {
  variant?: "desktop" | "mobile";
};

export function AppShellPrimaryNav({ variant = "desktop" }: Props) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const pathname = usePathname();
  const suiteNav = isHomeCheffProductSuiteNavEnabled();
  const isAuthenticated = Boolean(session.resolved && session.user);

  const navItems = resolvePrimaryNavItems(suiteNav);
  const visibleItems = navItems.filter((item) => {
    if (suiteNav && item.productId) {
      return true;
    }
    if (item.authOnly && !isAuthenticated) {
      return false;
    }
    if (
      isStudioProductionModeEnabled() &&
      (item.href === "/pricing" || item.href === "/about")
    ) {
      return false;
    }
    return true;
  });

  const renderLinks = (items: PrimaryNavItem[]) => (
    <>
      {items.map((item) => {
        const active = item.match(pathname);
        const href = resolveSuiteNavHref(item.href, isAuthenticated, item.productId);
        return (
          <Link
            key={`${item.href}-${item.labelKey}`}
            href={href}
            prefetch={false}
            className={navLinkClass(active)}
            aria-current={active ? "page" : undefined}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </>
  );

  if (variant === "mobile") {
    const { primary, secondary } = splitMobileItems(visibleItems);
    return (
      <div className="space-y-2" data-testid="app-shell-mobile-nav">
        <div className="flex flex-wrap items-center gap-1.5">{renderLinks(primary)}</div>
        <details className="rounded-xl border border-white/12 bg-white/5 p-2">
          <summary className="cursor-pointer px-2 py-1 text-xs font-semibold text-white/85">
            More
          </summary>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">{renderLinks(secondary)}</div>
        </details>
      </div>
    );
  }

  return (
    <div
      className="flex max-w-[min(100%,42rem)] shrink-0 items-center justify-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-none sm:gap-2 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden"
      data-testid="app-shell-desktop-nav"
    >
      {renderLinks(visibleItems)}
      {isAuthenticated ?
        <Link href="/mijn-verbruik" prefetch={false} className={navLinkClass(pathname === "/mijn-verbruik")}>
          {t("nav.usage")}
        </Link>
      : null}
    </div>
  );
}
