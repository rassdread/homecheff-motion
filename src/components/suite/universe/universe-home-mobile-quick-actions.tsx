"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";
import {
  resolveUniversePrimaryCtaHref,
  resolveUniversePrimaryCtaKey,
  resolveUniverseSecondaryCtaHref,
  resolveUniverseSecondaryCtaKey,
} from "@/lib/universe-public-landing";

import type { TranslationKey } from "@/i18n";

type Props = {
  isAuthenticated: boolean;
};

type QuickLink = {
  href: string;
  labelKey: TranslationKey;
  authOnly?: boolean;
};

const QUICK_LINKS: QuickLink[] = [
  { href: "/projects", labelKey: "suite.nav.projects", authOnly: true },
  { href: "/library", labelKey: "suite.nav.library" },
  { href: "/account/billing", labelKey: "account.nav.billing", authOnly: true },
  { href: "/help", labelKey: "help.home.label" },
];

export function UniverseHomeMobileQuickActions({ isAuthenticated }: Props) {
  const t = useActiveTranslator();

  return (
    <section
      className="border-t border-white/10 px-4 py-6 md:hidden"
      data-testid="home-mobile-quick-actions"
      aria-label={t("universe.mobile.quickActions" as never)}
    >
      <div className="flex flex-col gap-2">
        <Link
          href={resolveUniversePrimaryCtaHref(isAuthenticated)}
          prefetch={false}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-5 py-3 text-sm font-semibold text-white shadow-lg"
          onClick={() =>
            trackBillingConversionEvent("conversion_surface_impression", {
              source: "home_mobile_primary_cta",
            })
          }
        >
          {t(resolveUniversePrimaryCtaKey(isAuthenticated))}
        </Link>
        <Link
          href={resolveUniverseSecondaryCtaHref(isAuthenticated)}
          prefetch={false}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white"
        >
          {t(resolveUniverseSecondaryCtaKey(isAuthenticated))}
        </Link>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2">
        {QUICK_LINKS.map((item) => {
          if (item.authOnly && !isAuthenticated) {
            return null;
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch={false}
                className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-center text-xs font-medium text-white/90"
              >
                {t(item.labelKey as never)}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
