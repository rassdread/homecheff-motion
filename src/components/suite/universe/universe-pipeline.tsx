"use client";

import {
  UNIVERSE_BRAND,
  UNIVERSE_ORBIT_RADIUS_PERCENT,
  UNIVERSE_PIPELINE,
  UNIVERSE_PLANETS,
  resolveUniverseOrbitPosition,
  resolveUniversePipelineHighlight,
  resolveUniversePipelineSegmentActive,
  type UniversePlanetId,
} from "@/lib/universe-home-config";

type UniversePipelineProps = {
  hoveredPlanet: UniversePlanetId | null;
};

export function UniversePipeline({ hoveredPlanet }: UniversePipelineProps) {
  const highlighted = resolveUniversePipelineHighlight(hoveredPlanet);
  const center = { x: 50, y: 50 };

  const segments = UNIVERSE_PIPELINE.slice(0, -1).map((from, i) => {
    const to = UNIVERSE_PIPELINE[i + 1]!;
    const fromPlanet = UNIVERSE_PLANETS.find((p) => p.id === from)!;
    const toPlanet = UNIVERSE_PLANETS.find((p) => p.id === to)!;
    const fromPos = resolveUniverseOrbitPosition(fromPlanet.orbitAngle, UNIVERSE_ORBIT_RADIUS_PERCENT);
    const toPos = resolveUniverseOrbitPosition(toPlanet.orbitAngle, UNIVERSE_ORBIT_RADIUS_PERCENT);
    const active = resolveUniversePipelineSegmentActive(from, to, highlighted);
    const cx = (fromPos.x + toPos.x) / 2;
    const cy = (fromPos.y + toPos.y) / 2 - 3;
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const curve = `M ${fromPos.x} ${fromPos.y} Q ${cx + dy * 0.12} ${cy - dx * 0.06} ${toPos.x} ${toPos.y}`;

    return { key: `${from}-${to}`, curve, active, fromPos, toPos };
  });

  const hubSegments = UNIVERSE_PIPELINE.map((id) => {
    const planet = UNIVERSE_PLANETS.find((p) => p.id === id)!;
    const pos = resolveUniverseOrbitPosition(planet.orbitAngle, UNIVERSE_ORBIT_RADIUS_PERCENT);
    const active = highlighted.has(id);
    return {
      key: `hub-${id}`,
      line: `M ${center.x} ${center.y} L ${pos.x} ${pos.y}`,
      active,
    };
  });

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <linearGradient id="universe-pipeline-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={UNIVERSE_BRAND.blue} />
          <stop offset="100%" stopColor={UNIVERSE_BRAND.green} />
        </linearGradient>
        <filter id="universe-pipeline-glow">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {hubSegments.map((seg) => (
        <path
          key={seg.key}
          d={seg.line}
          fill="none"
          stroke={seg.active ? "url(#universe-pipeline-gradient)" : "rgba(255,255,255,0.04)"}
          strokeWidth={seg.active ? 0.35 : 0.15}
          strokeLinecap="round"
          opacity={seg.active ? 0.6 : 0.3}
        />
      ))}

      {segments.map((seg) => (
        <g key={seg.key}>
          <path
            d={seg.curve}
            fill="none"
            stroke={seg.active ? "url(#universe-pipeline-gradient)" : "rgba(255,255,255,0.1)"}
            strokeWidth={seg.active ? 0.7 : 0.3}
            strokeLinecap="round"
            filter={seg.active ? "url(#universe-pipeline-glow)" : undefined}
            style={{ transition: "stroke 0.4s ease, stroke-width 0.4s ease" }}
          />
          {seg.active && (
            <path
              d={seg.curve}
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="0.25"
              strokeDasharray="3 3"
              style={{ animation: "universe-pipeline-flow 1.2s linear infinite" }}
            />
          )}
        </g>
      ))}
    </svg>
  );
}
