"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioProductLandingModuleKey } from "@/lib/studio-product-landing-config";

const SERVICE_HREFS: Record<Exclude<StudioProductLandingModuleKey, "usage">, string> = {
  editor: "/editor",
  studio: "/studio",
  motion: "/motion",
  publish: "/publish",
  library: "/library",
};

type Props = {
  current: StudioProductLandingModuleKey;
};

export function ServiceLandingNav({ current }: Props) {
  const t = useActiveTranslator();
  const links = (Object.keys(SERVICE_HREFS) as Array<keyof typeof SERVICE_HREFS>).filter(
    (key) => key !== current
  );

  return (
    <nav
      className="mb-6 flex flex-wrap gap-2"
      aria-label={t("landing.nav.services" as never)}
      data-testid="service-landing-nav"
    >
      <Link href="/" className={`rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-green-300 hover:bg-white/10 hover:text-green-200`}>
        {t("landing.nav.backHome" as never)}
      </Link>
      {links.map((key) => (
        <Link
          key={key}
          href={SERVICE_HREFS[key]}
          className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
        >
          {t(`landing.nav.backTo.${key}` as never)}
        </Link>
      ))}
    </nav>
  );
}
