"use client";

import Link from "next/link";
import { getActiveTranslator } from "@/i18n";
import { useAuthSession } from "@/hooks/use-auth-session";

export function AppShellPrimaryNav() {
  const t = getActiveTranslator();
  const session = useAuthSession();

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <Link
        href="/animate"
        className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-emerald-50 sm:px-4 sm:py-2 sm:text-sm"
      >
        {t("nav.create")}
      </Link>
      {session.resolved && session.user ? (
        <Link
          href="/videos"
          className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 sm:px-4 sm:py-2 sm:text-sm"
        >
          {t("nav.myVideos")}
        </Link>
      ) : null}
    </div>
  );
}
