"use client";

import { useState } from "react";
import { UNIVERSE_BRAND } from "@/lib/universe-home-config";
import { UNIVERSE_GLOBE_SPHERICAL_CLASS } from "@/lib/universe-public-landing";
import {
  EARTH_CONTINENT_PATHS,
  EARTH_MAP_HEIGHT,
  EARTH_MAP_WIDTH,
} from "@/lib/universe-globe-earth";
import {
  ECOSYSTEM_HUBS,
  ECOSYSTEM_ROUTES,
  latLonToMapCoords,
  resolveHubById,
  resolveHubNodeRadius,
} from "@/lib/universe-globe-ecosystem";
import { UNIVERSE_Z_GLOBE } from "@/lib/universe-planet-ux";

type UniverseGlobeProps = {
  reducedMotion?: boolean;
  size?: "hero" | "compact";
};

function EarthMapLayer({ showLabels }: { showLabels: boolean }) {
  return (
    <svg
      viewBox={`0 0 ${EARTH_MAP_WIDTH} ${EARTH_MAP_HEIGHT}`}
      className="h-full w-[200%] min-w-[200%]"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="globe-ocean-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={UNIVERSE_BRAND.blue} />
          <stop offset="55%" stopColor="#0a5a8a" />
          <stop offset="100%" stopColor="#043a5c" />
        </linearGradient>
      </defs>
      <rect width={EARTH_MAP_WIDTH} height={EARTH_MAP_HEIGHT} fill="#0a5a8a" />
      <rect width={EARTH_MAP_WIDTH} height={EARTH_MAP_HEIGHT} fill="url(#globe-ocean-gradient)" opacity="0.9" />

      {EARTH_CONTINENT_PATHS.map((continent) => (
        <path key={continent.id} d={continent.d} fill={continent.fill ?? UNIVERSE_BRAND.green} opacity="0.93" />
      ))}

      {/* Seamless duplicate for scroll */}
      <g transform={`translate(${EARTH_MAP_WIDTH}, 0)`}>
        {EARTH_CONTINENT_PATHS.map((continent) => (
          <path
            key={`dup-${continent.id}`}
            d={continent.d}
            fill={continent.fill ?? UNIVERSE_BRAND.green}
            opacity="0.93"
          />
        ))}
      </g>

      {/* Lat / lon grid */}
      {[60, 120, 180, 240, 300].map((y) => (
        <line key={`lat-${y}`} x1="0" y1={y} x2={EARTH_MAP_WIDTH * 2} y2={y} className="universe-globe-latitude" />
      ))}
      {[0, 90, 180, 270, 360, 450, 540, 630, 720, 810, 900, 990, 1080, 1170, 1260, 1350, 1440].map((x) => (
        <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2={EARTH_MAP_HEIGHT} className="universe-globe-longitude" />
      ))}

      {/* Ecosystem routes */}
      {ECOSYSTEM_ROUTES.map((route, i) => {
        const from = resolveHubById(route.from);
        const to = resolveHubById(route.to);
        if (!from || !to) return null;
        const a = latLonToMapCoords(from.lat, from.lon);
        const b = latLonToMapCoords(to.lat, to.lon);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2 - 18;
        return (
          <path
            key={`${route.from}-${route.to}`}
            d={`M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`}
            fill="none"
            stroke={i % 2 === 0 ? UNIVERSE_BRAND.green : UNIVERSE_BRAND.blue}
            strokeWidth="0.8"
            strokeDasharray="4 8"
            opacity="0.42"
          />
        );
      })}

      {/* Ecosystem hubs */}
      {ECOSYSTEM_HUBS.map((hub) => {
        const { x, y } = latLonToMapCoords(hub.lat, hub.lon);
        const r = resolveHubNodeRadius(hub.tier);
        return (
          <g key={hub.id}>
            <circle cx={x} cy={y} r={r + 2} fill={UNIVERSE_BRAND.green} opacity="0.25" />
            <circle cx={x} cy={y} r={r} fill={hub.tier === 1 ? UNIVERSE_BRAND.green : UNIVERSE_BRAND.blue} opacity="0.88" />
            {hub.tier === 1 && (
              <text x={x} y={y - r - 4} textAnchor="middle" className="universe-globe-hub-label" opacity={showLabels ? 1 : 0}>
                {hub.tier === 1 ? "★ " : ""}
                {hub.name}
              </text>
            )}
            {showLabels && hub.tier > 1 && (
              <text x={x} y={y - r - 3} textAnchor="middle" className="universe-globe-hub-label" opacity="0.85">
                {hub.name}
              </text>
            )}
          </g>
        );
      })}

      {/* Duplicate ecosystem on seamless segment */}
      <g transform={`translate(${EARTH_MAP_WIDTH}, 0)`}>
        {ECOSYSTEM_HUBS.map((hub) => {
          const { x, y } = latLonToMapCoords(hub.lat, hub.lon);
          const r = resolveHubNodeRadius(hub.tier);
          return (
            <circle
              key={`dup-hub-${hub.id}`}
              cx={x}
              cy={y}
              r={r}
              fill={hub.tier === 1 ? UNIVERSE_BRAND.green : UNIVERSE_BRAND.blue}
              opacity="0.88"
            />
          );
        })}
      </g>
    </svg>
  );
}

