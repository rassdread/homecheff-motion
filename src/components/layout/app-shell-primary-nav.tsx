"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { isHomeCheffProductSuiteNavEnabled } from "@/lib/homecheff-product-suite-flag";
import {
  buildSuiteToolNavItems,
  resolvePrimaryNavItems,
  type PrimaryNavItem,
} from "@/lib/homecheff-primary-nav-config";
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

function isNavItemVisible(
  item: PrimaryNavItem,
  suiteNav: boolean,
  isAuthenticated: boolean
): boolean {
  if (suiteNav && item.productId) {
    return true;
  }
  if (item.authOnly && !isAuthenticated) {
    return false;
  }
  if (isStudioProductionModeEnabled() && (item.href === "/pricing" || item.href === "/about")) {
    return false;
  }
  return true;
}

function NavLinks({
  items,
  pathname,
  isAuthenticated,
  t,
  onNavigate,
}: {
  items: PrimaryNavItem[];
  pathname: string;
  isAuthenticated: boolean;
  t: ReturnType<typeof useActiveTranslator>;
  onNavigate?: () => void;
}) {
  return (
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
            onClick={onNavigate}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </>
  );
}

function ToolsOverflow({
  items,
  pathname,
  isAuthenticated,
  t,
  variant,
  onNavigate,
}: {
  items: PrimaryNavItem[];
  pathname: string;
  isAuthenticated: boolean;
  t: ReturnType<typeof useActiveTranslator>;
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const toolActive = items.some((item) => item.match(pathname));

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (variant === "mobile") {
    return (
      <div data-testid="px3-nav-tools">
        <p className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-white/45">
          {t("px3.nav.more")}
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <NavLinks
            items={items}
            pathname={pathname}
            isAuthenticated={isAuthenticated}
            t={t}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative" data-testid="px3-nav-tools">
      <button
        type="button"
        className={navLinkClass(toolActive)}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        {t("px3.nav.more")}
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label={t("billing.conversion.dismiss" as never)}
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className={`absolute left-0 top-full z-50 mt-2 min-w-[12rem] ${studioVisual.userDropdown}`}
          >
            {items.map((item) => {
              const active = item.match(pathname);
              const href = resolveSuiteNavHref(item.href, isAuthenticated, item.productId);
              return (
                <Link
                  key={`${item.href}-${item.labelKey}`}
                  href={href}
                  prefetch={false}
                  role="menuitem"
                  className={`${studioVisual.userDropdownItem} min-h-[44px] ${active ? "bg-white/10 font-semibold" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

type MobileNavProps = {
  pathname: string;
  visibleItems: PrimaryNavItem[];
  toolItems: PrimaryNavItem[];
  isAuthenticated: boolean;
  suiteNav: boolean;
  t: ReturnType<typeof useActiveTranslator>;
};

function AppShellMobilePrimaryNav({
  pathname,
  visibleItems,
  toolItems,
  isAuthenticated,
  suiteNav,
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
              <NavLinks
                items={visibleItems}
                pathname={pathname}
                isAuthenticated={isAuthenticated}
                t={t}
                onNavigate={() => setDrawerOpen(false)}
              />
              {suiteNav && toolItems.length > 0 ? (
                <ToolsOverflow
                  items={toolItems}
                  pathname={pathname}
                  isAuthenticated={isAuthenticated}
                  t={t}
                  variant="mobile"
                  onNavigate={() => setDrawerOpen(false)}
                />
              ) : null}
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
  const visibleItems = navItems.filter((item) => isNavItemVisible(item, suiteNav, isAuthenticated));
  const toolItems = suiteNav
    ? buildSuiteToolNavItems().filter((item) => isNavItemVisible(item, suiteNav, isAuthenticated))
    : [];

  if (variant === "mobile") {
    return (
      <AppShellMobilePrimaryNav
        key={pathname}
        pathname={pathname}
        visibleItems={visibleItems}
        toolItems={toolItems}
        isAuthenticated={isAuthenticated}
        suiteNav={suiteNav}
        t={t}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center gap-1 sm:gap-1.5"
      data-testid="app-shell-desktop-nav"
    >
      <NavLinks items={visibleItems} pathname={pathname} isAuthenticated={isAuthenticated} t={t} />
      {toolItems.length > 0 ? (
        <ToolsOverflow
          items={toolItems}
          pathname={pathname}
          isAuthenticated={isAuthenticated}
          t={t}
          variant="desktop"
        />
      ) : null}
    </div>
  );
}
