"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import {
  resolveUniversePrimaryCtaHref,
  resolveUniversePrimaryCtaKey,
  resolveUniversePublicHeadlineKey,
  resolveUniversePublicSubheadlineKey,
  resolveUniverseSecondaryCtaHref,
  resolveUniverseSecondaryCtaKey,
} from "@/lib/universe-public-landing";
import { resolveUniverseWelcomeName } from "@/lib/universe-home-config";

type Props = {
  isAuthenticated: boolean;
  email?: string;
  reducedMotion?: boolean;
};

export function UniverseHeroCopy({ isAuthenticated, email, reducedMotion = false }: Props) {
  const t = useActiveTranslator();
  const welcomeName = resolveUniverseWelcomeName(email);

  const headline =
    isAuthenticated && welcomeName
      ? t("universe.welcome.back", { name: welcomeName })
      : t(resolveUniversePublicHeadlineKey(isAuthenticated));

  const subheadline = t(resolveUniversePublicSubheadlineKey(isAuthenticated));

  return (
    <header className="universe-hero-copy relative z-20 max-w-xl text-left">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45 sm:text-xs">
        {t("universe.public.suiteLabel")}
      </p>
      <h1
        className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-[1.75rem]"
        style={{
          animation: reducedMotion ? undefined : "universe-welcome-in 0.6s ease-out forwards",
        }}
      >
        {headline}
      </h1>
      <p className="mt-2 text-sm text-white/72 sm:text-base">{subheadline}</p>
      <div className="mt-4 flex flex-wrap items-center justify-start gap-2">
        <Link
          href={resolveUniversePrimaryCtaHref(isAuthenticated)}
          prefetch={false}
          className="inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-95"
        >
          {t(resolveUniversePrimaryCtaKey(isAuthenticated))}
        </Link>
        <Link
          href={resolveUniverseSecondaryCtaHref(isAuthenticated)}
          prefetch={false}
          className="inline-flex min-h-11 items-center rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15"
        >
          {t(resolveUniverseSecondaryCtaKey(isAuthenticated))}
        </Link>
      </div>
      {isAuthenticated && (
        <p className="mt-5 text-sm font-medium text-white/58">{t("universe.welcome.universe")}</p>
      )}
    </header>
  );
}
