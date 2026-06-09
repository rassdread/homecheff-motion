"use client";

import {
  UNIVERSE_BRAND,
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

  const segments = UNIVERSE_PIPELINE.slice(0, -1).map((from, i) => {
    const to = UNIVERSE_PIPELINE[i + 1]!;
    const fromPlanet = UNIVERSE_PLANETS.find((p) => p.id === from)!;
    const toPlanet = UNIVERSE_PLANETS.find((p) => p.id === to)!;
    const fromPos = resolveUniverseOrbitPosition(fromPlanet.orbitAngle, 22);
    const toPos = resolveUniverseOrbitPosition(toPlanet.orbitAngle, 22);
    const active = resolveUniversePipelineSegmentActive(from, to, highlighted);
    const cx = (fromPos.x + toPos.x) / 2;
    const cy = (fromPos.y + toPos.y) / 2 - 4;
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const curve = `M ${fromPos.x} ${fromPos.y} Q ${cx + dy * 0.15} ${cy - dx * 0.08} ${toPos.x} ${toPos.y}`;

    return { key: `${from}-${to}`, curve, active };
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
      </defs>
      {segments.map((seg) => (
        <path
          key={seg.key}
          d={seg.curve}
          fill="none"
          stroke={seg.active ? "url(#universe-pipeline-gradient)" : "rgba(255,255,255,0.08)"}
          strokeWidth={seg.active ? 0.55 : 0.25}
          strokeLinecap="round"
          style={{
            filter: seg.active ? `drop-shadow(0 0 4px ${UNIVERSE_BRAND.green}88)` : undefined,
            transition: "stroke 0.35s ease, stroke-width 0.35s ease",
          }}
        />
      ))}
    </svg>
  );
}
