"use client";

import type { UniversePlanetConfig } from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";

type UniversePlanetPreviewProps = {
  planet: UniversePlanetConfig;
  active: boolean;
  onOpen: () => void;
  placement?: "below" | "side";
};

export function UniversePlanetPreview({
  planet,
  active,
  onOpen,
  placement = "below",
}: UniversePlanetPreviewProps) {
  const t = useActiveTranslator();

  const positionClass =
    placement === "side"
      ? "left-[calc(100%+16px)] top-1/2 -translate-y-1/2"
      : "left-1/2 top-[calc(100%+14px)] -translate-x-1/2";

  return (
    <div
      className={`pointer-events-none absolute z-30 w-[min(18rem,72vw)] transition-all duration-500 ${positionClass} ${
        active ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
      }`}
      role="dialog"
      aria-hidden={!active}
    >
      <div className="universe-glass overflow-hidden rounded-2xl p-4">
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-60"
          style={{
            background: `linear-gradient(135deg, ${planet.accent}44, transparent 50%, ${planet.accentSecondary ?? planet.accent}33)`,
          }}
          aria-hidden
        />

        <p className="relative text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
          {t(planet.themeKey)}
        </p>
        <p className="relative mt-1 text-lg font-bold text-white">{t(planet.titleKey)}</p>
        <p className="relative mt-1.5 text-xs leading-relaxed text-white/72">
          {t(planet.descriptionKey)}
        </p>

        <dl className="relative mt-3 grid grid-cols-3 gap-2">
          {planet.metricsKeys.map((metricKey) => (
            <div key={metricKey} className="rounded-lg bg-white/6 px-2 py-1.5 text-center">
              <dt className="text-[9px] uppercase tracking-wide text-white/45">{t(metricKey)}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-white/90">—</dd>
            </div>
          ))}
        </dl>

        <div className="relative mt-3 flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-10 flex-1 rounded-lg border border-white/10"
              style={{
                background: `linear-gradient(135deg, ${planet.accent}${i === 0 ? "55" : "33"}, transparent)`,
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onOpen}
          tabIndex={active ? 0 : -1}
          className={`relative mt-4 w-full rounded-full py-2.5 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
            active ? "pointer-events-auto" : "pointer-events-none"
          }`}
          style={{
            background: `linear-gradient(135deg, ${planet.accent}, ${planet.accentSecondary ?? planet.accent})`,
          }}
        >
          {t(planet.actionKey)}
        </button>
      </div>
    </div>
  );
}
