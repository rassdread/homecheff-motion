"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { EditorStudioEntryBanner } from "@/components/studio/editor-studio-entry-banner";
import { StudioHomeDashboard } from "@/components/studio/studio-home-dashboard";
import { StudioShellHeader } from "@/components/studio/studio-shell-header";
import { StudioWorkspaceShell } from "@/components/studio/studio-workspace-shell";
import { WorkspaceLoadingSkeleton } from "@/components/ui/motion-studio-primitives";
import { brand } from "@/lib/brand";

function StudioRootContent() {
  const searchParams = useSearchParams();
  const storyboardId = searchParams.get("storyboardId")?.trim() ?? "";
  const editorSessionId = searchParams.get("editorSession")?.trim() ?? "";

  if (storyboardId) {
    return <StudioWorkspaceShell storyboardId={storyboardId} />;
  }

  return (
    <StudioAuthGate>
      <main className={`flex min-h-screen flex-col ${brand.softGradientBg}`}>
        <StudioShellHeader />
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
