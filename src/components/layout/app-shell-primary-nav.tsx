"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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

type Props = {
  variant?: "desktop" | "mobile";
};

export function AppShellPrimaryNav({ variant = "desktop" }: Props) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
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
            onClick={() => setDrawerOpen(false)}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </>
  );

  if (variant === "mobile") {
    return (
      <>
        <button
          type="button"
          className={studioVisual.mobileMenuButton}
          aria-expanded={drawerOpen}
          aria-controls="app-shell-mobile-drawer"
          onClick={() => setDrawerOpen((open) => !open)}
        >
          ☰ {t("nav.menu" as never)}
        </button>
        {drawerOpen ?
          <div id="app-shell-mobile-drawer" className={studioVisual.mobileNavDrawer} data-testid="app-shell-mobile-nav">
            <div className="flex flex-col gap-2">{renderLinks(visibleItems)}</div>
          </div>
        : null}
      </>
    );
  }

  return (
    <div
      className="flex items-center justify-center gap-1.5 sm:gap-2"
      data-testid="app-shell-desktop-nav"
    >
      {renderLinks(visibleItems)}
    </div>
  );
}
