"use client";

import { useMemo } from "react";
import { UNIVERSE_BRAND } from "@/lib/universe-home-config";

type UniverseBackgroundProps = {
  reducedMotion?: boolean;
};

type Particle = {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
};

export function UniverseBackground({ reducedMotion = false }: UniverseBackgroundProps) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      left: `${8 + ((i * 17) % 84)}%`,
      top: `${6 + ((i * 23) % 88)}%`,
      size: 1 + (i % 3),
      delay: `${(i * 0.37) % 5}s`,
      duration: `${6 + (i % 5) * 1.4}s`,
    }));
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 120% 80% at 50% 20%, ${UNIVERSE_BRAND.blue}55 0%, transparent 55%),
            radial-gradient(ellipse 90% 70% at 80% 80%, ${UNIVERSE_BRAND.green}33 0%, transparent 50%),
            linear-gradient(165deg, ${UNIVERSE_BRAND.deepBlue} 0%, #062a4a 28%, #0a3d52 58%, ${UNIVERSE_BRAND.green}22 100%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(circle at 50% 45%, transparent 0%, ${UNIVERSE_BRAND.deepBlue}cc 72%)`,
        }}
      />
      {!reducedMotion &&
        particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-white/30"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animation: `universe-particle-drift ${p.duration} ease-in-out ${p.delay} infinite`,
              willChange: "transform, opacity",
            }}
          />
        ))}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background: `linear-gradient(to top, ${UNIVERSE_BRAND.deepBlue}ee, transparent)`,
        }}
      />
    </div>
  );
}
