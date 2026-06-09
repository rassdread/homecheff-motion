"use client";

import type { UniversePlanetId } from "@/lib/universe-home-config";
import { resolveUniversePlanetLabel } from "@/lib/universe-public-landing";
import {
  UNIVERSE_PLANET_IDENTITY_RING_CLASS,
  UNIVERSE_PLANET_RING_SVG_FONT_SIZE,
  UNIVERSE_PLANET_RING_SVG_SCALE_PERCENT,
} from "@/lib/universe-planet-ux";

type Props = {
  planetId: UniversePlanetId;
  active?: boolean;
  reducedMotion?: boolean;
  variant?: "orbit" | "band";
};

export function UniversePlanetIdentityRing({
  planetId,
  active = false,
  reducedMotion = false,
  variant = "orbit",
}: Props) {
  const label = resolveUniversePlanetLabel(planetId);
  const ringText = `${label} · ${label} · ${label} · ${label} · `;
  const pathId = `universe-ring-${planetId}`;

  if (variant === "band") {
    return (
      <div className="flex w-full justify-center" aria-hidden={false}>
        <span
          className={`${UNIVERSE_PLANET_IDENTITY_RING_CLASS} rounded-full border px-5 py-1.5 text-[clamp(14px,4vw,20px)] font-bold uppercase tracking-[0.2em] ${
            active
              ? "border-white/45 bg-white/18 text-white"
              : "border-white/25 bg-white/10 text-white/85"
          }`}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${UNIVERSE_PLANET_IDENTITY_RING_CLASS} pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible`}
      aria-hidden={false}
    >
      <svg
        className={`absolute overflow-visible ${active ? "opacity-100" : "opacity-88"} ${reducedMotion ? "" : "universe-planet-ring-spin"}`}
        viewBox="0 0 200 200"
        style={{
          width: `${UNIVERSE_PLANET_RING_SVG_SCALE_PERCENT}%`,
          height: `${UNIVERSE_PLANET_RING_SVG_SCALE_PERCENT}%`,
        }}
        role="img"
        aria-label={label}
      >
        <defs>
          <path
            id={pathId}
            d="M 100,100 m -92,0 a 92,92 0 1,1 184,0 a 92,92 0 1,1 -184,0"
            fill="none"
          />
        </defs>
        <text
          className="universe-planet-ring-text"
          fill={active ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.86)"}
          fontSize={UNIVERSE_PLANET_RING_SVG_FONT_SIZE}
          fontWeight="700"
          letterSpacing="3"
        >
          <textPath href={`#${pathId}`} startOffset="0%">
            {ringText}
          </textPath>
        </text>
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}
