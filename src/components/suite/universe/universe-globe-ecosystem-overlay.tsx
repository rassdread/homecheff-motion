"use client";

import { UNIVERSE_BRAND } from "@/lib/universe-home-config";
import {
  ECOSYSTEM_HUBS,
  ECOSYSTEM_ROUTES,
  projectHubToGlobe,
  resolveHubById,
  resolveHubGlowRadius,
  resolveHubNodeRadius,
} from "@/lib/universe-globe-ecosystem";
import {
  buildGlobeRoutePath,
  resolveGlobeNodeLabelOpacity,
  resolveGlobeRouteOpacity,
  shouldDrawGlobeRoute,
} from "@/lib/universe-globe-projection";

type GlobeEcosystemOverlayProps = {
  focused: boolean;
  reducedMotion?: boolean;
  rotationDeg: number;
  projectionDebug?: boolean;
};

export function GlobeEcosystemOverlay({
  focused,
  rotationDeg,
  projectionDebug = false,
}: GlobeEcosystemOverlayProps) {
  const hubProjections = ECOSYSTEM_HUBS.map((hub) => ({
    hub,
    point: projectHubToGlobe(hub.lat, hub.lon, rotationDeg),
  }));

  const visibleHubs = hubProjections
    .filter(({ point }) => point.visible && point.opacity > 0.12)
    .sort((a, b) => a.point.z - b.point.z);

  return (
    <svg
      className="universe-globe-ecosystem-overlay pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
      viewBox="0 0 100 100"
      aria-hidden={!focused}
      data-universe-globe-rotation={rotationDeg.toFixed(1)}
    >
      {projectionDebug && (
        <g className="universe-globe-projection-debug" opacity="0.85">
          {[0, 15, 30, 45, 60, 75, 90].map((lat) => {
            const pts = [-180, -135, -90, -45, 0, 45, 90, 135, 180].map((lon) =>
              projectHubToGlobe(lat, lon, rotationDeg)
            );
            const visiblePts = pts.filter((p) => p.visible);
            if (visiblePts.length < 2) return null;
            return (
              <polyline
                key={`lat-${lat}`}
                points={visiblePts.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.15"
              />
            );
          })}
          {[-180, -120, -60, 0, 60, 120, 180].map((lon) => {
            const pts = [-60, -30, 0, 30, 60, 90].map((lat) =>
              projectHubToGlobe(lat, lon, rotationDeg)
            );
            const visiblePts = pts.filter((p) => p.visible);
            if (visiblePts.length < 2) return null;
            return (
              <polyline
                key={`lon-${lon}`}
                points={visiblePts.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="0.12"
              />
            );
          })}
          <text x="4" y="8" className="universe-globe-debug-text" fontSize="2.8">
            rot {rotationDeg.toFixed(1)}°
          </text>
        </g>
      )}

      <g className="universe-globe-routes">
        {ECOSYSTEM_ROUTES.map((route) => {
          const from = resolveHubById(route.from);
          const to = resolveHubById(route.to);
          if (!from || !to) return null;
          const a = projectHubToGlobe(from.lat, from.lon, rotationDeg);
          const b = projectHubToGlobe(to.lat, to.lon, rotationDeg);
          if (!shouldDrawGlobeRoute(a, b)) return null;
          const routeOpacity = resolveGlobeRouteOpacity(a, b);
          return (
            <path
              key={`${route.from}-${route.to}`}
              d={buildGlobeRoutePath(a, b)}
              fill="none"
              stroke={UNIVERSE_BRAND.green}
              strokeWidth="0.16"
              strokeLinecap="round"
              opacity={routeOpacity}
            />
          );
        })}
      </g>

      <g className="universe-globe-hubs">
        {visibleHubs.map(({ hub, point }) => {
          const r = resolveHubNodeRadius(hub.tier) * point.scale;
          const glow = resolveHubGlowRadius(hub.tier) * point.scale;
          const labelOpacity = resolveGlobeNodeLabelOpacity(point, focused, hub.tier);
          const fill = hub.tier === 1 ? UNIVERSE_BRAND.green : UNIVERSE_BRAND.blue;

          return (
            <g key={hub.id} opacity={point.opacity}>
              <circle
                cx={point.x}
                cy={point.y}
                r={glow}
                fill={fill}
                opacity="0.16"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={r}
                fill={fill}
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.12"
              />
              {labelOpacity > 0 && (
                <text
                  x={point.x}
                  y={point.y - r - 1.1}
                  textAnchor="middle"
                  className="universe-globe-hub-label-overlay"
                  opacity={labelOpacity}
                >
                  {hub.name}
                </text>
              )}
              {projectionDebug && (
                <text
                  x={point.x}
                  y={point.y + r + 2.2}
                  textAnchor="middle"
                  className="universe-globe-debug-text"
                  fontSize="1.6"
                  opacity="0.9"
                >
                  {hub.name} z={point.z.toFixed(2)}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
