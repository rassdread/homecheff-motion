"use client";

import { useEffect, useState } from "react";
import {
  planStudioWorkspaceLayout,
  type StudioWorkspaceLayoutPlan,
} from "@/lib/studio-workspace-posture";

function readPlan(): StudioWorkspaceLayoutPlan {
  if (typeof window === "undefined") {
    return planStudioWorkspaceLayout(1440, 900);
  }
  return planStudioWorkspaceLayout(window.innerWidth, window.innerHeight);
}

/**
 * Live Adaptive Workspace posture for Studio shell chrome.
 * SSR-safe: starts with desktop FULL plan, then syncs on mount/resize.
 */
export function useStudioWorkspaceLayoutPlan(): StudioWorkspaceLayoutPlan {
  const [plan, setPlan] = useState<StudioWorkspaceLayoutPlan>(() =>
    planStudioWorkspaceLayout(1440, 900)
  );

  useEffect(() => {
    const update = () => setPlan(readPlan());
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