export function UniverseGlobe({ reducedMotion = false, size = "hero" }: UniverseGlobeProps) {
  const [focused, setFocused] = useState(false);
  const dim = size === "hero" ? "min(52vw, 500px)" : "172px";

  return (
    <div
      className={`${UNIVERSE_GLOBE_SPHERICAL_CLASS} relative flex items-center justify-center`}
      style={{ width: dim, height: dim, aspectRatio: "1 / 1", zIndex: UNIVERSE_Z_GLOBE }}
      role="img"
      aria-label="HomeCheff Earth — global creative ecosystem"
      onMouseEnter={() => setFocused(true)}
      onMouseLeave={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      tabIndex={0}
    >
      {/* Atmosphere glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: "114%",
          height: "114%",
          background: `radial-gradient(circle, ${UNIVERSE_BRAND.blue}55 0%, ${UNIVERSE_BRAND.green}33 40%, transparent 76%)`,
          animation: reducedMotion ? undefined : "universe-glow-pulse 7s ease-in-out infinite",
        }}
      />

      <div
        className="relative overflow-hidden rounded-full"
        style={{
          width: "94%",
          height: "94%",
          aspectRatio: "1 / 1",
          animation: reducedMotion ? undefined : "universe-float 8s ease-in-out infinite",
          boxShadow: `0 0 52px ${UNIVERSE_BRAND.blue}88, 0 0 90px ${UNIVERSE_BRAND.green}44, inset 0 -14px 36px rgba(0,0,0,0.38)`,
        }}
      >
        {/* Ocean base */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 26%, #2aa8d8 0%, ${UNIVERSE_BRAND.blue} 30%, #0a5a8a 56%, #032840 100%)`,
          }}
        />

        {/* Rotating Earth map + ecosystem */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div
            className={`absolute inset-y-0 left-0 flex h-full ${reducedMotion ? "" : "universe-globe-map-layer"}`}
            style={{ width: "200%" }}
          >
            <EarthMapLayer showLabels={focused} />
          </div>
        </div>

        {/* Spherical shading grid */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 200 200" aria-hidden>
          {[40, 70, 100, 130, 160].map((x) => (
            <ellipse
              key={`meridian-${x}`}
              cx="100"
              cy="100"
              rx={Math.abs(100 - x) * 0.55 + 10}
              ry={98}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.4"
            />
          ))}
        </svg>

        {/* Light clouds */}
        <div
          className="absolute inset-0 rounded-full opacity-28 mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 36% 30%, rgba(255,255,255,0.32) 0%, transparent 40%)`,
            animation: reducedMotion ? undefined : "universe-cloud-drift 16s ease-in-out infinite",
          }}
        />

        {/* Soft glass highlight */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 24% 18%, rgba(255,255,255,0.22) 0%, transparent 36%)`,
          }}
        />

        {/* Terminator */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(108deg, transparent 36%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.58) 100%)`,
          }}
        />

        {/* Atmosphere rim */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `inset 0 0 28px rgba(135,195,255,0.18), inset 0 -12px 30px rgba(0,0,0,0.28)`,
            border: "1.5px solid rgba(135,195,255,0.32)",
          }}
        />
      </div>
    </div>
  );
}
