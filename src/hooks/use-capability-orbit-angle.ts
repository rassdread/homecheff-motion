"use client";

import { useEffect, useState } from "react";
import { UNIVERSE_CAPABILITY_ORBIT_DURATION_S } from "@/lib/universe-planet-ux";

export function useCapabilityOrbitAngle(active: boolean, reducedMotion: boolean): number {
  const [angleDeg, setAngleDeg] = useState(0);

  useEffect(() => {
    if (!active || reducedMotion) {
      return;
    }

    let start: number | null = null;
    let raf = 0;

    const tick = (now: number) => {
      if (start === null) start = now;
      const elapsed = (now - start) / 1000;
      setAngleDeg(((elapsed / UNIVERSE_CAPABILITY_ORBIT_DURATION_S) * 360) % 360);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, reducedMotion]);

  return angleDeg;
}
