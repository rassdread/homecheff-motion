"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioHomeDashboard } from "@/components/studio/studio-home-dashboard";
import { StudioShellHeader } from "@/components/studio/studio-shell-header";
import { StudioWorkspaceShell } from "@/components/studio/studio-workspace-shell";
import { WorkspaceLoadingSkeleton } from "@/components/ui/motion-studio-primitives";
import { brand } from "@/lib/brand";

function StudioRootContent() {
  const searchParams = useSearchParams();
  const storyboardId = searchParams.get("storyboardId")?.trim() ?? "";

  if (storyboardId) {
    return <StudioWorkspaceShell storyboardId={storyboardId} />;
  }

  return (
    <StudioAuthGate>
      <main className={`flex min-h-screen flex-col ${brand.softGradientBg}`}>
        <StudioShellHeader />
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
