"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { useAuthSession } from "@/hooks/use-auth-session";

function navLinkClass(active: boolean): string {
  return `inline-flex min-h-11 shrink-0 items-center rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-colors sm:min-h-0 sm:px-3 sm:py-2 sm:text-xs lg:px-4 lg:text-sm ${
    active
      ? "border-[#006D52]/40 bg-[#006D52]/10 text-[#006D52]"
      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
  }`;
}

type NavItem = {
  href: string;
  labelKey: TranslationKey;
  match: (pathname: string) => boolean;
  authOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/create",
    labelKey: "nav.create",
    match: (pathname) => pathname === "/create" || pathname.startsWith("/create/"),
  },
  {
    href: "/studio",
    labelKey: "nav.studio",
    match: (pathname) => pathname === "/studio" || pathname.startsWith("/studio/"),
  },
  {
    href: "/animate/instant",
    labelKey: "nav.motion",
    match: (pathname) =>
      pathname === "/animate/instant" ||
      pathname.startsWith("/animate/instant/") ||
      pathname === "/animate" ||
      pathname.startsWith("/animate/"),
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

export function AppShellPrimaryNav() {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => !item.authOnly || (session.resolved && session.user));

  return (
    <div className="flex max-w-[min(100%,42rem)] shrink-0 items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-none sm:gap-2 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
      {visibleItems.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
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
