"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";

/**
 * Acquisition banner only — never import the composer here (Home bundle).
 */
export function StudioPx4aFreeCreatorBanner() {
  const t = useActiveTranslator();
  return (
    <aside
      className="rounded-2xl border border-[#006D52]/25 bg-gradient-to-br from-[#006D52]/08 to-white px-5 py-5"
      data-testid="px4a-free-creator-banner"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">{t("px4a.home.badge")}</p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-900">{t("px4a.home.title")}</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">{t("px4a.home.lead")}</p>
      <Link
        href="/studio/photo-video"
        prefetch={false}
        data-testid="px4a-free-creator-cta"
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#006D52] px-5 text-sm font-semibold text-white"
      >
        {t("px4a.home.cta")}
      </Link>
    </aside>
  );
}
