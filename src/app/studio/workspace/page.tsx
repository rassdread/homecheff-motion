"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkspaceLoadingSkeleton } from "@/components/ui/motion-studio-primitives";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";

function WorkspaceRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storyboardId = searchParams.get("storyboardId")?.trim() ?? "";

  useEffect(() => {
    if (storyboardId) {
      router.replace(studioWorkspaceHref(storyboardId));
      return;
    }
    router.replace("/studio");
  }, [router, storyboardId]);

  return (
    <main className="flex-1">
      <WorkspaceLoadingSkeleton />
    </main>
  );
}

export default function StudioWorkspacePage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1">
          <WorkspaceLoadingSkeleton />
        </main>
      }
    >
      <WorkspaceRedirect />
    </Suspense>
  );
}
