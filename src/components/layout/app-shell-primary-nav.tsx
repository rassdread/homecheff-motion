"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";

function navLinkClass(active: boolean): string {
  return `shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:py-2 sm:text-sm ${
    active
      ? "border-[#006D52]/40 bg-[#006D52]/10 text-[#006D52]"
      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
  }`;
}

export function AppShellPrimaryNav() {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const pathname = usePathname();

  const motionActive =
    pathname === "/animate/instant" ||
    pathname.startsWith("/animate/instant/") ||
    pathname === "/animate" ||
    pathname.startsWith("/animate/");
  const studioActive = pathname === "/studio" || pathname.startsWith("/studio/");
  const videosActive = pathname === "/videos" || pathname.startsWith("/videos/");

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <Link
        href="/animate/instant"
        prefetch={false}
        className={navLinkClass(motionActive && !studioActive)}
        aria-current={motionActive && !studioActive ? "page" : undefined}
      >
        {t("nav.motion")}
      </Link>
      <Link
        href="/studio"
        prefetch={false}
        className={navLinkClass(studioActive)}
        aria-current={studioActive ? "page" : undefined}
      >
        {t("nav.studio")}
      </Link>
      {session.resolved && session.user ? (
        <Link
          href="/videos"
          prefetch={false}
          className={navLinkClass(videosActive)}
          aria-current={videosActive ? "page" : undefined}
        >
          {t("nav.myVideos")}
        </Link>
      ) : null}
    </div>
  );
}
