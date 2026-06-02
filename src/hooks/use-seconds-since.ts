"use client";

import { useEffect, useState } from "react";
import { useMounted } from "@/hooks/use-mounted";

/** Seconds elapsed since `timestampMs`, ticked every second after mount. */
export function useSecondsSince(timestampMs: number | null): number | null {
  const mounted = useMounted();
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!mounted || timestampMs == null) {
      return;
    }
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - timestampMs) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [mounted, timestampMs]);

  return mounted && timestampMs != null ? seconds : null;
}
