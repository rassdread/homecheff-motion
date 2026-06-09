"use client";

import type { CSSProperties } from "react";
import type { UniversePlanetConfig } from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";
import { UniversePlanetIdentityRing } from "@/components/suite/universe/universe-planet-identity-ring";
import { UniversePlanetPreview } from "@/components/suite/universe/universe-planet-preview";
import { UniversePlanetSatellites } from "@/components/suite/universe/universe-planet-satellites";
import { UniversePlanetWorld } from "@/components/suite/universe/universe-planet-world";
import {
  UNIVERSE_PLANET_CLUSTER_CLASS,
  UNIVERSE_PLANET_ORBIT_CLUSTER_HEIGHT_PX,
  UNIVERSE_PLANET_ORBIT_CLUSTER_WIDTH_PX,
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
  showCardPreview?: boolean;
};

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
  showCardPreview = true,
}: UniversePlanetProps) {
  const t = useActiveTranslator();
  const active = hovered || focused;

  const sizeClass =
    variant === "orbit" ? "h-[100px] w-[100px] sm:h-[110px] sm:w-[110px]" : "h-[88px] w-[88px]";

  const sphereBg = planet.accentSecondary
    ? `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.35) 0%, transparent 40%),
       radial-gradient(circle at 65% 75%, ${planet.accentSecondary}aa 0%, ${planet.accent}cc 45%, #041428 85%)`
    : `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.35) 0%, transparent 40%),
       radial-gradient(circle at 65% 75%, ${planet.accent}cc 0%, #041428 85%)`;

  const previewPlacement =
    planet.orbitAngle > 90 && planet.orbitAngle < 270 ? "side" : "below";

  const handleClusterEnter = () => {
    onHoverStart(planet.id);
  };

  const handleClusterLeave = () => {
    onHoverEnd();
  };

  return (
    <div
      className={`${UNIVERSE_PLANET_CLUSTER_CLASS} group relative flex flex-col items-center justify-center overflow-visible ${
        variant === "orbit" ? "universe-planet-orbit-cluster" : ""
      }`}
      style={{
        ...style,
        ...(variant === "orbit"
          ? {
              width: UNIVERSE_PLANET_ORBIT_CLUSTER_WIDTH_PX,
              height: UNIVERSE_PLANET_ORBIT_CLUSTER_HEIGHT_PX,
              minWidth: UNIVERSE_PLANET_ORBIT_CLUSTER_WIDTH_PX,
              minHeight: UNIVERSE_PLANET_ORBIT_CLUSTER_HEIGHT_PX,
            }
          : undefined),
      }}
      onMouseEnter={handleClusterEnter}
      onMouseLeave={handleClusterLeave}
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
        />
      )}

      <UniversePlanetSatellites planet={planet} active={active} reducedMotion={reducedMotion} />

      <button
        type="button"
        onClick={() => onSelect(planet)}
        className={`relative z-[2] ${sizeClass} rounded-full outline-none transition-transform duration-500 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#041428] ${
          active ? "scale-[1.15] z-10" : "scale-100 hover:scale-105"
        }`}
        style={{
          willChange: "transform",
          boxShadow: active
            ? `0 0 48px ${planet.accent}99, inset 0 2px 0 rgba(255,255,255,0.25)`
            : `0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)`,
        }}
        aria-label={`${t(planet.titleKey)} — ${t(planet.descriptionKey)}`}
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
        </div>
        {active && (
          <span
            className="absolute -inset-1 rounded-full border border-white/20"
            style={{
              animation: reducedMotion ? undefined : "universe-glow-pulse 2.2s ease-in-out infinite",
            }}
            aria-hidden
          />
        )}
      </button>

      {variant === "orbit" && (
        <UniversePlanetPreview
          planet={planet}
          active={active}
          onOpen={() => onSelect(planet)}
          onPortalEnter={handleClusterEnter}
          onPortalLeave={handleClusterLeave}
          placement={previewPlacement}
        />
      )}

      {variant === "card" && active && showCardPreview && (
        <div className="mt-3 w-full">
          <UniversePlanetPreview
            planet={planet}
            active={active}
            onOpen={() => onSelect(planet)}
            placement="below"
          />
        </div>
      )}

      <span className="sr-only">{href}</span>
    </div>
  );
}
