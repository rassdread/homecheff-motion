"use client";

import { UNIVERSE_BRAND } from "@/lib/universe-home-config";

type UniverseGlobeProps = {
  reducedMotion?: boolean;
};

export function UniverseGlobe({ reducedMotion = false }: UniverseGlobeProps) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 148, height: 148 }}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full opacity-60 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${UNIVERSE_BRAND.green}88 0%, ${UNIVERSE_BRAND.blue}44 45%, transparent 70%)`,
          animation: reducedMotion ? undefined : "universe-glow-pulse 6s ease-in-out infinite",
        }}
      />
      <div
        className="relative h-[132px] w-[132px] rounded-full"
        style={{
          perspective: "600px",
          animation: reducedMotion ? undefined : "universe-float 7s ease-in-out infinite",
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            transformStyle: "preserve-3d",
            animation: reducedMotion ? undefined : "universe-globe-spin 48s linear infinite",
            willChange: "transform",
          }}
        >
          <div
            className="absolute inset-0 rounded-full border border-white/20"
            style={{
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 18%, transparent 42%),
                radial-gradient(circle at 68% 72%, ${UNIVERSE_BRAND.green}55 0%, ${UNIVERSE_BRAND.blue}66 38%, #041428 78%)`,
              boxShadow: `inset 0 0 32px rgba(255,255,255,0.12), 0 0 48px ${UNIVERSE_BRAND.blue}44`,
            }}
          />
          <div
            className="absolute inset-[18%] rounded-full border border-white/10 opacity-70"
            style={{
              background: `linear-gradient(135deg, ${UNIVERSE_BRAND.blue}44, ${UNIVERSE_BRAND.green}33)`,
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-[52%] w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: `conic-gradient(from 210deg, ${UNIVERSE_BRAND.green}, ${UNIVERSE_BRAND.blue}, ${UNIVERSE_BRAND.green})`,
              WebkitMaskImage: "radial-gradient(circle, black 58%, transparent 62%)",
              maskImage: "radial-gradient(circle, black 58%, transparent 62%)",
              opacity: 0.85,
            }}
          />
        </div>
      </div>
      {!reducedMotion && (
        <>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="absolute rounded-full border border-white/15"
              style={{
                width: 160 + i * 28,
                height: 160 + i * 28,
                animation: `universe-glow-pulse ${5 + i}s ease-in-out ${i * 0.8}s infinite`,
                opacity: 0.25 - i * 0.06,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
