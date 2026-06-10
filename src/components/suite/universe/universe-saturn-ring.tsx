"use client";

import type { UniversePlanetId } from "@/lib/universe-home-config";
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

/** Decorative Saturn ring — depth/atmosphere only, no product name text */
export function UniverseSaturnRing({
  planetId,
  active = false,
  reducedMotion = false,
  variant = "orbit",
}: Props) {
  const ringVariant = resolveSaturnRingVariant(planetId);

  if (variant === "band") {
    return (
      <div
        className={`${UNIVERSE_PLANET_SATURN_RING_CLASS} mx-auto mb-2 h-1.5 w-16 rounded-full opacity-70`}
        style={{
          background: `linear-gradient(90deg, transparent, ${ringVariant.accent}88, transparent)`,
        }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={`${UNIVERSE_PLANET_SATURN_SCENE_CLASS} pointer-events-none absolute inset-0 flex items-center justify-center`}
      style={{ zIndex: UNIVERSE_Z_RING, perspective: 520 }}
      aria-hidden
    >
      <div
        className={`universe-saturn-y-rotator universe-saturn-y-rotator-back ${reducedMotion ? "" : "universe-saturn-spin"} ${active ? "universe-saturn-active" : ""}`}
      >
        <div className="universe-saturn-tilt">
          <div
            className={`${UNIVERSE_PLANET_SATURN_RING_CLASS} universe-saturn-band universe-saturn-band-back`}
            style={{
              borderColor: ringVariant.accent,
              boxShadow: `0 0 12px ${ringVariant.accent}44, inset 0 0 8px ${ringVariant.accent}22`,
            }}
          >
            <div className="universe-saturn-band-inner" style={{ borderColor: `${ringVariant.accent}55` }} />
            <SaturnRingDecorations planetId={planetId} accent={ringVariant.accent} reducedMotion={reducedMotion} />
          </div>
        </div>
      </div>
    </div>
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
  const ringVariant = resolveSaturnRingVariant(planetId);

  return (
    <div
      className={`${UNIVERSE_PLANET_SATURN_SCENE_CLASS} pointer-events-none absolute inset-0 flex items-center justify-center`}
      style={{ zIndex: UNIVERSE_Z_RING + 5, perspective: 520 }}
      aria-hidden
    >
      <div
        className={`universe-saturn-y-rotator universe-saturn-y-rotator-front ${reducedMotion ? "" : "universe-saturn-spin"} ${active ? "universe-saturn-active" : ""}`}
      >
        <div className="universe-saturn-tilt">
          <div
            className={`${UNIVERSE_PLANET_SATURN_RING_CLASS} universe-saturn-band universe-saturn-band-front`}
            style={{
              borderColor: ringVariant.accent,
              boxShadow: `0 0 22px ${ringVariant.accent}88, inset 0 0 14px ${ringVariant.accent}55`,
            }}
          >
            <div className="universe-saturn-band-inner" style={{ borderColor: `${ringVariant.accent}99` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
