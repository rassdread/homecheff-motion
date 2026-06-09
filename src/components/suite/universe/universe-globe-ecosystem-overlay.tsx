"use client";

import { UNIVERSE_BRAND } from "@/lib/universe-home-config";
import {
  ECOSYSTEM_HUBS,
  ECOSYSTEM_ROUTES,
  latLonToSphereOverlay,
  resolveHubById,
  resolveHubGlowRadius,
  resolveHubNodeRadius,
} from "@/lib/universe-globe-ecosystem";

type GlobeEcosystemOverlayProps = {
  focused: boolean;
  reducedMotion?: boolean;
};

export function GlobeEcosystemOverlay({ focused, reducedMotion }: GlobeEcosystemOverlayProps) {
  const centerLon = 10;

  const hubPositions = ECOSYSTEM_HUBS.map((hub) => ({
    hub,
    pos: latLonToSphereOverlay(hub.lat, hub.lon, centerLon),
  })).filter((entry) => entry.pos.visible);

  return (
    <svg
      className="universe-globe-ecosystem-overlay pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      viewBox="0 0 100 100"
      aria-hidden={!focused}
    >
      <defs>
        <filter id="globe-hub-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Routes */}
      {ECOSYSTEM_ROUTES.map((route, i) => {
        const from = resolveHubById(route.from);
        const to = resolveHubById(route.to);
        if (!from || !to) return null;
        const a = latLonToSphereOverlay(from.lat, from.lon, centerLon);
        const b = latLonToSphereOverlay(to.lat, to.lon, centerLon);
        if (!a.visible || !b.visible) return null;
        const midX = (a.leftPct + b.leftPct) / 2;
        const midY = (a.topPct + b.topPct) / 2 - 4;
        return (
          <path
            key={`${route.from}-${route.to}`}
            d={`M ${a.leftPct} ${a.topPct} Q ${midX} ${midY} ${b.leftPct} ${b.topPct}`}
            fill="none"
            stroke={i % 2 === 0 ? UNIVERSE_BRAND.green : UNIVERSE_BRAND.blue}
            strokeWidth="0.35"
            strokeDasharray="1.2 1.8"
            opacity="0.72"
            className={reducedMotion ? undefined : "universe-globe-route-pulse"}
            style={{ animationDelay: `${i * 0.35}s` }}
          />
        );
      })}

      {/* Light packets on key routes */}
      {!reducedMotion &&
        ECOSYSTEM_ROUTES.slice(0, 4).map((route, i) => {
          const from = resolveHubById(route.from);
          const to = resolveHubById(route.to);
          if (!from || !to) return null;
          const a = latLonToSphereOverlay(from.lat, from.lon, centerLon);
          const b = latLonToSphereOverlay(to.lat, to.lon, centerLon);
          if (!a.visible || !b.visible) return null;
          return (
            <circle
              key={`packet-${route.from}-${route.to}`}
              r="0.55"
              fill="#ffffff"
              opacity="0.85"
              className="universe-globe-route-packet"
              style={{ animationDelay: `${i * 1.2}s` }}
            >
              <animateMotion
                dur={`${5 + i}s`}
                repeatCount="indefinite"
                path={`M ${a.leftPct} ${a.topPct} Q ${(a.leftPct + b.leftPct) / 2} ${(a.topPct + b.topPct) / 2 - 4} ${b.leftPct} ${b.topPct}`}
              />
            </circle>
          );
        })}

      {/* Hub nodes — always visible */}
      {hubPositions.map(({ hub, pos }) => {
        const r = resolveHubNodeRadius(hub.tier) * 0.55;
        const glow = resolveHubGlowRadius(hub.tier) * 0.55;
        return (
          <g key={hub.id} filter="url(#globe-hub-glow)">
            <circle
              cx={pos.leftPct}
              cy={pos.topPct}
              r={glow}
              fill={hub.tier === 1 ? UNIVERSE_BRAND.green : UNIVERSE_BRAND.blue}
              opacity="0.28"
              className={hub.tier === 1 && !reducedMotion ? "universe-globe-hub-pulse" : undefined}
            />
            <circle
              cx={pos.leftPct}
              cy={pos.topPct}
              r={r}
              fill={hub.tier === 1 ? UNIVERSE_BRAND.green : UNIVERSE_BRAND.blue}
              stroke="rgba(255,255,255,0.75)"
              strokeWidth="0.2"
              opacity="0.95"
            />
            {hub.tier === 1 && (
              <text
                x={pos.leftPct}
                y={pos.topPct - r - 1.2}
                textAnchor="middle"
                className="universe-globe-hub-label-overlay"
                opacity={focused ? 1 : 0}
              >
                ★ {hub.name}
              </text>
            )}
            {focused && hub.tier > 1 && (
              <text
                x={pos.leftPct}
                y={pos.topPct - r - 1}
                textAnchor="middle"
                className="universe-globe-hub-label-overlay"
                opacity="0.9"
              >
                {hub.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
