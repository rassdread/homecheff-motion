"use client";

import type { CSSProperties } from "react";
import type { UniversePlanetConfig } from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";
import { UniversePlanetIcon } from "@/components/suite/universe/universe-planet-icon";

type UniversePlanetProps = {
  planet: UniversePlanetConfig;
  href: string;
  hovered: boolean;
  focused: boolean;
  reducedMotion?: boolean;
  onHover: (id: UniversePlanetConfig["id"] | null) => void;
  onFocus: (id: UniversePlanetConfig["id"] | null) => void;
  onSelect: (planet: UniversePlanetConfig) => void;
  style?: CSSProperties;
  variant?: "orbit" | "card";
};

export function UniversePlanet({
  planet,
  href,
  hovered,
  focused,
  reducedMotion = false,
  onHover,
  onFocus,
  onSelect,
  style,
  variant = "orbit",
}: UniversePlanetProps) {
  const t = useActiveTranslator();
  const active = hovered || focused;
  const accentBg = planet.accentSecondary
    ? `linear-gradient(135deg, ${planet.accent}cc, ${planet.accentSecondary}aa)`
    : `linear-gradient(135deg, ${planet.accent}dd, ${planet.accent}88)`;

  const sizeClass = variant === "orbit" ? "h-[72px] w-[72px] sm:h-[80px] sm:w-[80px]" : "h-16 w-16";

  return (
    <div className="group relative flex flex-col items-center" style={style}>
      {!reducedMotion &&
        planet.capabilityKeys.slice(0, 4).map((key, i) => (
          <span
            key={key}
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 rounded-full bg-white/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
            style={{
              width: 4,
              height: 4,
              animation: active ? `universe-star-orbit ${14 + i * 2}s linear infinite` : undefined,
              animationDelay: `${i * 0.6}s`,
              ["--star-radius" as string]: `${38 + i * 10}px`,
              transformOrigin: "center center",
            }}
            aria-hidden
          />
        ))}

      <button
        type="button"
        onClick={() => onSelect(planet)}
        onMouseEnter={() => onHover(planet.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onFocus(planet.id)}
        onBlur={() => onFocus(null)}
        className={`relative flex ${sizeClass} items-center justify-center rounded-full border border-white/25 text-white shadow-lg outline-none transition-transform duration-300 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#041428] ${
          active ? "scale-110" : "scale-100 hover:scale-105"
        }`}
        style={{
          background: accentBg,
          boxShadow: active
            ? `0 0 32px ${planet.accent}88, inset 0 1px 0 rgba(255,255,255,0.25)`
            : `0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)`,
          willChange: "transform",
        }}
        aria-label={`${t(planet.titleKey)} — ${t(planet.descriptionKey)}`}
      >
        <UniversePlanetIcon id={planet.id} className="h-6 w-6 sm:h-7 sm:w-7" />
        {active && (
          <span
            className="absolute inset-0 rounded-full border border-white/30"
            style={{ animation: reducedMotion ? undefined : "universe-glow-pulse 2.5s ease-in-out infinite" }}
            aria-hidden
          />
        )}
      </button>

      <div
        className={`pointer-events-none absolute z-20 w-52 rounded-2xl border border-white/15 bg-[#041428]/90 p-3 text-left shadow-2xl backdrop-blur-md transition-all duration-300 ${
          active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        } ${variant === "orbit" ? "top-[calc(100%+10px)]" : "top-[calc(100%+8px)] left-1/2 -translate-x-1/2"}`}
        role="tooltip"
        aria-hidden={!active}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
          {t(planet.themeKey)}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-white">{t(planet.titleKey)}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/70">{t(planet.descriptionKey)}</p>
        <p className="mt-2 text-[11px] font-medium text-emerald-200/90">{t(planet.actionKey)} →</p>
      </div>

      <span className="sr-only">{href}</span>
    </div>
  );
}
