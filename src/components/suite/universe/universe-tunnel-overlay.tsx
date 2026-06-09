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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={t("universe.tunnel.entering", { product: t(planet.titleKey) })}
      style={{
        background: `radial-gradient(circle at 50% 50%, ${planet.accent}33 0%, #041428 55%)`,
      }}
    >
      {!reducedMotion && (
        <>
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={`streak-${i}`}
              className="absolute bg-gradient-to-b from-transparent via-white/50 to-transparent"
              style={{
                left: `${46 + (i % 7) * 1.2}%`,
                width: i % 3 === 0 ? 2 : 1,
                height: "30%",
                animation: `universe-tunnel-streak 0.82s ease-in ${i * 0.025}s forwards`,
                opacity: 0,
              }}
              aria-hidden
            />
          ))}
          {[0, 1, 2].map((i) => (
            <span
              key={`warp-${i}`}
              className="absolute rounded-full border border-white/20"
              style={{
                width: 120 + i * 80,
                height: 120 + i * 80,
                animation: `universe-tunnel-v2-warp 0.85s ease-out ${i * 0.08}s forwards`,
              }}
              aria-hidden
            />
          ))}
        </>
      )}

      <div
        className="relative flex flex-col items-center gap-5 text-white"
        style={{
          animation: reducedMotion ? undefined : "universe-tunnel-v2-zoom 0.82s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        }}
      >
        <div
          className="universe-glass flex h-36 w-36 items-center justify-center rounded-full"
          style={{
            background: `linear-gradient(145deg, ${planet.accent}ee, ${planet.accentSecondary ?? planet.accent}99)`,
            boxShadow: `0 0 80px ${planet.accent}88`,
          }}
        >
          <UniversePlanetIcon id={planet.id} className="h-14 w-14" />
        </div>
        <p className="text-base font-semibold tracking-wide text-white/90">{t(planet.titleKey)}</p>
      </div>
    </div>
  );
}
