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
        className="pointer-events-none absolute rounded-full"
        style={{
          width: "102%",
          height: "102%",
          background: `radial-gradient(circle, ${UNIVERSE_BRAND.blue}44 0%, ${UNIVERSE_BRAND.green}22 42%, transparent 72%)`,
          animation: reducedMotion ? undefined : "universe-glow-pulse 7s ease-in-out infinite",
        }}
      />

      <div
        className="relative overflow-hidden rounded-full"
        style={{
          width: "92%",
          height: "92%",
          aspectRatio: "1 / 1",
          animation: reducedMotion ? undefined : "universe-float 8s ease-in-out infinite",
          boxShadow: `0 0 40px ${UNIVERSE_BRAND.blue}77, inset 0 -12px 32px rgba(0,0,0,0.35)`,
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 32% 28%, #2aa8d8 0%, ${UNIVERSE_BRAND.blue} 32%, #0a5a8a 58%, #032840 100%)`,
          }}
        />

        {showContinents && (
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div
              className="absolute inset-y-0 left-0 h-full"
              style={{
                width: "200%",
                transform: `translateX(${mapTranslatePct}%)`,
                willChange: reducedMotion ? undefined : "transform",
              }}
            >
              <WorldMapTexture visible />
            </div>
          </div>
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
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="0.25"
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
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.2"
            />
          ))}
        </svg>

        {showEcosystem && (
          <GlobeEcosystemOverlay
            focused={focused}
            reducedMotion={reducedMotion}
            rotationDeg={rotationDeg}
            projectionDebug={projectionDebug}
          />
        )}

        <div
          className="pointer-events-none absolute inset-0 rounded-full opacity-22 mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 38% 32%, rgba(255,255,255,0.28) 0%, transparent 38%)`,
            animation: reducedMotion ? undefined : "universe-cloud-drift 16s ease-in-out infinite",
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(108deg, transparent 38%, rgba(0,0,0,0.32) 72%, rgba(0,0,0,0.55) 100%)`,
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow: `inset 0 0 24px rgba(135,195,255,0.16), inset 0 -10px 26px rgba(0,0,0,0.26)`,
            border: "1.5px solid rgba(135,195,255,0.28)",
          }}
        />
      </div>
    </div>
  );
}
