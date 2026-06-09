"use client";

import type { UniversePlanetId } from "@/lib/universe-home-config";
import { resolveUniversePlanetLabel } from "@/lib/universe-public-landing";

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
      <div
        className="mt-2 flex w-full justify-center"
        aria-hidden={false}
      >
        <span
          className={`rounded-full border px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${
            active
              ? "border-white/40 bg-white/15 text-white"
              : "border-white/20 bg-white/8 text-white/75"
          }`}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden={false}
    >
      <svg
        className={`absolute ${active ? "opacity-95" : "opacity-70"} ${reducedMotion ? "" : "universe-planet-ring-spin"}`}
        viewBox="0 0 120 120"
        style={{ width: "148%", height: "148%" }}
        role="img"
        aria-label={label}
      >
        <defs>
          <path
            id={pathId}
            d="M 60,60 m -44,0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0"
            fill="none"
          />
        </defs>
        <text
          fill={active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.72)"}
          fontSize="5.5"
          fontWeight="600"
          letterSpacing="1.2"
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
