"use client";

import type { UniversePlanetId } from "@/lib/universe-home-config";
import { resolveUniversePlanetLabel } from "@/lib/universe-public-landing";
import {
  UNIVERSE_PLANET_SATURN_RING_CLASS,
  UNIVERSE_PLANET_SATURN_SCENE_CLASS,
  UNIVERSE_Z_RING,
  resolveSaturnRingVariant,
} from "@/lib/universe-planet-ux";

type Props = {
  planetId: UniversePlanetId;
  active?: boolean;
  reducedMotion?: boolean;
  variant?: "orbit" | "band";
};

function SaturnRingDecorations({
  planetId,
  accent,
  reducedMotion,
}: {
  planetId: UniversePlanetId;
  accent: string;
  reducedMotion: boolean;
}) {
  const variant = resolveSaturnRingVariant(planetId);
  const spin = reducedMotion ? undefined : "universe-saturn-decor-spin 18s linear infinite";

  if (variant.decoration === "fragments") {
    return (
      <>
        {[0, 120, 240].map((deg) => (
          <span
            key={deg}
            className="absolute h-2 w-2.5 rounded-sm border border-white/40 bg-white/25"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${deg}deg) translateX(72px) translateY(-50%)`,
              animation: spin,
            }}
            aria-hidden
          />
        ))}
      </>
    );
  }

  if (variant.decoration === "cards") {
    return (
      <>
        {[0, 180].map((deg) => (
          <span
            key={deg}
            className="absolute h-3 w-4 rounded-sm border border-white/30"
            style={{
              top: "50%",
              left: "50%",
              background: `linear-gradient(135deg, ${accent}88, transparent)`,
              transform: `rotate(${deg}deg) translateX(68px) translateY(-50%)`,
              animation: spin,
            }}
            aria-hidden
          />
        ))}
      </>
    );
  }

  if (variant.decoration === "streaks") {
    return (
      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <path
          d="M 20 100 Q 100 88 180 100"
          fill="none"
          stroke={accent}
          strokeWidth="1.5"
          strokeDasharray="6 10"
          opacity="0.65"
          style={{ animation: reducedMotion ? undefined : "universe-motion-trail 4s ease-in-out infinite" }}
        />
      </svg>
    );
  }

  if (variant.decoration === "export") {
    return (
      <>
        {[0, 90, 180, 270].map((deg) => (
          <span
            key={deg}
            className="absolute h-1 w-3 rounded-full bg-white/35"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${deg}deg) translateX(70px) translateY(-50%)`,
            }}
            aria-hidden
          />
        ))}
      </>
    );
  }

  /* archive */
  return (
    <>
      {[0, 72, 144, 216, 288].map((deg, i) => (
        <span
          key={deg}
          className="absolute h-2.5 w-2 rounded-sm border border-white/25 bg-white/12"
          style={{
            top: "50%",
            left: "50%",
            transform: `rotate(${deg}deg) translateX(${66 + (i % 2) * 6}px) translateY(-50%)`,
            animation: spin,
          }}
          aria-hidden
        />
      ))}
    </>
  );
}

export function UniverseSaturnRing({
  planetId,
  active = false,
  reducedMotion = false,
  variant = "orbit",
}: Props) {
  const label = resolveUniversePlanetLabel(planetId);
  const ringVariant = resolveSaturnRingVariant(planetId);

  if (variant === "band") {
    return (
      <div className="flex w-full justify-center" aria-hidden={false}>
        <span
          className={`${UNIVERSE_PLANET_SATURN_RING_CLASS} rounded-full border px-5 py-1.5 text-[clamp(14px,4vw,20px)] font-bold uppercase tracking-[0.2em] ${
            active
              ? "border-white/45 bg-white/18 text-white"
              : "border-white/25 bg-white/10 text-white/85"
          }`}
          style={{ borderColor: active ? ringVariant.accent : undefined }}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Rear ring segment — behind planet (z 70) */}
      <div
        className={`${UNIVERSE_PLANET_SATURN_SCENE_CLASS} pointer-events-none absolute inset-0 flex items-center justify-center`}
        style={{ zIndex: UNIVERSE_Z_RING, perspective: 520 }}
        aria-hidden={false}
      >
        <div
          className={`universe-saturn-y-rotator universe-saturn-y-rotator-back ${reducedMotion ? "" : "universe-saturn-spin"} ${active ? "universe-saturn-active" : ""}`}
        >
          <div className="universe-saturn-tilt">
            <div
              className={`${UNIVERSE_PLANET_SATURN_RING_CLASS} universe-saturn-band universe-saturn-band-back`}
              style={{
                borderColor: ringVariant.accent,
                boxShadow: `0 0 16px ${ringVariant.accent}55, inset 0 0 10px ${ringVariant.accent}33`,
              }}
            >
              <div className="universe-saturn-band-inner" style={{ borderColor: `${ringVariant.accent}66` }} />
              <SaturnRingDecorations planetId={planetId} accent={ringVariant.accent} reducedMotion={reducedMotion} />
            </div>
          </div>
        </div>
      </div>

      {/* Front ring segment — rendered after planet via sibling in parent */}
    </>
  );
}

/** Front arc of Saturn ring — mount after planet sphere in DOM */
export function UniverseSaturnRingFront({
  planetId,
  active = false,
  reducedMotion = false,
}: {
  planetId: UniversePlanetId;
  active?: boolean;
  reducedMotion?: boolean;
}) {
  const label = resolveUniversePlanetLabel(planetId);
  const ringText = `${label} • ${label} • ${label} • ${label} • ${label} • `;
  const ringVariant = resolveSaturnRingVariant(planetId);
  const pathId = `universe-saturn-ring-path-${planetId}`;

  return (
    <div
      className={`${UNIVERSE_PLANET_SATURN_SCENE_CLASS} pointer-events-none absolute inset-0 flex items-center justify-center`}
      style={{ zIndex: UNIVERSE_Z_RING + 5, perspective: 520 }}
      aria-hidden={false}
    >
      <div
        className={`universe-saturn-y-rotator universe-saturn-y-rotator-front ${reducedMotion ? "" : "universe-saturn-spin"} ${active ? "universe-saturn-active" : ""}`}
      >
        <div className="universe-saturn-tilt">
          <div
            className={`${UNIVERSE_PLANET_SATURN_RING_CLASS} universe-saturn-band universe-saturn-band-front`}
            style={{
              borderColor: ringVariant.accent,
              boxShadow: `0 0 20px ${ringVariant.accent}77, inset 0 0 12px ${ringVariant.accent}44`,
            }}
          >
            <div className="universe-saturn-band-inner" style={{ borderColor: `${ringVariant.accent}88` }} />
            <svg
              className="universe-saturn-ring-svg absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 200 200"
              aria-hidden
            >
              <defs>
                <path
                  id={pathId}
                  d="M 24 102 A 76 20 0 1 1 176 102"
                  fill="none"
                />
              </defs>
              <text
                className="universe-saturn-ring-text"
                fill="rgba(255,255,255,0.95)"
                fontSize="10.5"
                fontWeight="700"
                letterSpacing="0.28em"
              >
                <textPath href={`#${pathId}`} startOffset="0%">
                  {ringText}
                </textPath>
              </text>
            </svg>
          </div>
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
