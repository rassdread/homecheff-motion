"use client";

import type { UniversePlanetConfig } from "@/lib/universe-home-config";
import { UniversePlanetIcon } from "@/components/suite/universe/universe-planet-icon";
import { useActiveTranslator } from "@/i18n/client";

type UniverseTunnelOverlayProps = {
  planet: UniversePlanetConfig;
  reducedMotion?: boolean;
};

export function UniverseTunnelOverlay({ planet, reducedMotion = false }: UniverseTunnelOverlayProps) {
  const t = useActiveTranslator();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#041428]"
      role="status"
      aria-live="polite"
      aria-label={t("universe.tunnel.entering", { product: t(planet.titleKey) })}
    >
      {!reducedMotion &&
        Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 h-24 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/40 to-transparent"
            style={{
              animation: `universe-tunnel-streak 0.75s ease-in ${i * 0.04}s forwards`,
              opacity: 0,
            }}
            aria-hidden
          />
        ))}
      <div
        className="relative flex flex-col items-center gap-4 text-white"
        style={{
          animation: reducedMotion ? undefined : "universe-tunnel-in 0.72s ease-out forwards",
        }}
      >
        <div
          className="flex h-28 w-28 items-center justify-center rounded-full border border-white/25 shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${planet.accent}ee, ${planet.accentSecondary ?? planet.accent}aa)`,
          }}
        >
          <UniversePlanetIcon id={planet.id} className="h-10 w-10" />
        </div>
        <p className="text-sm font-medium text-white/80">{t(planet.titleKey)}</p>
      </div>
    </div>
  );
}
