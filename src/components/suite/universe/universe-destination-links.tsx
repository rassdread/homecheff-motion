"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { UNIVERSE_PLANETS, type UniversePlanetId } from "@/lib/universe-home-config";
import { resolveUniversePlanetHrefs } from "@/lib/universe-public-landing";

type Props = {
  isAuthenticated: boolean;
};

/**
 * Calm destination list replacing the decorative orbit/planet metaphor.
 * Preserves every former planet destination without visual navigation gimmicks.
 */
export function UniverseDestinationLinks({ isAuthenticated }: Props) {
  const t = useActiveTranslator();
  const hrefs = resolveUniversePlanetHrefs(isAuthenticated);

  return (
    <nav
      className="w-full max-w-md"
      aria-label={t("universe.destinations.label" as never)}
    >
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#5eb8e8]">
        {t("universe.destinations.label" as never)}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2" data-testid="universe-destination-links">
        {UNIVERSE_PLANETS.map((planet) => {
          const href = hrefs[planet.id as UniversePlanetId];
          return (
            <li key={planet.id}>
              <Link
                href={href}
                prefetch={false}
                data-testid={`universe-destination-${planet.id}`}
                className="flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/8 px-3 py-2.5 text-sm font-semibold text-white/95 transition hover:border-white/30 hover:bg-white/12"
              >
                {t(planet.titleKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
