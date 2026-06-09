"use client";

import { useEffect, useState } from "react";
import {
  UNIVERSE_GLOBE_DEFAULT_ROTATION_DEG,
  UNIVERSE_GLOBE_ROTATION_DURATION_FOCUSED_MS,
  UNIVERSE_GLOBE_ROTATION_DURATION_MS,
  UNIVERSE_GLOBE_ROTATION_DURATION_REDUCED_MS,
} from "@/lib/universe-globe-projection";

export function useUniverseGlobeRotation(
  reducedMotion: boolean,
  focused: boolean
): number {
  const [rotationDeg, setRotationDeg] = useState(UNIVERSE_GLOBE_DEFAULT_ROTATION_DEG);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    let start: number | null = null;
    let raf = 0;
    const durationMs = focused
      ? UNIVERSE_GLOBE_ROTATION_DURATION_FOCUSED_MS
      : UNIVERSE_GLOBE_ROTATION_DURATION_MS;

    const tick = (now: number) => {
      if (start === null) start = now;
      const elapsed = now - start;
      const deg =
        (UNIVERSE_GLOBE_DEFAULT_ROTATION_DEG + (elapsed / durationMs) * 360) % 360;
      setRotationDeg(deg);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, focused]);

  return rotationDeg;
}
