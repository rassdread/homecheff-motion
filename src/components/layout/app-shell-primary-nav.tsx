"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { isHomeCheffProductSuiteNavEnabled } from "@/lib/homecheff-product-suite-flag";
import { resolvePrimaryNavItems } from "@/lib/homecheff-primary-nav-config";
import { isStudioProductionModeEnabled } from "@/lib/studio-production-mode-flag";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { resolveSuiteNavHref } from "@/lib/universe-public-landing";

function navLinkClass(active: boolean): string {
  return active ? studioVisual.navActive : studioVisual.navInactive;
}

export function AppShellPrimaryNav() {
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

  return (
    <div className="flex max-w-[min(100%,42rem)] shrink-0 items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-none sm:gap-2 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
      {visibleItems.map((item) => {
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
    </div>
  );
}
