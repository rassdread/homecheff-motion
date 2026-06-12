"use client";

import type { CSSProperties } from "react";
import type { UniversePlanetConfig } from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";
import { UniversePlanetIcon } from "@/components/suite/universe/universe-planet-icon";
import { UniversePlanetIdentityRing } from "@/components/suite/universe/universe-planet-identity-ring";
import { UniversePlanetSatellites } from "@/components/suite/universe/universe-planet-satellites";
import { UniversePlanetWorld } from "@/components/suite/universe/universe-planet-world";
import {
  UNIVERSE_PLANET_CLUSTER_CLASS,
  UNIVERSE_PLANET_HOVER_SCALE,
  UNIVERSE_PLANET_HOVER_TRANSITION_MS,
  UNIVERSE_PLANET_ICON_CLASS,
  UNIVERSE_PLANET_NAME_LABEL_CLASS,
  UNIVERSE_PLANET_ORBIT_CLUSTER_SIZE_PX,
  UNIVERSE_PLANET_ORBIT_CLUSTER_SIZE_COMPACT_PX,
  UNIVERSE_Z_PLANET,
  UNIVERSE_Z_PLANET_ACTIVE,
} from "@/lib/universe-planet-ux";

type UniversePlanetProps = {
  planet: UniversePlanetConfig;
  href: string;
  hovered: boolean;
  focused: boolean;
  reducedMotion?: boolean;
  onHoverStart: (id: UniversePlanetConfig["id"]) => void;
  onHoverEnd: () => void;
  onFocus: (id: UniversePlanetConfig["id"] | null) => void;
  onSelect: (planet: UniversePlanetConfig) => void;
  style?: CSSProperties;
  variant?: "orbit" | "card";
  /** hero = homepage; compact = service landing */
  orbitSize?: "hero" | "compact";
  orbitDebug?: boolean;
};

function resolveOrbitLabelOffset(angleDeg: number, compact: boolean): { x: number; y: number } {
  if (!compact) return { x: 0, y: 8 };
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const dist = 14;
  return { x: Math.cos(rad) * dist, y: Math.sin(rad) * dist + 6 };
}

export function UniversePlanet({
  planet,
  href,
  hovered,
  focused,
  reducedMotion = false,
  onHoverStart,
  onHoverEnd,
  onFocus,
  onSelect,
  style,
  variant = "orbit",
  orbitSize = "hero",
  orbitDebug = false,
}: UniversePlanetProps) {
  const t = useActiveTranslator();
  const active = hovered || focused;
  const productName = t(planet.titleKey);
  const compactOrbit = variant === "orbit" && orbitSize === "compact";
  const labelOffset = resolveOrbitLabelOffset(planet.orbitAngle, compactOrbit);

  const sizeClass =
    variant === "orbit"
      ? compactOrbit
        ? "h-[88px] w-[88px] sm:h-[96px] sm:w-[96px]"
        : "h-[100px] w-[100px] sm:h-[110px] sm:w-[110px]"
      : "h-[88px] w-[88px]";

  const sphereBg = planet.accentSecondary
    ? `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.35) 0%, transparent 40%),
       radial-gradient(circle at 65% 75%, ${planet.accentSecondary}aa 0%, ${planet.accent}cc 45%, #041428 85%)`
    : `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.35) 0%, transparent 40%),
       radial-gradient(circle at 65% 75%, ${planet.accent}cc 0%, #041428 85%)`;

  const hoverScale = active ? UNIVERSE_PLANET_HOVER_SCALE : 1;
  const transitionMs = UNIVERSE_PLANET_HOVER_TRANSITION_MS;

  return (
    <div
      className={`${UNIVERSE_PLANET_CLUSTER_CLASS} group relative flex flex-col items-center justify-center overflow-visible ${
        variant === "orbit" ? "universe-planet-orbit-cluster universe-planet-3d-scene" : ""
      }`}
      style={{
        ...style,
        ...(variant === "orbit"
          ? (() => {
              const clusterPx = compactOrbit
                ? UNIVERSE_PLANET_ORBIT_CLUSTER_SIZE_COMPACT_PX
                : UNIVERSE_PLANET_ORBIT_CLUSTER_SIZE_PX;
              return {
                width: clusterPx,
                height: clusterPx,
                minWidth: clusterPx,
                minHeight: clusterPx,
              };
            })()
          : undefined),
        transform: `scale(${hoverScale})`,
        transformOrigin: "center center",
        transition: `transform ${transitionMs}ms cubic-bezier(0.34, 1.25, 0.64, 1)`,
        willChange: "transform",
      }}
      onMouseEnter={() => onHoverStart(planet.id)}
      onMouseLeave={onHoverEnd}
      onFocus={(event) => {
        if (event.currentTarget.contains(event.target as Node)) {
          onFocus(planet.id);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          onFocus(null);
        }
      }}
    >
      {variant === "orbit" && (
        <UniversePlanetIdentityRing
          planetId={planet.id}
          active={active}
          reducedMotion={reducedMotion}
          variant="orbit"
          layer="back"
        />
      )}

      <button
        type="button"
        onClick={() => onSelect(planet)}
        className={`universe-planet-sphere relative cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#041428] ${sizeClass} ${
          compactOrbit ? "min-h-[88px] min-w-[88px] sm:min-h-[96px] sm:min-w-[96px]" : ""
        }`}
        style={{
          zIndex: active ? UNIVERSE_Z_PLANET_ACTIVE : UNIVERSE_Z_PLANET,
          transform: active ? "translateZ(12px)" : undefined,
          transition: `box-shadow ${transitionMs}ms ease`,
          boxShadow: active
            ? `0 0 64px ${planet.accent}bb, inset 0 2px 0 rgba(255,255,255,0.3)`
            : `0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)`,
        }}
        aria-label={`${productName} — ${t(planet.descriptionKey)}`}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-full border border-white/25"
          style={{ background: sphereBg }}
        >
          <UniversePlanetWorld
            id={planet.id}
            active={active}
            reducedMotion={reducedMotion}
            accent={planet.accent}
          />
          <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center pb-1">
            <UniversePlanetIcon
              id={planet.id}
              className={`universe-planet-hero-icon ${UNIVERSE_PLANET_ICON_CLASS} ${active ? "universe-planet-hero-icon-active" : ""}`}
            />
          </div>
        </div>
        {active && (
          <span
            className="absolute -inset-1 rounded-full border border-white/25"
            style={{
              animation: reducedMotion ? undefined : "universe-glow-pulse 2.2s ease-in-out infinite",
            }}
            aria-hidden
          />
        )}
      </button>

      <p
        className={`${UNIVERSE_PLANET_NAME_LABEL_CLASS} pointer-events-none absolute z-[92] ${
          active ? "shadow-[0_0_20px_rgba(255,255,255,0.25)]" : ""
        }`}
        style={{
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${labelOffset.x}px), calc(-50% + ${labelOffset.y + (compactOrbit ? 52 : 58)}px))`,
        }}
        aria-hidden
      >
        {productName}
      </p>

      {variant === "orbit" && (
        <UniversePlanetIdentityRing
          planetId={planet.id}
          active={active}
          reducedMotion={reducedMotion}
          variant="orbit"
          layer="front"
        />
      )}

      <UniversePlanetSatellites
        planet={planet}
        active={active}
        reducedMotion={reducedMotion}
        orbitDebug={orbitDebug}
      />

      <span className="sr-only">{href}</span>
    </div>
  );
}
