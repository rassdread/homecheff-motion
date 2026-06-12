"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { EditorStudioEntryBanner } from "@/components/studio/editor-studio-entry-banner";
import { StudioHomeDashboard } from "@/components/studio/studio-home-dashboard";
import { StudioShellHeader } from "@/components/studio/studio-shell-header";
import { StudioWorkspaceShell } from "@/components/studio/studio-workspace-shell";
import { HcProjectStateBadge } from "@/components/projects/hc-project-state-badge";
import { WorkspaceLoadingSkeleton } from "@/components/ui/motion-studio-primitives";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import {
  loadHcProjectFromQueryResolved,
  rehydrateStudioProjectFromHcProject,
} from "@/lib/homecheff-project-open";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

function StudioRootContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuthSession();
  const storyboardId = searchParams.get("storyboardId")?.trim() ?? "";
  const editorSessionId = searchParams.get("editorSession")?.trim() ?? "";
  const hcProjectId = searchParams.get("hcProject")?.trim() ?? "";
  const [hcProject, setHcProject] = useState<HomeCheffProjectPackage | null>(() =>
    hcProjectId ? loadHomeCheffProject(hcProjectId) : null
  );
  const [hcRedirecting, setHcRedirecting] = useState(false);

  useEffect(() => {
    if (storyboardId || !hcProjectId) return;
    let cancelled = false;
    void (async () => {
      setHcRedirecting(true);
      const project = await loadHcProjectFromQueryResolved(searchParams, Boolean(auth.user));
      if (cancelled || !project) {
        setHcRedirecting(false);
        return;
      }
      setHcProject(project);
      const hydration = rehydrateStudioProjectFromHcProject(project);
      if (hydration?.redirectPath) {
        router.replace(hydration.redirectPath);
      }
      setHcRedirecting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.user, hcProjectId, router, searchParams, storyboardId]);

  if (hcRedirecting) {
    return (
      <main className="flex-1">
        <WorkspaceLoadingSkeleton />
      </main>
    );
  }

  if (storyboardId) {
    return (
      <>
        {hcProject ?
          <div className="border-b border-sky-100 bg-sky-50/50 px-4 py-2">
            <HcProjectStateBadge project={hcProject} compact />
          </div>
        : null}
        <StudioWorkspaceShell storyboardId={storyboardId} />
      </>
    );
  }

  return (
    <StudioAuthGate>
      <main className={`flex min-h-screen flex-col ${brand.softGradientBg}`}>
        <StudioShellHeader />
        {hcProject ?
          <div className="px-4 pt-2 sm:px-6">
            <HcProjectStateBadge project={hcProject} />
          </div>
        : null}
        {editorSessionId ?
          <div className="px-4 pt-4 sm:px-6">
            <EditorStudioEntryBanner editorSessionId={editorSessionId} />
          </div>
        : null}
        <StudioHomeDashboard embedded />
      </main>
    </StudioAuthGate>
  );
}

export function StudioRootPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1">
          <WorkspaceLoadingSkeleton />
        </main>
      }
    >
      <StudioRootContent />
    </Suspense>
  );
}
