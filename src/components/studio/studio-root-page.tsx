"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { EditorStudioEntryBanner } from "@/components/studio/editor-studio-entry-banner";
import { StudioHomeDashboard } from "@/components/studio/studio-home-dashboard";
import { StudioShellHeader } from "@/components/studio/studio-shell-header";
import { StudioWorkspaceShell } from "@/components/studio/studio-workspace-shell";
import { HcProjectWorkspaceControls } from "@/components/projects/hc-project-workspace-controls";
import { HcProjectAutoCreateBridge } from "@/components/projects/hc-project-auto-create-bridge";
import {
  ensureHcProjectOnStudioStart,
  syncHcProjectIdToUrl,
} from "@/lib/hc-project-lifecycle";
import { WorkspaceLoadingSkeleton } from "@/components/ui/motion-studio-primitives";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import { growthSidebarLayoutClasses } from "@/lib/growth-sidebar-layout";
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

  useEffect(() => {
    if (hcProject || hcProjectId) {
      return;
    }
    const { project, created } = ensureHcProjectOnStudioStart({
      ownerId: auth.user?.id,
      syncToServer: Boolean(auth.user),
    });
    setHcProject(project);
    if (created) {
      syncHcProjectIdToUrl(project.id);
    }
  }, [auth.user, hcProject, hcProjectId]);

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
        <HcProjectAutoCreateBridge sourceModule="studio" storyboardId={storyboardId} />
        <HcProjectWorkspaceControls
          project={hcProject}
          onProjectChange={setHcProject}
          sourceModule="studio"
          ownerId={auth.user?.id}
          syncToServer={Boolean(auth.user)}
          closeHref="/studio"
        />
        <StudioWorkspaceShell storyboardId={storyboardId} />
      </>
    );
  }

  return (
    <StudioAuthGate>
      <main className={`flex ${growthSidebarLayoutClasses.pageFloorFlex} ${brand.softGradientBg}`}>
        <HcProjectAutoCreateBridge sourceModule="studio" />
        <StudioShellHeader
          projectTitle={hcProject?.title}
          hcProjectId={hcProject?.id}
        />
        <HcProjectWorkspaceControls
          project={hcProject}
          onProjectChange={setHcProject}
          sourceModule="studio"
          ownerId={auth.user?.id}
          syncToServer={Boolean(auth.user)}
          closeHref="/studio"
        />
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
