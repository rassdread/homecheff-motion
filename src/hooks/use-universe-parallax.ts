"use client";

import { useEffect, useState } from "react";

export type UniverseParallaxOffset = {
  x: number;
  y: number;
};

export function useUniverseParallax(enabled: boolean): UniverseParallaxOffset {
  const [offset, setOffset] = useState<UniverseParallaxOffset>({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const onMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      setOffset({ x, y });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [enabled]);

  return offset;
}
