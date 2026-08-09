"use client";

import { useEffect, useState } from "react";
import {
  resolveStudioDirectorPresentation,
  type StudioDirectorPresentationPlan,
} from "@/lib/studio-director-presentation";

function readPresentation(): StudioDirectorPresentationPlan {
  if (typeof window === "undefined") {
    return resolveStudioDirectorPresentation(1440, 900);
  }
  return resolveStudioDirectorPresentation(window.innerWidth, window.innerHeight);
}

/**
 * Live Creative Director presentation plan (S.6H).
 * SSR-safe: defaults to IMMERSIVE_DESKTOP, then syncs on mount/resize.
 */
export function useStudioDirectorPresentation(): StudioDirectorPresentationPlan {
  const [plan, setPlan] = useState<StudioDirectorPresentationPlan>(() =>
    resolveStudioDirectorPresentation(1440, 900)
  );

  useEffect(() => {
    const update = () => setPlan(readPresentation());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return plan;
}
