"use client";

import { UNIVERSE_BRAND } from "@/lib/universe-home-config";

type UniverseGlobeProps = {
  reducedMotion?: boolean;
  size?: "hero" | "compact";
};

export function UniverseGlobe({ reducedMotion = false, size = "hero" }: UniverseGlobeProps) {
  const dim = size === "hero" ? "min(42vw, 380px)" : "148px";
  const inner = size === "hero" ? "94%" : "132px";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: dim, height: dim }}
      aria-hidden
    >
      {/* Atmospheric glow rings */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `calc(${dim} + ${i * 48}px)`,
            height: `calc(${dim} + ${i * 48}px)`,
            background: `radial-gradient(circle, ${i % 2 === 0 ? UNIVERSE_BRAND.blue : UNIVERSE_BRAND.green}${["55", "44", "33", "22"][i]} 0%, transparent 70%)`,
            animation: reducedMotion ? undefined : `universe-glow-pulse ${5.5 + i}s ease-in-out ${i * 0.6}s infinite`,
            opacity: 0.5 - i * 0.1,
          }}
        />
      ))}

      <div
        className="relative rounded-full"
        style={{
          width: inner,
          height: inner,
          perspective: "900px",
          animation: reducedMotion ? undefined : "universe-float 8s ease-in-out infinite",
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            transformStyle: "preserve-3d",
            animation: reducedMotion ? undefined : "universe-globe-spin 56s linear infinite",
            willChange: "transform",
          }}
        >
          {/* Glass sphere body */}
          <div
            className="absolute inset-0 overflow-hidden rounded-full border border-white/25"
            style={{
              background: `radial-gradient(circle at 28% 22%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.1) 16%, transparent 38%),
                radial-gradient(circle at 72% 78%, ${UNIVERSE_BRAND.green}66 0%, ${UNIVERSE_BRAND.blue}77 42%, #031220 82%)`,
              boxShadow: `inset 0 0 48px rgba(255,255,255,0.15), 0 0 80px ${UNIVERSE_BRAND.blue}55, 0 0 120px ${UNIVERSE_BRAND.green}33`,
            }}
          >
            {/* Rotating continents */}
            <svg
              className="absolute inset-0 h-full w-full opacity-80"
              viewBox="0 0 200 200"
              style={{
                animation: reducedMotion ? undefined : "universe-continent-drift 80s linear infinite",
              }}
            >
              <ellipse cx="70" cy="85" rx="28" ry="18" fill={`${UNIVERSE_BRAND.green}99`} />
              <ellipse cx="130" cy="110" rx="22" ry="14" fill={`${UNIVERSE_BRAND.green}77`} />
              <ellipse cx="95" cy="130" rx="18" ry="10" fill={`${UNIVERSE_BRAND.blue}88`} />
              <path
                d="M45 60 Q60 50 75 58 Q55 70 45 60"
                fill={`${UNIVERSE_BRAND.green}66`}
              />
            </svg>

            {/* Cloud layers */}
            {!reducedMotion &&
              [0, 1].map((i) => (
                <div
                  key={i}
                  className="absolute inset-[12%] rounded-full opacity-40"
                  style={{
                    background: `radial-gradient(ellipse at ${30 + i * 20}% ${40 + i * 10}%, rgba(255,255,255,0.35) 0%, transparent 50%)`,
                    animation: `universe-cloud-drift ${10 + i * 3}s ease-in-out ${i}s infinite`,
                  }}
                />
              ))}
          </div>

          {/* Atmosphere haze */}
          <div
            className="absolute -inset-[6%] rounded-full opacity-50"
            style={{
              background: `radial-gradient(circle, transparent 55%, ${UNIVERSE_BRAND.blue}33 75%, transparent 85%)`,
            }}
          />

          {/* Equator energy band */}
          <div
            className="absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: `conic-gradient(from 200deg, ${UNIVERSE_BRAND.green}, ${UNIVERSE_BRAND.blue}, ${UNIVERSE_BRAND.green})`,
              WebkitMaskImage: "radial-gradient(circle, black 56%, transparent 62%)",
              maskImage: "radial-gradient(circle, black 56%, transparent 62%)",
              opacity: 0.9,
            }}
          />
        </div>
      </div>

      {/* Ecosystem light routes */}
      {!reducedMotion && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 200 200"
          aria-hidden
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = (i * 72 * Math.PI) / 180;
            const x2 = 100 + Math.cos(angle) * 88;
            const y2 = 100 + Math.sin(angle) * 88;
            return (
              <line
                key={i}
                x1="100"
                y1="100"
                x2={x2}
                y2={y2}
                stroke={i % 2 === 0 ? UNIVERSE_BRAND.blue : UNIVERSE_BRAND.green}
                strokeWidth="0.8"
                strokeDasharray="4 8"
                opacity="0.35"
                style={{ animation: `universe-energy-pulse ${3 + i * 0.5}s ease-in-out infinite` }}
              />
            );
          })}
        </svg>
      )}

      {/* Energy pulses */}
      {!reducedMotion &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute rounded-full border border-white/20"
            style={{
              width: `calc(${dim} + ${60 + i * 36}px)`,
              height: `calc(${dim} + ${60 + i * 36}px)`,
              animation: `universe-glow-pulse ${4 + i * 1.2}s ease-in-out ${i * 0.9}s infinite`,
              opacity: 0.2,
            }}
          />
        ))}
    </div>
  );
}
