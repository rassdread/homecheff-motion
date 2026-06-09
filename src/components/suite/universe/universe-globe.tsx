"use client";

import { UNIVERSE_BRAND } from "@/lib/universe-home-config";
import { UNIVERSE_GLOBE_SPHERICAL_CLASS } from "@/lib/universe-public-landing";

type UniverseGlobeProps = {
  reducedMotion?: boolean;
  size?: "hero" | "compact";
};

export function UniverseGlobe({ reducedMotion = false, size = "hero" }: UniverseGlobeProps) {
  const dim = size === "hero" ? "min(46vw, 420px)" : "160px";

  return (
    <div
      className={`${UNIVERSE_GLOBE_SPHERICAL_CLASS} relative flex items-center justify-center`}
      style={{ width: dim, height: dim, aspectRatio: "1 / 1" }}
      aria-hidden
    >
      {/* 1. Outer atmosphere glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: "108%",
          height: "108%",
          background: `radial-gradient(circle, ${UNIVERSE_BRAND.blue}55 0%, ${UNIVERSE_BRAND.green}33 42%, transparent 72%)`,
          animation: reducedMotion ? undefined : "universe-glow-pulse 7s ease-in-out infinite",
        }}
      />

      {/* Spherical body container — strict 1:1 circle */}
      <div
        className="relative overflow-hidden rounded-full"
        style={{
          width: "88%",
          height: "88%",
          aspectRatio: "1 / 1",
          animation: reducedMotion ? undefined : "universe-float 8s ease-in-out infinite",
          boxShadow: `0 0 60px ${UNIVERSE_BRAND.blue}66, 0 0 100px ${UNIVERSE_BRAND.green}33`,
        }}
      >
        {/* 2. Ocean base */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, #1a8fc4 0%, ${UNIVERSE_BRAND.blue} 38%, #043a5c 72%, #021828 100%)`,
          }}
        />

        {/* 3. Rotating continent layer */}
        <div
          className="absolute inset-0 overflow-hidden rounded-full"
          style={{
            animation: reducedMotion ? undefined : "universe-continent-drift 90s linear infinite",
          }}
        >
          <svg className="h-full w-full" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
            <circle cx="100" cy="100" r="98" fill={`${UNIVERSE_BRAND.blue}22`} />
            {/* HomeCheff-style land masses — green/teal, not stretched */}
            <path
              d="M55 78 C62 62 78 58 92 66 C98 72 96 82 88 88 C76 94 62 90 55 78 Z"
              fill={`${UNIVERSE_BRAND.green}dd`}
            />
            <path
              d="M108 52 C128 48 142 58 148 72 C152 84 140 92 124 88 C112 82 104 68 108 52 Z"
              fill={`${UNIVERSE_BRAND.green}bb`}
            />
            <path
              d="M118 108 C132 102 148 110 152 124 C154 136 138 142 122 138 C110 132 112 118 118 108 Z"
              fill="#0a8a6fdd"
            />
            <path
              d="M72 118 C84 112 98 118 102 130 C104 140 88 146 76 140 C66 134 64 124 72 118 Z"
              fill={`${UNIVERSE_BRAND.green}99`}
            />
            <ellipse cx="138" cy="148" rx="14" ry="9" fill={`${UNIVERSE_BRAND.green}88`} />
          </svg>
        </div>

        {/* 4. Cloud / haze layer */}
        <div
          className="absolute inset-0 rounded-full opacity-45 mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 40% 35%, rgba(255,255,255,0.35) 0%, transparent 45%),
              radial-gradient(circle at 65% 55%, rgba(255,255,255,0.2) 0%, transparent 40%)`,
            animation: reducedMotion ? undefined : "universe-cloud-drift 14s ease-in-out infinite",
          }}
        />

        {/* 5. Ecosystem route layer */}
        {!reducedMotion && (
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 200">
            {[0, 1, 2, 3, 4].map((i) => {
              const angle = (i * 72 * Math.PI) / 180;
              const x2 = 100 + Math.cos(angle) * 78;
              const y2 = 100 + Math.sin(angle) * 78;
              return (
                <line
                  key={i}
                  x1="100"
                  y1="100"
                  x2={x2}
                  y2={y2}
                  stroke={i % 2 === 0 ? UNIVERSE_BRAND.green : "#ffffff"}
                  strokeWidth="0.6"
                  strokeDasharray="3 6"
                  opacity="0.45"
                  style={{ animation: `universe-energy-pulse ${3.5 + i * 0.4}s ease-in-out infinite` }}
                />
              );
            })}
          </svg>
        )}

        {/* 6. Surface light points */}
        {[
          { x: "38%", y: "42%" },
          { x: "58%", y: "36%" },
          { x: "72%", y: "58%" },
          { x: "48%", y: "68%" },
        ].map((pt, i) => (
          <span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/80"
            style={{
              left: pt.x,
              top: pt.y,
              animation: reducedMotion ? undefined : `universe-glow-pulse ${2 + i * 0.5}s ease-in-out infinite`,
            }}
          />
        ))}

        {/* 7. Glass reflection layer */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 28% 22%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.08) 18%, transparent 42%)`,
          }}
        />

        {/* 8. Shadow terminator edge */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(105deg, transparent 42%, rgba(0,0,0,0.45) 78%, rgba(0,0,0,0.65) 100%)`,
          }}
        />

        {/* Atmosphere rim */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `inset 0 0 20px rgba(255,255,255,0.15), inset 0 -8px 24px rgba(0,0,0,0.25)`,
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        />
      </div>
    </div>
  );
}
