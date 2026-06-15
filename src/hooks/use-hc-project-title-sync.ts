"use client";

import { useEffect } from "react";
import {
  HC_PROJECT_TITLE_CHANGED_EVENT,
  type HcProjectTitleChangedDetail,
} from "@/lib/hc-project-title-sync";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export function useHcProjectTitleSync(
  projectId: string | undefined,
  onProjectUpdate: (project: HomeCheffProjectPackage) => void
): void {
  useEffect(() => {
    if (!projectId) {
      return;
    }
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<HcProjectTitleChangedDetail>).detail;
      if (detail?.projectId === projectId && detail.project) {
        onProjectUpdate(detail.project);
      }
    };
    window.addEventListener(HC_PROJECT_TITLE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(HC_PROJECT_TITLE_CHANGED_EVENT, handler);
  }, [onProjectUpdate, projectId]);
}
