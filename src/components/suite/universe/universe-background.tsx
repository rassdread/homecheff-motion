"use client";

import { useMemo } from "react";
import type { UniverseParallaxOffset } from "@/hooks/use-universe-parallax";
import { UNIVERSE_BRAND } from "@/lib/universe-home-config";

type UniverseBackgroundProps = {
  reducedMotion?: boolean;
  parallax?: UniverseParallaxOffset;
};

type Particle = {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
  layer: "far" | "mid" | "near";
};

export function UniverseBackground({ reducedMotion = false, parallax }: UniverseBackgroundProps) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 52 }, (_, i) => ({
      id: i,
      left: `${4 + ((i * 19) % 92)}%`,
      top: `${3 + ((i * 27) % 94)}%`,
      size: 1 + (i % 4),
      delay: `${(i * 0.31) % 6}s`,
      duration: `${5 + (i % 6) * 1.2}s`,
      layer: i % 3 === 0 ? "far" : i % 3 === 1 ? "mid" : "near",
    }));
  }, []);

  const px = parallax?.x ?? 0;
  const py = parallax?.y ?? 0;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(168deg, ${UNIVERSE_BRAND.deepBlue} 0%, #052038 22%, #073552 48%, #0a4a58 72%, ${UNIVERSE_BRAND.green}18 100%)`,
        }}
      />

      {/* Far nebula layer */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          transform: `translate3d(${px * 4}px, ${py * 3}px, 0)`,
          background: `radial-gradient(ellipse 80% 50% at 30% 25%, ${UNIVERSE_BRAND.blue}44 0%, transparent 55%),
            radial-gradient(ellipse 60% 45% at 75% 70%, ${UNIVERSE_BRAND.green}28 0%, transparent 50%)`,
        }}
      />

      {/* Mid atmosphere */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(${px * 8}px, ${py * 6}px, 0)`,
          background: `radial-gradient(circle at 50% 42%, transparent 0%, ${UNIVERSE_BRAND.deepBlue}99 68%)`,
        }}
      />

      {/* Star + dust particles */}
      {!reducedMotion &&
        particles.map((p) => {
          const mult = p.layer === "far" ? 2 : p.layer === "mid" ? 6 : 12;
          return (
            <span
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                background:
                  p.layer === "near" ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)",
                transform: `translate3d(${px * mult}px, ${py * mult * 0.7}px, 0)`,
                animation: `universe-particle-drift ${p.duration} ease-in-out ${p.delay} infinite`,
                willChange: "transform, opacity",
              }}
            />
          );
        })}

      {/* Foreground light dust */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          transform: `translate3d(${px * 14}px, ${py * 10}px, 0)`,
          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 55%)`,
        }}
      />

      <div
        className="absolute inset-x-0 bottom-0 h-2/5"
        style={{
          background: `linear-gradient(to top, ${UNIVERSE_BRAND.deepBlue}f5, transparent)`,
        }}
      />
    </div>
  );
}
