"use client";

import { useState } from "react";
import { GlobeEcosystemOverlay } from "@/components/suite/universe/universe-globe-ecosystem-overlay";
import { WorldMapTexture } from "@/components/suite/universe/world-map-texture";
import { useUniverseGlobeRotation } from "@/hooks/use-universe-globe-rotation";
import { UNIVERSE_BRAND } from "@/lib/universe-home-config";
import { resolveGlobeMapTranslatePercent } from "@/lib/universe-globe-projection";
import {
  shouldShowGlobeContinents,
  shouldShowGlobeEcosystem,
  UNIVERSE_GLOBE_HERO_MAX_PX,
  type UniverseGlobeDebugLayer,
} from "@/lib/universe-globe-render";
import { UNIVERSE_GLOBE_SPHERICAL_CLASS } from "@/lib/universe-public-landing";

type UniverseGlobeProps = {
  reducedMotion?: boolean;
  size?: "hero" | "compact";
  debugLayer?: UniverseGlobeDebugLayer | null;
  projectionDebug?: boolean;
};

export function UniverseGlobe({
  reducedMotion = false,
  size = "hero",
  debugLayer = null,
  projectionDebug = false,
}: UniverseGlobeProps) {
  const [focused, setFocused] = useState(false);
  const rotationDeg = useUniverseGlobeRotation(reducedMotion, focused);
  const mapTranslatePct = resolveGlobeMapTranslatePercent(rotationDeg);
  const dim = size === "hero" ? `min(34vw, ${UNIVERSE_GLOBE_HERO_MAX_PX}px)` : "160px";
  const showContinents = shouldShowGlobeContinents(debugLayer);
  const showEcosystem = shouldShowGlobeEcosystem(debugLayer);

  return (
    <div
      className={`${UNIVERSE_GLOBE_SPHERICAL_CLASS} universe-globe-root relative flex items-center justify-center`}
      style={{ width: dim, height: dim, aspectRatio: "1 / 1" }}
      role="img"
      aria-label="HomeCheff Earth — global creative ecosystem"
      onMouseEnter={() => setFocused(true)}
      onMouseLeave={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      tabIndex={0}
      data-universe-globe-debug={debugLayer ?? "full"}
      data-universe-globe-rotation={rotationDeg.toFixed(1)}
    >
      <div
        className="pointer-events-none absolute rounded-full universe-globe-atmosphere-glow"
        style={{
          width: "102%",
          height: "102%",
          background: `radial-gradient(circle, rgba(0,103,177,0.42) 0%, rgba(0,109,82,0.18) 48%, transparent 72%)`,
          animation: reducedMotion ? undefined : "universe-glow-pulse 7s ease-in-out infinite",
        }}
      />

      <div
        className="universe-globe-sphere relative overflow-hidden rounded-full"
        style={{
          width: "92%",
          height: "92%",
          aspectRatio: "1 / 1",
          boxShadow: `0 0 36px rgba(0,103,177,0.55), 0 0 18px rgba(0,109,82,0.25), inset 0 -12px 32px rgba(0,0,0,0.38)`,
        }}
      >
        <div
          className="absolute inset-0 rounded-full universe-globe-ocean"
          style={{
            background: `radial-gradient(circle at 34% 30%, #005a94 0%, #0067B1 40%, #004a7f 66%, #011a2e 100%)`,
          }}
        />

        {showContinents && (
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div
              className="absolute inset-y-0 left-0 h-full will-change-transform"
              style={{
                width: "200%",
                transform: `translateX(${mapTranslatePct}%)`,
              }}
            >
              <WorldMapTexture visible />
            </div>
          </div>
        )}

        {showEcosystem && (
          <GlobeEcosystemOverlay
            focused={focused}
            reducedMotion={reducedMotion}
            rotationDeg={rotationDeg}
            projectionDebug={projectionDebug}
          />
        )}

        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden>
          {[20, 35, 50, 65, 80].map((x) => (
            <ellipse
              key={`meridian-${x}`}
              cx="50"
              cy="50"
              rx={Math.abs(50 - x) * 0.55 + 8}
              ry={48}
              fill="none"
              stroke="rgba(0,103,177,0.1)"
              strokeWidth="0.2"
            />
          ))}
          {[30, 40, 50, 60, 70].map((y) => (
            <ellipse
              key={`parallel-${y}`}
              cx="50"
              cy="50"
              rx={48}
              ry={Math.abs(50 - y) * 0.85 + 6}
              fill="none"
              stroke="rgba(0,109,82,0.08)"
              strokeWidth="0.16"
            />
          ))}
        </svg>

        <div
          className="pointer-events-none absolute inset-0 rounded-full universe-globe-haze"
          style={{
            background: `radial-gradient(circle at 36% 30%, rgba(255,255,255,0.08) 0%, transparent 28%)`,
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 rounded-full universe-globe-terminator"
          style={{
            background: `linear-gradient(108deg, transparent 40%, rgba(0,0,0,0.28) 74%, rgba(0,0,0,0.5) 100%)`,
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 rounded-full universe-globe-rim"
          style={{
            boxShadow: `inset 0 0 20px rgba(0,103,177,0.24), inset 0 -8px 22px rgba(0,0,0,0.34)`,
            border: `1.5px solid rgba(0,109,82,0.4)`,
          }}
        />
      </div>
    </div>
  );
}
