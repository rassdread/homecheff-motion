"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { EDITOR_MOTION_BOOTSTRAP_STORAGE_KEY } from "@/hooks/use-editor-motion-bootstrap";
import type { EditorMotionBootstrapPayload } from "@/hooks/use-editor-motion-bootstrap";
import { loadHcProjectFromQueryResolved } from "@/lib/homecheff-project-open";
import { rehydrateMotionProjectFromHcProject } from "@/lib/homecheff-project-open";
import { useAuthSession } from "@/hooks/use-auth-session";

function HcMotionBootstrapInner() {
  const searchParams = useSearchParams();
  const auth = useAuthSession();
  const hcProjectId = searchParams.get("hcProject")?.trim() ?? "";

  useEffect(() => {
    if (!hcProjectId || typeof window === "undefined") return;

    let cancelled = false;
    void (async () => {
      const project = await loadHcProjectFromQueryResolved(searchParams, {
        syncFromServer: Boolean(auth.user),
      });
      if (cancelled || !project) return;
      const bootstrap = rehydrateMotionProjectFromHcProject(project);
      if (!bootstrap) return;

      const payload: EditorMotionBootstrapPayload = {
        imageUrl: bootstrap.imageUrl,
        imageUrls: bootstrap.imageUrls,
        label: bootstrap.label,
        sessionId: bootstrap.sessionId,
        source: "editor_session",
        cutoutUrls: [],
        placementUrls: [],
        compositorLayerUrls: [],
      };
      window.sessionStorage.setItem(EDITOR_MOTION_BOOTSTRAP_STORAGE_KEY, JSON.stringify(payload));
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.user, hcProjectId, searchParams]);

  return null;
}

export function HcMotionBootstrapBridge() {
  return <HcMotionBootstrapInner />;
}
