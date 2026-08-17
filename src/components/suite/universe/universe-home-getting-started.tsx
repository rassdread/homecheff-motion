"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { resolveUniverseStartProjectHref } from "@/lib/universe-public-landing";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  isAuthenticated: boolean;
};

export function UniverseHomeGettingStarted({ isAuthenticated }: Props) {
  const t = useActiveTranslator();

  return (
    <section className="home-row" data-testid="universe-home-getting-started">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">
        {t("universe.home.gettingStarted.title" as never)}
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-white/65">
        {t("universe.home.gettingStarted.lead" as never)}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={resolveUniverseStartProjectHref(isAuthenticated)} className={studioVisual.btnGradientPrimary}>
          {t("universe.home.gettingStarted.startProject" as never)}
        </Link>
        {isAuthenticated ? (
          <Link href="/studio" className={studioVisual.btnOutline}>
            {t("px3.cta.continue")}
          </Link>
        ) : (
          <Link href="/editor" className={studioVisual.btnOutline}>
            {t("universe.home.gettingStarted.openEditor" as never)}
          </Link>
        )}
        <Link href="/library" className={studioVisual.btnOutline}>
          {t("universe.home.gettingStarted.openLibrary" as never)}
        </Link>
      </div>
    </section>
  );
}
