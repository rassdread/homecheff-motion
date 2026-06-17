"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { isHomeCheffProductSuiteNavEnabled } from "@/lib/homecheff-product-suite-flag";
import { resolvePrimaryNavItems, type PrimaryNavItem } from "@/lib/homecheff-primary-nav-config";
import { isStudioProductionModeEnabled } from "@/lib/studio-production-mode-flag";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { resolveSuiteNavHref } from "@/lib/universe-public-landing";
import type { TranslationKey } from "@/i18n";

function navLinkClass(active: boolean): string {
  return `${active ? studioVisual.navActive : studioVisual.navInactive} studio-mobile-nav-link`;
}

const MOBILE_EXTRA_NAV: Array<{ href: string; labelKey: TranslationKey; authOnly?: boolean }> = [
  { href: "/account/billing", labelKey: "account.nav.billing", authOnly: true },
  { href: "/help", labelKey: "help.home.label" },
];

type Props = {
  variant?: "desktop" | "mobile";
};

type MobileNavProps = {
  pathname: string;
  visibleItems: PrimaryNavItem[];
  isAuthenticated: boolean;
  t: ReturnType<typeof useActiveTranslator>;
};

function AppShellMobilePrimaryNav({
  pathname,
  visibleItems,
  isAuthenticated,
  t,
}: MobileNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

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

  return (
    <>
      <button
        type="button"
        className={studioVisual.mobileMenuButton}
        aria-expanded={drawerOpen}
        aria-controls="app-shell-mobile-drawer"
        aria-label={t("nav.menu" as never)}
        onClick={() => setDrawerOpen((open) => !open)}
      >
        <span aria-hidden>☰</span>
        <span className="sr-only">{t("nav.menu" as never)}</span>
      </button>
      {drawerOpen ? (
        <>
          <button
            type="button"
            className="studio-mobile-nav-backdrop"
            aria-label={t("billing.conversion.dismiss" as never)}
            onClick={() => setDrawerOpen(false)}
          />
          <div id="app-shell-mobile-drawer" className={studioVisual.mobileNavDrawer} data-testid="app-shell-mobile-nav">
            <div className="flex flex-col gap-2">
              {renderLinks(visibleItems)}
              {MOBILE_EXTRA_NAV.map((item) => {
                if (item.authOnly && !isAuthenticated) {
                  return null;
                }
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    className={navLinkClass(active)}
                    onClick={() => setDrawerOpen(false)}
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

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
    return (
      <AppShellMobilePrimaryNav
        key={pathname}
        pathname={pathname}
        visibleItems={visibleItems}
        isAuthenticated={isAuthenticated}
        t={t}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center gap-1 sm:gap-1.5"
      data-testid="app-shell-desktop-nav"
    >
      {renderLinks(visibleItems)}
    </div>
  );
}
